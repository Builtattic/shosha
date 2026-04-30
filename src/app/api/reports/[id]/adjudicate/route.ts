import { fail, fromZod, ok } from '@/lib/api';
import {
  DEFAULT_MULTIPLIERS,
  applySheetScore,
  calcDelta,
  calcMultiplierQuotient,
  profileMultipliersFromUser,
  resolveSheetBaseImpactFromAdminImpact,
} from '@/lib/scoring';
import { adjudicateSchema, idSchema } from '@/lib/validators';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { clamp } from '@/lib/utils';
import * as accountsRepo from '@/lib/repos/accounts';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as eventsRepo from '@/lib/repos/events';
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
  let eventId = report.eventId;

  if (report.reporterId) {
    const delta = parsed.data.verdict === 'approved' ? 2 : -3;
    const reporter = await usersRepo.findById(report.reporterId);
    if (reporter) await usersRepo.setReporterScore(reporter._id, clamp(reporter.reporterScore + delta));
  }

  const shouldApplySheetScore =
    parsed.data.verdict === 'approved' &&
    parsed.data.finalImpact !== 0 &&
    report.adminDecision?.verdict !== 'approved';

  if (shouldApplySheetScore) {
    const claimant = account.claimedBy ? await usersRepo.findById(account.claimedBy) : null;
    const multipliers = claimant?.onboardingComplete
      ? profileMultipliersFromUser(claimant)
      : DEFAULT_MULTIPLIERS;
    const scoringRow = resolveSheetBaseImpactFromAdminImpact(parsed.data.finalImpact, report.type);
    const multiplierQuotient = calcMultiplierQuotient(multipliers);
    const delta = calcDelta(scoringRow.baseScore, multipliers);
    const scoreBefore = account.score ?? 1000;
    const { score: scoreAfter, decay } = applySheetScore(scoreBefore, delta);

    const event = await eventsRepo.create({
      subjectId: account._id,
      reporterId: report.reporterId,
      anonymousTag: report.anonymousTag,
      eventType: report.type,
      description: report.description,
      baseImpactKey: scoringRow.deed,
      baseImpact: scoringRow.baseScore,
      multipliers,
      multiplierQuotient,
      delta,
      scoreBefore,
      scoreAfter,
      decay,
      category: scoringRow.category,
      deed: scoringRow.deed,
      formulaVersion: 'sheet-v1',
      proofLinks: report.media?.url ? [report.media.url] : [],
      location: 'Global',
      timestamp: adminDecision.decidedAt,
      status: 'approved',
      aiVerdict: report.aiVerdict ? { valid: report.aiVerdict.valid, reasoning: report.aiVerdict.reasoning } : null,
      adminDecision: { verdict: 'approved', note: parsed.data.note, decidedAt: adminDecision.decidedAt },
      stats: { aligns: 0, opposes: 0, comments: 0, shares: 0 },
    });
    eventId = event._id;

    const persisted = await accountsRepo.update(account._id, {
      score: scoreAfter,
      scoreHistory: [
        ...(account.scoreHistory ?? []),
        {
          t: adminDecision.decidedAt,
          s: scoreAfter,
          cause: 'report',
          delta,
          baseScore: scoringRow.baseScore,
          profileId: account._id,
          eventId: event._id,
          multiplierQuotient,
          decay,
          category: scoringRow.category,
          deed: scoringRow.deed,
          multipliers,
        },
      ],
    });
    if (persisted) {
      updatedAccount = persisted;
    }
  }

  const persistedReport = await reportsRepo.update(id.data, { adminDecision, status, eventId });
  await adminActionsRepo.create({ actor: user!, action: 'report.adjudicate', entityType: 'report', entityId: id.data, before: { report, account }, after: { report: persistedReport, account: updatedAccount } });
  return ok({ report: persistedReport, account: updatedAccount });
}
