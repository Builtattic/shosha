import { ok } from '@/lib/api';
import { getCurrentUser, getCurrentUserReadOnly } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import { getAccountSwipeScore } from '@/lib/repos/swipeRecords';
import * as usersRepo from '@/lib/repos/users';
import { normalizeProfileVisibility } from '@/lib/profilePrivacy';
import { calcCredibility } from '@/lib/credibility';
import { calcProfileCredibility } from '@/lib/scoring';
import { NextRequest, NextResponse } from 'next/server';
import type { AccountRecord } from '@/lib/repos/accounts';
import type { AppUser } from '@/lib/repos/users';

function reputationCredibility(user: AppUser, account: AccountRecord | null): number {
  if (account) {
    return calcProfileCredibility({
      baseCredibility: 80,
      trustBadgeBonus: (account.trustBadge ?? user.trustBadge) ? 20 : 0,
      opposedPosts: account.opposedPosts ?? 0,
      disputeLosses: account.disputesLost ?? 0,
      aiFlaggedPosts: account.aiFlaggedPosts ?? 0,
    }).updatedCredibility;
  }
  return calcProfileCredibility({
    baseCredibility: 80,
    trustBadgeBonus: user.trustBadge ? 20 : 0,
    opposedPosts: 0,
    disputeLosses: 0,
    aiFlaggedPosts: 0,
  }).updatedCredibility;
}

