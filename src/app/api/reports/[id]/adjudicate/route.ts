import { fail, fromZod, ok } from '@/lib/api';
import {
  DEFAULT_MULTIPLIERS,
  applySheetScore,
  calcDelta,
  calcWorkbookScoreFromEntries,
  calcMultiplierQuotient,
  profileMultipliersFromWorkbookProfile,
  resolveSheetBaseImpactFromAdminImpact,
  resolveSheetBaseImpact,
  WORKBOOK_FORMULA_VERSION,
  type EventMultipliers,
} from '@/lib/scoring';
import { adjudicateSchema, idSchema } from '@/lib/validators';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { clamp } from '@/lib/utils';
import * as accountsRepo from '@/lib/repos/accounts';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as eventsRepo from '@/lib/repos/events';
import * as ledgerEntriesRepo from '@/lib/repos/ledgerEntries';
import * as reportMetadataRepo from '@/lib/repos/reportMetadata';
import * as reportsRepo from '@/lib/repos/reports';
import * as usersRepo from '@/lib/repos/users';
import * as notificationsRepo from '@/lib/repos/notifications';
import * as siteSettingsRepo from '@/lib/repos/siteSettings';

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
    category: parsed.data.category ?? report.category,
    deed: parsed.data.deed ?? report.deed,
    baseScore: parsed.data.baseScore ?? report.baseScore,
    repetitionPattern: parsed.data.repetitionPattern ?? report.repetitionPattern,
    intent: parsed.data.intent ?? report.intent,
    circumstances: parsed.data.circumstances ?? report.circumstances,
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
    (adminDecision.baseScore ?? 0) !== 0 &&
    report.adminDecision?.verdict !== 'approved';

  if (shouldApplySheetScore) {
    const existingLedger = await ledgerEntriesRepo.findByReportId(report._id);
    const scoringRow = adminDecision.deed
      ? resolveSheetBaseImpact(adminDecision.deed, report.type)
      : resolveSheetBaseImpactFromAdminImpact(parsed.data.finalImpact, report.type);
    if (
      adminDecision.deed &&
      (scoringRow.deed !== adminDecision.deed ||
        scoringRow.category !== adminDecision.category ||
        scoringRow.baseScore !== adminDecision.baseScore)
    ) {
      return fail('validation_error', 'The selected deed and base score do not match the workbook scoring index.', 422);
    }
    const multipliers: EventMultipliers = profileMultipliersFromWorkbookProfile(account, {
      repetitionPattern: Number(adminDecision.repetitionPattern ?? report.repetitionPattern ?? 1),
      intent: Number(adminDecision.intent ?? report.intent ?? 1),
      circumstances: Number(adminDecision.circumstances ?? report.circumstances ?? 1),
    }) ?? DEFAULT_MULTIPLIERS;
    const multiplierQuotient = calcMultiplierQuotient(multipliers);
    const settings = await siteSettingsRepo.get();
    const rawDelta = calcDelta(scoringRow.baseScore, multipliers);
    const existingProfileLedger = await ledgerEntriesRepo.listForProfile(account._id);
    const dayStart = Date.now() - 24 * 60 * 60 * 1000;
    const dailyDelta = existingProfileLedger
      .filter((entry) => new Date(entry.timestamp).getTime() >= dayStart)
      .reduce((sum, entry) => sum + entry.delta, 0);
    const singleCappedDelta = Math.max(-settings.singleReportDeltaCap, Math.min(settings.singleReportDeltaCap, rawDelta));
    const remainingPositive = Math.max(0, settings.dailyProfileDeltaCap - Math.max(0, dailyDelta));
    const remainingNegative = Math.max(0, settings.dailyProfileDeltaCap - Math.max(0, -dailyDelta));
    const delta = singleCappedDelta >= 0
      ? Math.min(singleCappedDelta, remainingPositive)
      : Math.max(singleCappedDelta, -remainingNegative);
    const scoreBefore = account.score ?? 1000;
    const { score: scoreAfter, decay } = applySheetScore(scoreBefore, delta);
    const ledgerEntryId = existingLedger?._id ?? `report_${report._id}`;

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
      formulaVersion: WORKBOOK_FORMULA_VERSION,
      proofLinks: report.media?.url ? [report.media.url] : [],
      location: 'Global',
      timestamp: adminDecision.decidedAt,
      status: 'approved',
      aiVerdict: report.aiVerdict ? { valid: report.aiVerdict.valid, reasoning: report.aiVerdict.reasoning } : null,
      adminDecision: { verdict: 'approved', note: parsed.data.note, decidedAt: adminDecision.decidedAt },
      stats: { aligns: 0, opposes: 0, comments: 0, shares: 0 },
    });
    eventId = event._id;

    const ledgerEntry = await ledgerEntriesRepo.createWithId(ledgerEntryId, {
      profileId: account._id,
      reportId: report._id,
      baseScore: scoringRow.baseScore,
      multipliers,
      multiplierQuotient,
      delta,
      timestamp: adminDecision.decidedAt,
      formulaVersion: WORKBOOK_FORMULA_VERSION,
      capped: delta !== rawDelta,
    });

    await reportMetadataRepo.upsert(report._id, {
      reportId: report._id,
      profileId: account._id,
      multipliers,
      multiplierQuotient,
      formulaVersion: WORKBOOK_FORMULA_VERSION,
      adminOverrides: {
        reputation: multipliers.reputation,
        intent: multipliers.intent,
        circumstances: multipliers.circumstances,
      },
      sourceFields: {
        category: scoringRow.category,
        deed: scoringRow.deed,
        baseScore: scoringRow.baseScore,
        ledgerEntryId: ledgerEntry._id,
      },
    });

    const ledgerEntries = await ledgerEntriesRepo.listForProfile(account._id);
    const tracker = calcWorkbookScoreFromEntries(ledgerEntries);
    const globalScore = ledgerEntries.reduce((sum, entry) => sum + entry.delta, 0);
    const persisted = await accountsRepo.update(account._id, {
      score: tracker.finalScore,
      displayScore: tracker.finalScore,
      globalScore,
      windowScores: tracker,
      scoreHistory: [
        ...(account.scoreHistory ?? []),
        {
          t: adminDecision.decidedAt,
          s: tracker.finalScore,
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

  const persistedReport = await reportsRepo.update(id.data, {
    adminDecision,
    status,
    eventId,
    ledgerEntryId: shouldApplySheetScore ? `report_${report._id}` : report.ledgerEntryId,
    category: adminDecision.category,
    deed: adminDecision.deed,
    baseScore: adminDecision.baseScore,
    repetitionPattern: adminDecision.repetitionPattern,
    intent: adminDecision.intent,
    circumstances: adminDecision.circumstances,
    reportScore: adminDecision.baseScore ? calcDelta(adminDecision.baseScore, profileMultipliersFromWorkbookProfile(account, {
      repetitionPattern: Number(adminDecision.repetitionPattern ?? 1),
      intent: Number(adminDecision.intent ?? 1),
      circumstances: Number(adminDecision.circumstances ?? 1),
    })) : undefined,
  });
  await adminActionsRepo.create({ actor: user!, action: 'report.adjudicate', entityType: 'report', entityId: id.data, before: { report, account }, after: { report: persistedReport, account: updatedAccount } });

  // Notify the reporter of the verdict (skip anonymous filings).
  if (report.reporterId) {
    const approved = parsed.data.verdict === 'approved';
    const subjectName = updatedAccount.displayName || updatedAccount.username || 'an account';
    await notificationsRepo.create({
      userId: report.reporterId,
      kind: approved ? 'report_approved' : 'report_rejected',
      title: approved ? 'Filing approved' : 'Filing rejected',
      body: approved
        ? `Your ${report.type} filing on ${subjectName} was approved (impact ${adminDecision.finalImpact >= 0 ? '+' : ''}${adminDecision.finalImpact}). Reporter score ${approved ? '+2' : '-3'}.`
        : `Your ${report.type} filing on ${subjectName} was rejected. Reporter score -3.`,
      link: `/account/${updatedAccount._id}`,
      meta: { reportId: id.data, accountId: updatedAccount._id, finalImpact: adminDecision.finalImpact }
    });
  }

  return ok({ report: persistedReport, account: updatedAccount });
}
