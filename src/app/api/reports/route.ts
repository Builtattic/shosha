import { anonymousTag } from '@/lib/anonymous';
import { fail, fromZod, ok } from '@/lib/api';
import { adjudicateReport } from '@/lib/gemini';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { assertLimit, getRequestKey, rateLimits } from '@/lib/ratelimit';
import { applyImpact } from '@/lib/scoring';
import { idSchema, reportCreateSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');

  if (accountId) {
    const id = idSchema.safeParse(accountId);
    if (!id.success) return fail('validation_error', 'Invalid account id.', 422);
    const reports = await reportsRepo.listForAccount(id.data, ['approved', 'ai_reviewed'], 50);
    return ok(reports);
  }

  if (!isAdmin(user)) return fail('forbidden', 'The tribunal archive is restricted.', 403);
  const reports = await reportsRepo.listAll(100);
  return ok(reports);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const key = user ? user._id : getRequestKey(request);
  const limiter = user ? rateLimits.reportUser : rateLimits.reportAnon;
  const limit = await assertLimit(limiter, key);
  if (!limit.allowed) return fail('rate_limited', 'The filing desk is cooling down for this account.', 429);

  const json = await request.json().catch(() => null);
  const parsed = reportCreateSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const account = await accountsRepo.findById(parsed.data.accountId);
  if (!account) return fail('not_found', 'No dossier exists for that report.', 404);

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

  const report = await reportsRepo.create({
    accountId: parsed.data.accountId,
    reporterId: user?._id ?? null,
    anonymousTag: user?.username ?? anonymousTag(request),
    type: parsed.data.type,
    description: parsed.data.description,
    feelings: parsed.data.feelings,
    media: parsed.data.media,
    status: verdict.abuseFlags.length > 0 ? 'flagged' : 'ai_reviewed',
    aiVerdict: { ...verdict, analyzedAt: verdict.analyzedAt.toISOString() },
    adminDecision: null
  });

  // Apply provisional AI impact to the dossier immediately so the score reflects the new filing.
  // Admins can later override via /reports/[id]/adjudicate; we apply a fraction here to avoid double-counting.
  if (verdict.valid && verdict.abuseFlags.length === 0 && verdict.proposedImpact !== 0) {
    try {
      const tags = (verdict.categoryTags ?? []).filter((tag: string) =>
        ['authenticity', 'engagement', 'community', 'content', 'impact'].includes(tag)
      );
      const provisionalImpact = Math.sign(verdict.proposedImpact) * Math.min(3, Math.abs(verdict.proposedImpact));
      const next = {
        score: account.score,
        breakdown: { ...account.breakdown },
        scoreHistory: (account.scoreHistory ?? []).map((point) => ({ ...point, t: new Date(point.t) }))
      };
      applyImpact(next, provisionalImpact, 'report', tags);
      await accountsRepo.update(account._id, {
        score: next.score,
        breakdown: next.breakdown,
        scoreHistory: next.scoreHistory.map((point) => ({
          t: point.t.toISOString(),
          s: point.s,
          cause: point.cause
        }))
      });
    } catch (err) {
      console.error('[reports POST] failed to apply provisional impact', err);
    }
  }

  return ok(report, 201);
}
