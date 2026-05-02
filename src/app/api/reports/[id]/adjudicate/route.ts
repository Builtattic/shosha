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
  try {
    const user = await getCurrentUser();
    if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can decide a filing.', 403);
    const id = idSchema.safeParse(params.id);
    if (!id.success) return fail('not_found', 'No filing exists for that id.', 404);
    const json = await request.json().catch(() => null);
    if (!json) return fail('bad_request', 'Invalid JSON payload.', 400);
    const parsed = adjudicateSchema.safeParse(json);
    if (!parsed.success) return fromZod(parsed.error);

    const report = await reportsRepo.findById(id.data);
    if (!report) return fail('not_found', 'No filing exists for that id.', 404);
    const account = await accountsRepo.findById(report.accountId);
    if (!account) return fail('not_found', 'No dossier exists for that filing.', 404);

    const wasApproved = report.status === 'approved';
    const isApproved = parsed.data.verdict === 'approved';
    const wasRejected = report.status === 'rejected';
    const isRejected = parsed.data.verdict === 'rejected';

    const adminDecision = {
      adminId: user!._id,
      verdict: parsed.data.verdict,
      finalImpact: isApproved ? parsed.data.finalImpact : 0,
      note: parsed.data.note,
      category: parsed.data.category ?? report.category,
      deed: parsed.data.deed ?? report.deed,
      baseScore: parsed.data.baseScore ?? report.baseScore,
      repetitionPattern: parsed.data.repetitionPattern ?? report.repetitionPattern,
      intent: parsed.data.intent ?? report.intent,
      circumstances: parsed.data.circumstances ?? report.circumstances,
      decidedAt: new Date().toISOString()
    };

    const status = isApproved ? 'approved' : 'rejected';

    // Ledger and Event Lifecycle
    if (isApproved) {
      const scoringRow = adminDecision.deed
        ? resolveSheetBaseImpact(adminDecision.deed, report.type)
        : resolveSheetBaseImpactFromAdminImpact(parsed.data.finalImpact, report.type);

      const multipliers: EventMultipliers = profileMultipliersFromWorkbookProfile(account, {
        repetitionPattern: Number(adminDecision.repetitionPattern ?? 1),
        intent: Number(adminDecision.intent ?? 1),
        circumstances: Number(adminDecision.circumstances ?? 1),
      }) ?? DEFAULT_MULTIPLIERS;

      const multiplierQuotient = calcMultiplierQuotient(multipliers);
      const rawDelta = calcDelta(scoringRow.baseScore, multipliers);
      const settings = await siteSettingsRepo.get();
      const singleCappedDelta = Math.max(-settings.singleReportDeltaCap, Math.min(settings.singleReportDeltaCap, rawDelta));
      
      // Create/Update Ledger
      const ledgerEntryId = report.ledgerEntryId || `report_${report._id}`;
      await ledgerEntriesRepo.createWithId(ledgerEntryId, {
        profileId: account._id,
        reportId: report._id,
        baseScore: scoringRow.baseScore,
        multipliers,
        multiplierQuotient,
        delta: singleCappedDelta,
        timestamp: adminDecision.decidedAt,
        formulaVersion: WORKBOOK_FORMULA_VERSION,
        capped: singleCappedDelta !== rawDelta,
        category: scoringRow.category,
        deed: scoringRow.deed,
      });

      // Create/Update Event
      if (report.eventId) {
        await eventsRepo.update(report.eventId, {
          description: report.description,
          baseImpactKey: scoringRow.deed,
          baseImpact: scoringRow.baseScore,
          multipliers,
          multiplierQuotient,
          delta: singleCappedDelta,
          category: scoringRow.category,
          deed: scoringRow.deed,
          timestamp: adminDecision.decidedAt,
          status: 'approved',
          adminDecision: { verdict: 'approved', note: parsed.data.note, decidedAt: adminDecision.decidedAt },
        });
      } else {
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
          delta: singleCappedDelta,
          category: scoringRow.category,
          deed: scoringRow.deed,
          formulaVersion: WORKBOOK_FORMULA_VERSION,
          proofLinks: report.media?.url ? [report.media.url] : [],
          location: report.location || 'Global',
          timestamp: adminDecision.decidedAt,
          status: 'approved',
          aiVerdict: report.aiVerdict ? { valid: report.aiVerdict.valid, reasoning: report.aiVerdict.reasoning } : null,
          adminDecision: { verdict: 'approved', note: parsed.data.note, decidedAt: adminDecision.decidedAt },
          stats: { aligns: 0, opposes: 0, comments: 0, shares: 0 },
        });
        report.eventId = event._id;
      }
      report.ledgerEntryId = ledgerEntryId;
      adminDecision.finalImpact = singleCappedDelta;
    } else if (isRejected && wasApproved) {
      // Reverse Approved -> Rejected
      if (report.ledgerEntryId) await ledgerEntriesRepo.remove(report.ledgerEntryId);
      if (report.eventId) await eventsRepo.deleteById(report.eventId);
    }

    // Rebuild Account Score (Always rebuild if it was or is approved to ensure consistency)
    let updatedAccount = account;
    if (isApproved || wasApproved) {
      const entries = await ledgerEntriesRepo.listForProfile(account._id);
      const scoreHistory: accountsRepo.ScoreHistoryPoint[] = entries.map(e => ({
        t: e.timestamp,
        s: 0, // rebuilt
        cause: 'report',
        delta: e.delta,
        baseScore: e.baseScore,
        profileId: e.profileId,
        multiplierQuotient: e.multiplierQuotient,
        multipliers: e.multipliers,
        category: e.category,
        deed: e.deed
      }));
      const rebuilt = await accountsRepo.rebuildLedger(account._id, scoreHistory);
      if (rebuilt) updatedAccount = rebuilt;
    }

    // Update Report
    const persistedReport = await reportsRepo.update(id.data, {
      adminDecision,
      status,
      eventId: isApproved ? report.eventId : undefined,
      ledgerEntryId: isApproved ? report.ledgerEntryId : undefined,
      category: adminDecision.category,
      deed: adminDecision.deed,
      baseScore: adminDecision.baseScore,
      repetitionPattern: adminDecision.repetitionPattern,
      intent: adminDecision.intent,
      circumstances: adminDecision.circumstances,
      reportScore: isApproved ? adminDecision.finalImpact : 0,
    });

    // Update Reporter Score (Only on state transitions)
    if (report.reporterId) {
      const reporter = await usersRepo.findById(report.reporterId);
      if (reporter) {
        let reporterDelta = 0;
        
        // Transitions to Approved
        if (isApproved && !wasApproved) {
          reporterDelta = wasRejected ? 15 : 5;
        } 
        // Transitions to Rejected
        else if (isRejected && !wasRejected) {
          reporterDelta = wasApproved ? -15 : -10;
        }

        if (reporterDelta !== 0) {
          const nextScore = clamp((reporter.reporterScore ?? 50) + reporterDelta, 0, 100);
          if (nextScore !== reporter.reporterScore) {
            await usersRepo.setReporterScore(report.reporterId, nextScore);
          }
        }
      }
    }

    // Log Action
    await adminActionsRepo.create({
      actor: user!,
      action: 'report.adjudicate',
      entityType: 'report',
      entityId: id.data,
      before: { report, account },
      after: { report: persistedReport, account: updatedAccount }
    });

    // Notify
    if (report.reporterId) {
      const subjectName = updatedAccount.displayName || updatedAccount.username || 'an account';
      await notificationsRepo.create({
        userId: report.reporterId,
        kind: isApproved ? 'report_approved' : 'report_rejected',
        title: isApproved ? 'Filing approved' : 'Filing rejected',
        body: isApproved
          ? `Your filing on ${subjectName} was approved. Impact: ${adminDecision.finalImpact >= 0 ? '+' : ''}${adminDecision.finalImpact}.`
          : `Your filing on ${subjectName} was rejected.`,
        link: `/account/${updatedAccount._id}`,
        meta: { reportId: id.data, accountId: updatedAccount._id }
      });
    }

    return ok({ report: persistedReport, account: updatedAccount });
  } catch (error) {
    console.error('[adjudicate api] failure:', error);
    return fail('internal_error', error instanceof Error ? error.message : 'Decision failed', 500);
  }
}