export async function GET() {
  try {
    const user = await getCurrentUserReadOnly();
    if (!user) {
      return ok({
        user: null,
        claimedAccounts: [],
        recentEvents: [],
        swipeAggregate: { score: 0, aligns: 0, opposes: 0 },
      });
    }

    const [claimedAccountsRaw, myReports] = await Promise.all([
      Promise.all((user.claimedAccounts ?? []).slice(0, 10).map((id) => accountsRepo.findById(id))).catch(() => []),
      reportsRepo.listByReporter(user._id, 50).catch(() => [])
    ]);
    const claimedAccounts = claimedAccountsRaw.filter(Boolean);
    const liveScoreAccount =
      claimedAccounts.find((account) => account!.platform === 'website' && account!.claimedBy === user._id) ??
      claimedAccounts.find((account) => account!.claimedBy === user._id) ??
      claimedAccounts[0] ??
      null;
    // Personal reputation (reports, swipe milestones) lives on the user record.
    // Dossier score is exposed separately — do not overwrite user.score with account.score.
    const dossierScore =
      liveScoreAccount != null
        ? typeof liveScoreAccount.displayScore === 'number'
          ? liveScoreAccount.displayScore
          : typeof liveScoreAccount.score === 'number'
            ? liveScoreAccount.score
            : null
        : null;

    const profileCredibility = reputationCredibility(user, liveScoreAccount);

    const swipeAggregate = liveScoreAccount
      ? await getAccountSwipeScore(liveScoreAccount._id).catch(() => ({
          score: 0,
          aligns: 0,
          opposes: 0,
        }))
      : { score: 0, aligns: 0, opposes: 0 };

    // Map reports into the shape the profile UI expects.
    // Anonymous reports are excluded from the public-facing Recent Posts feed.
    const recentEvents = myReports
      .filter((report) => report.publicAnonymous !== true)
      .map((report) => ({
        _id: report._id,
        id: report._id,
        eventType: report.type,
        type: report.type,
        category: report.category ?? null,
        deed: report.deed ?? null,
        cause: (report as { cause?: string | null }).cause ?? null,
        description: report.description,
        subjectId: report.accountId,
        reportId: report._id,
        timestamp: report.createdAt ?? new Date().toISOString(),
        status: report.status,
        aiVerdict: report.aiVerdict,
        adminDecision: report.adminDecision,
        impact: typeof report.reportScore === 'number' ? report.reportScore : undefined,
        media: report.media ?? null,
      }));

    return ok({
      user: { ...user, profileCredibility },
      dossierScore,
      claimedAccounts,
      recentEvents,
      swipeAggregate,
    });
  } catch (err) {
    console.error('[GET /api/me]', err);
    return ok({
      user: null,
      claimedAccounts: [],
      recentEvents: [],
      swipeAggregate: { score: 0, aligns: 0, opposes: 0 },
    });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Only allow safe profile fields to be updated
    const allowed = [
      'name', 'phone', 'dob', 'city', 'country', 'username',
      'occupationRole', 'networkSize', 'education', 'specializedField',
      'managesMoneyPeopleSystem', 'physicalIntellectualLimitations',
      'igUrl', 'tiktokUrl', 'xUrl', 'linkedinUrl', 'redditUrl',
      'ytUrl', 'fbUrl', 'snapchatUrl', 'onboardingComplete',
      'headline', 'bio', 'category', 'primaryFocus', 'profileVisibility',
      'massiveAction', 'peopleMultiplier', 'reachMultiplier', 'impactMultiplier', 'credibilityMultiplier',
      'momentumMultiplier', 'innovationMultiplier', 'communityMultiplier', 'resourceMultiplier', 'legacyMultiplier',
      'websiteUrl', 'photoUrl', 'profileFieldVisibility', 'quote'
    ] as const;

    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) patch[key] = body[key];
    }
    if ('profileFieldVisibility' in body) {
      patch.profileFieldVisibility = normalizeProfileVisibility(body.profileFieldVisibility);
    }
    if (typeof patch.websiteUrl === 'string') {
      const websiteUrl = patch.websiteUrl.trim();
      patch.websiteUrl = websiteUrl && !/^https?:\/\//i.test(websiteUrl)
        ? `https://${websiteUrl}`
        : websiteUrl;
    }

    if (patch.onboardingComplete === true) {
      const completedProfile = { ...user, ...patch };
      const requiredFields = [
        ['name', 'name'],
        ['username', 'username'],
        ['dob', 'date of birth'],
        ['phone', 'phone number'],
        ['city', 'city'],
        ['country', 'country'],
        ['occupationRole', 'role'],
        ['networkSize', 'network size'],
        ['education', 'education level'],
        ['specializedField', 'specialization level'],
        ['managesMoneyPeopleSystem', 'management level'],
        ['physicalIntellectualLimitations', 'limitations answer']
      ] as const;
      const missing = requiredFields.find(([key]) => !String(completedProfile[key] ?? '').trim());
      if (missing) {
        return NextResponse.json({ error: `Please enter your ${missing[1]}.` }, { status: 400 });
      }
    }

    // Recompute credibility from the merged profile state. trustBadge can only
    // be granted via the /api/me/upgrade endpoint, never directly through PATCH.
    const merged = { ...user, ...patch } as Record<string, unknown>;
    const cred = calcCredibility({
      name: merged.name as string | undefined,
      username: merged.username as string | undefined,
      phone: merged.phone as string | undefined,
      dob: merged.dob as string | undefined,
      city: merged.city as string | undefined,
      country: merged.country as string | undefined,
      occupationRole: merged.occupationRole as string | undefined,
      networkSize: merged.networkSize as string | undefined,
      education: merged.education as string | undefined,
      specializedField: merged.specializedField as string | undefined,
      managesMoneyPeopleSystem: merged.managesMoneyPeopleSystem as string | undefined,
      physicalIntellectualLimitations: merged.physicalIntellectualLimitations as string | undefined,
      igUrl: merged.igUrl as string | undefined,
      tiktokUrl: merged.tiktokUrl as string | undefined,
      xUrl: merged.xUrl as string | undefined,
      linkedinUrl: merged.linkedinUrl as string | undefined,
      redditUrl: merged.redditUrl as string | undefined,
      ytUrl: merged.ytUrl as string | undefined,
      fbUrl: merged.fbUrl as string | undefined,
      snapchatUrl: merged.snapchatUrl as string | undefined,
      photoUrl: merged.photoUrl as string | undefined,
      bio: merged.bio as string | undefined,
      quote: merged.quote as string | undefined,
      trustBadge: Boolean(merged.trustBadge),
    });
    patch.credibility = cred.total;

    const updated = await usersRepo.update(user._id, patch);
    return ok({ user: updated });
  } catch (err) {
    console.error('[PATCH /api/me]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
