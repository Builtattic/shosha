import { fail, fromZod, ok } from '@/lib/api';
import { anonymousTag } from '@/lib/anonymous';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { idSchema, mediaSchema, reportTypeSchema, reportVisibilitySchema, workbookScaleSchema } from '@/lib/validators';
import {
  WORKBOOK_FORMULA_VERSION,
  applySheetScore,
  calcDelta,
  calcMultiplierQuotient,
  calcWorkbookScoreFromEntries,
  credibilityWeight,
  profileMultipliersFromWorkbookProfile,
  resolveSheetBaseImpact,
} from '@/lib/scoring';
import * as accountsRepo from '@/lib/repos/accounts';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as eventsRepo from '@/lib/repos/events';
import * as ledgerEntriesRepo from '@/lib/repos/ledgerEntries';
import * as reportMetadataRepo from '@/lib/repos/reportMetadata';
import * as reportsRepo from '@/lib/repos/reports';
import * as siteSettingsRepo from '@/lib/repos/siteSettings';
import { replayUsersForAccount } from '@/lib/services/ledgerReplay';
import { z } from 'zod';

const createSchema = z.object({
  accountId: idSchema,
  type: reportTypeSchema,
  description: z.string().min(10).max(500),
  feelings: z.string().max(500).default('Published by the Shosha admin team.'),
  media: mediaSchema,
  status: z.literal('approved').default('approved'),
  category: z.string().min(1).max(120),
  deed: z.string().min(1).max(160),
  baseScore: z.number().int(),
  repetitionPattern: workbookScaleSchema.default('1'),
  intent: workbookScaleSchema.default('1'),
  circumstances: workbookScaleSchema.default('1'),
  note: z.string().max(500).default('Admin-created feed claim.'),
  visibility: reportVisibilitySchema.default('public'),
  pinned: z.boolean().default(false),
  featured: z.boolean().default(false),
  stats: z.object({
    aligns: z.number().int().nonnegative().default(0),
    opposes: z.number().int().nonnegative().default(0),
    comments: z.number().int().nonnegative().default(0),
    shares: z.number().int().nonnegative().default(0),
  }).default({ aligns: 0, opposes: 0, comments: 0, shares: 0 }),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can create feed claims.', 403);
  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);
  const account = await accountsRepo.findById(parsed.data.accountId);
  if (!account) return fail('not_found', 'No dossier exists for that claim.', 404);
  const now = new Date().toISOString();
  const scoringRow = resolveSheetBaseImpact(parsed.data.deed, parsed.data.type);
  if (
    scoringRow.deed !== parsed.data.deed ||
      scoringRow.category !== parsed.data.category ||
      scoringRow.baseScore !== parsed.data.baseScore
  ) {
    return fail('validation_error', 'The selected deed and base score do not match the workbook scoring index.', 422);
  }
  const multipliers = profileMultipliersFromWorkbookProfile(account, {
    repetitionPattern: Number(parsed.data.repetitionPattern),
    intent: Number(parsed.data.intent),
    circumstances: Number(parsed.data.circumstances),
  });
  const multiplierQuotient = calcMultiplierQuotient(multipliers);
  const rawDelta = calcDelta(scoringRow.baseScore, multipliers);
  const settings = await siteSettingsRepo.get();
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
  const finalImpact = Math.round(delta);
  const adminDecision = parsed.data.status === 'approved'
    ? {
        adminId: user!._id,
        verdict: 'approved' as const,
        finalImpact,
        note: parsed.data.note,
        category: scoringRow.category,
        deed: scoringRow.deed,
        baseScore: scoringRow.baseScore,
        repetitionPattern: parsed.data.repetitionPattern,
        intent: parsed.data.intent,
        circumstances: parsed.data.circumstances,
        decidedAt: now
      }
    : null;
  const report = await reportsRepo.create({
    accountId: parsed.data.accountId,
    reportNo: (await reportsRepo.count().catch(() => 0)) + 1,
    reporterId: null,
    anonymousTag: anonymousTag(request),
    hashedUserId: user!._id,
    publicAnonymous: true,
    type: parsed.data.type,
    category: scoringRow.category,
    deed: scoringRow.deed,
    baseScore: scoringRow.baseScore,
    reportScore: rawDelta,
    credibilityWeight: credibilityWeight(user!.reporterScore, 80),
    description: parsed.data.description,
    feelings: parsed.data.feelings,
    media: parsed.data.media,
    repetitionPattern: parsed.data.repetitionPattern,
    intent: parsed.data.intent,
    circumstances: parsed.data.circumstances,
    aiUndertaking: true,
    disputeStatus: 'none',
    status: parsed.data.status,
    aiVerdict: null,
    adminDecision,
    visibility: parsed.data.visibility,
    pinned: parsed.data.pinned,
    featured: parsed.data.featured,
    createdByAdminId: user!._id,
    source: 'admin',
    stats: parsed.data.stats,
  });

  let updatedAccount = account;
  let updatedReport = report;
  let ownerLedgers: Awaited<ReturnType<typeof replayUsersForAccount>> = [];
  if (parsed.data.status === 'approved' && scoringRow.baseScore !== 0) {
    const event = await eventsRepo.create({
      subjectId: account._id,
      reporterId: null,
      anonymousTag: report.anonymousTag,
      eventType: parsed.data.type,
      description: parsed.data.description,
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
      proofLinks: parsed.data.media?.url ? [parsed.data.media.url] : [],
      location: 'Global',
      timestamp: now,
      status: 'approved',
      aiVerdict: null,
      adminDecision: { verdict: 'approved', note: parsed.data.note, decidedAt: now },
      stats: parsed.data.stats,
    });
    const ledgerEntry = await ledgerEntriesRepo.createWithId(`report_${report._id}`, {
      profileId: account._id,
      reportId: report._id,
      baseScore: scoringRow.baseScore,
      multipliers,
      multiplierQuotient,
      delta,
      timestamp: now,
      formulaVersion: WORKBOOK_FORMULA_VERSION,
      capped: delta !== rawDelta,
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
        ledgerEntryId: ledgerEntry._id,
      },
      adminOverrides: {
        reputation: multipliers.reputation,
        intent: multipliers.intent,
        circumstances: multipliers.circumstances,
      },
    });
    const ledgerEntries = await ledgerEntriesRepo.listForProfile(account._id);
    const tracker = calcWorkbookScoreFromEntries(ledgerEntries);
    const globalScore = ledgerEntries.reduce((sum, entry) => sum + entry.delta, 0);
    updatedAccount = (await accountsRepo.update(account._id, {
      score: tracker.finalScore,
      displayScore: tracker.finalScore,
      globalScore,
      windowScores: tracker,
      scoreHistory: [
        ...(account.scoreHistory ?? []),
        {
          t: now,
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
    })) ?? account;
    updatedReport = (await reportsRepo.update(report._id, { eventId: event._id, ledgerEntryId: ledgerEntry._id })) ?? report;
    ownerLedgers = await replayUsersForAccount(account._id, updatedAccount.claimedBy);
  }
  await adminActionsRepo.create({ actor: user!, action: 'report.create', entityType: 'report', entityId: report._id, after: { report: updatedReport, account: updatedAccount, ownerLedgers } });
  return ok({ report: updatedReport, account: updatedAccount, ownerLedgers }, 201);
}
