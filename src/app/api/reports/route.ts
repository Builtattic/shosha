import { anonymousTag } from '@/lib/anonymous';
import { fail, fromZod, ok } from '@/lib/api';
import { adjudicateReport } from '@/lib/gemini';
import { requireUser, getCurrentUserReadOnly, isAdmin, isEmailVerified } from '@/lib/auth';
import { assertLimit, rateLimits } from '@/lib/ratelimit';
import { idSchema, reportCreateSchema } from '@/lib/validators';
import {
  WORKBOOK_FORMULA_VERSION,
  calcMultiplierQuotient,
  calcDelta,
  credibilityWeight,
  profileMultipliersFromWorkbookProfile,
  resolveSheetBaseImpact,
} from '@/lib/scoring';
import { redactPublicReporter } from '@/lib/reportPrivacy';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import * as reportMetadataRepo from '@/lib/repos/reportMetadata';
import * as siteSettingsRepo from '@/lib/repos/siteSettings';

export const maxDuration = 60;

export async function GET(request: Request) {
  const user = await getCurrentUserReadOnly();
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');

  if (accountId) {
    const id = idSchema.safeParse(accountId);
    if (!id.success) return fail('validation_error', 'Invalid account id.', 422);
    const reports = await reportsRepo.listForAccount(id.data, ['approved', 'ai_reviewed'], 50);
    return ok(reports.map(redactPublicReporter));
  }

  if (!isAdmin(user)) return fail('forbidden', 'The tribunal archive is restricted.', 403);
  const reports = await reportsRepo.listAll(100);
  return ok(reports);
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    // Email-verification gate: users with an email must verify before filing.
    // Phone-OTP users (no email) pass through.
    if (!isEmailVerified(user)) {
      return fail(
        'email_unverified',
        'Verify your email before filing a report. Open the verification email we sent at signup.',
        403
      );
    }
    const key = user._id;
    const limiter = rateLimits.reportUser;
    const limit = await assertLimit(limiter, key);
    if (!limit.allowed) return fail('rate_limited', 'The filing desk is cooling down for this account.', 429);

    const geminiLimit = await assertLimit(rateLimits.adjudicate, `adjudicate:${user._id}`);
    if (!geminiLimit.allowed) {
      return fail(
        'rate_limited',
        'Report analysis limit reached. Try again in an hour.',
        429
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = reportCreateSchema.safeParse(json);
    if (!parsed.success) return fromZod(parsed.error);

    const account = await accountsRepo.findById(parsed.data.accountId);
    if (!account) return fail('not_found', 'No dossier exists for that report.', 404);
    const scoringRow = resolveSheetBaseImpact(parsed.data.deed, parsed.data.type);
    if (
      scoringRow.deed !== parsed.data.deed ||
      scoringRow.category !== parsed.data.category ||
      scoringRow.baseScore !== parsed.data.baseScore
    ) {
      return fail('validation_error', 'The selected deed and base score do not match the workbook scoring index.', 422);
    }

    const settings = await siteSettingsRepo.get();
    const actorHash = user._id;
    const cooldownMs = settings.reportCooldownHours * 60 * 60 * 1000;
    const recentActorReports = await reportsRepo.listRecentForActorOnAccount(account._id, actorHash, cooldownMs);
    const repeated = recentActorReports.some((item) => item.deed === scoringRow.deed);
    if (repeated) {
      return fail('cooldown_active', 'A similar filing from this account is cooling down for this profile.', 429);
    }

    const multipliers = profileMultipliersFromWorkbookProfile(account, {
      repetitionPattern: Number(parsed.data.repetitionPattern),
      intent: Number(parsed.data.intent),
      circumstances: Number(parsed.data.circumstances),
    });
    const multiplierQuotient = calcMultiplierQuotient(multipliers);
    const reportScore = calcDelta(scoringRow.baseScore, multipliers);
    const weight = credibilityWeight(user.reporterScore, 80);
    const publicAnonymous = parsed.data.publicAnonymous ?? false;

    const verdict = await adjudicateReport({
      description: parsed.data.description,
      feelings: parsed.data.feelings,
      type: parsed.data.type,
      accountDisplayName: account.displayName,
      platform: account.platform,
      mediaDescription:
        parsed.data.media.type === 'image'
          ? 'An image proof was uploaded and is attached for direct analysis.'
          : 'A video proof was uploaded but cannot be analyzed inline.',
      mediaUrl: parsed.data.media.url,
      mediaType: parsed.data.media.type
    });

    if (verdict.usedHeuristic) {
      return fail(
        'internal_error',
        'Report analysis is temporarily unavailable. Please try again shortly.',
        503
      );
    }

    const report = await reportsRepo.create({
      accountId: parsed.data.accountId,
      reportNo: await reportsRepo.nextReportNo(),
      reporterId: user._id,
      anonymousTag: publicAnonymous ? anonymousTag(request) : user.username,
      hashedUserId: actorHash,
      publicAnonymous,
      type: parsed.data.type,
      category: scoringRow.category,
      deed: scoringRow.deed,
      baseScore: scoringRow.baseScore,
      reportScore,
      credibilityWeight: weight,
      description: parsed.data.description,
      feelings: parsed.data.feelings,
      media: parsed.data.media,
      repetitionPattern: parsed.data.repetitionPattern,
      intent: parsed.data.intent,
      circumstances: parsed.data.circumstances,
      location: parsed.data.location,
      tags: parsed.data.tags ?? [],
      isIRL: parsed.data.isIRL,
      evidenceSourceUrl: parsed.data.evidenceSourceUrl || undefined,
      links: parsed.data.links ?? [],
      contentSafety: {
        ...verdict.contentSafety,
        checkedAt: verdict.analyzedAt.toISOString(),
      },
      aiUndertaking: true,
      disputeStatus: 'none',
      status: verdict.abuseFlags.length > 0 ? 'flagged' : 'ai_reviewed',
      aiVerdict: { ...verdict, analyzedAt: verdict.analyzedAt.toISOString() },
      adminDecision: null
    });

    await reportMetadataRepo.upsert(report._id, {
      reportId: report._id,
      profileId: account._id,
      multipliers,
      multiplierQuotient,
      formulaVersion: WORKBOOK_FORMULA_VERSION,
      sourceFields: {
        category: scoringRow.category,
        deed: scoringRow.deed,
        baseScore: scoringRow.baseScore,
        reportNo: report.reportNo,
      },
    });

    return ok(report, 201);
  } catch (error) {
    console.error('[POST /api/reports]', error);
    return fail(
      'submission_failed',
      error instanceof Error ? error.message : 'Submission failed. Please try again.',
      500
    );
  }
}
