import { ok } from '@/lib/api';
import { getCurrentUser, getCurrentUserReadOnly } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import * as usersRepo from '@/lib/repos/users';
import { normalizeProfileVisibility } from '@/lib/profilePrivacy';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const user = await getCurrentUserReadOnly();
    if (!user) return ok({ user: null, claimedAccounts: [], recentEvents: [] });

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
    const liveUser = liveScoreAccount && typeof liveScoreAccount.score === 'number'
      ? {
          ...user,
          score: liveScoreAccount.score,
          scoreHistory: Array.isArray(liveScoreAccount.scoreHistory) ? liveScoreAccount.scoreHistory : user.scoreHistory,
        }
      : user;

    // Map reports into the shape the profile UI expects (eventType, description, timestamp, status).
    const recentEvents = myReports.map((report) => ({
      _id: report._id,
      eventType: report.type,
      description: report.description,
      subjectId: report.accountId,
      reportId: report._id,
      timestamp: report.createdAt ?? new Date().toISOString(),
      status: report.status,
      aiVerdict: report.aiVerdict,
      adminDecision: report.adminDecision
    }));

    return ok({
      user: liveUser,
      claimedAccounts,
      recentEvents
    });
  } catch (err) {
    console.error('[GET /api/me]', err);
    return ok({ user: null, claimedAccounts: [], recentEvents: [] });
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
      'websiteUrl', 'photoUrl', 'profileFieldVisibility'
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

    const updated = await usersRepo.update(user._id, patch);
    return ok({ user: updated });
  } catch (err) {
    console.error('[PATCH /api/me]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
