import { fail, fromZod, ok } from '@/lib/api';
import { applyImpact } from '@/lib/scoring';
import { adjudicateSchema, idSchema } from '@/lib/validators';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { clamp } from '@/lib/utils';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import * as usersRepo from '@/lib/repos/users';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can decide a filing.', 403);
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No filing exists for that id.', 404);
  const json = await request.json().catch(() => null);
  const parsed = adjudicateSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const report = await reportsRepo.findById(id.data);
  if (!report) return fail('not_found', 'No filing exists for that id.', 404);
  const account = await accountsRepo.findById(report.accountId);
  if (!account) return fail('not_found', 'No dossier exists for that filing.', 404);

  const adminDecision = {
    adminId: user!._id,
    verdict: parsed.data.verdict,
    finalImpact: parsed.data.verdict === 'approved' ? parsed.data.finalImpact : 0,
    note: parsed.data.note,
    decidedAt: new Date().toISOString()
  };
  const status = parsed.data.verdict === 'approved' ? 'approved' : 'rejected';

  let updatedAccount = account;
  if (parsed.data.verdict === 'approved') {
    const tags =
      report.aiVerdict?.categoryTags.filter((tag) =>
        ['authenticity', 'engagement', 'community', 'content', 'impact'].includes(tag)
      ) ?? [];
    const next = {
      score: account.score,
      breakdown: { ...account.breakdown },
      scoreHistory: account.scoreHistory.map((point) => ({ ...point, t: new Date(point.t) }))
    };
    applyImpact(next, parsed.data.finalImpact, 'report', tags);
    const persisted = await accountsRepo.update(account._id, {
      score: next.score,
      breakdown: next.breakdown,
      scoreHistory: next.scoreHistory.map((point) => ({
        t: point.t.toISOString(),
        s: point.s,
        cause: point.cause
      }))
    });
    if (persisted) updatedAccount = persisted;
  }

  if (report.reporterId) {
    const delta = parsed.data.verdict === 'approved' ? 2 : -3;
    const reporter = await usersRepo.findById(report.reporterId);
    if (reporter) await usersRepo.setReporterScore(reporter._id, clamp(reporter.reporterScore + delta));
  }

  const persistedReport = await reportsRepo.update(id.data, { adminDecision, status });
  return ok({ report: persistedReport, account: updatedAccount });
}
