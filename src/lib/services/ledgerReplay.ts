import * as usersRepo from '@/lib/repos/users';
import * as reportsRepo from '@/lib/repos/reports';
import {
  calcDelta,
  calcMultiplierQuotient,
  applySheetScore,
  profileMultipliersFromUser,
  DEFAULT_MULTIPLIERS,
  resolveSheetBaseImpact,
  resolveSheetBaseImpactFromAdminImpact,
  type EventMultipliers,
} from '@/lib/scoring';
import type { LedgerEntryRecord } from '@/lib/repos/users';

export type ReplayResult = {
  userId: string;
  entriesApplied: number;
  finalScore: number;
};

// Rebuild a single user's ledger by walking every approved report against any
// account they have claimed, computing Δ with the new formula, and persisting
// the result. Idempotent — running it twice yields the same final score.
export async function replayUserLedger(userId: string): Promise<ReplayResult | null> {
  const user = await usersRepo.findById(userId);
  if (!user) return null;

  const claimedAccountIds = user.claimedAccounts ?? [];
  if (claimedAccountIds.length === 0) {
    await usersRepo.rebuildLedger(userId, []);
    return { userId, entriesApplied: 0, finalScore: 1000 };
  }

  // Collect approved reports across every claimed account.
  const allReports = (
    await Promise.all(
      claimedAccountIds.map(id =>
        reportsRepo.listForAccount(id, ['approved'], 500).catch(() => [])
      )
    )
  ).flat();

  // Sort chronologically — order matters so the timeline reads correctly.
  allReports.sort((a, b) =>
    new Date(a.adminDecision?.decidedAt ?? a.createdAt ?? 0).getTime() -
    new Date(b.adminDecision?.decidedAt ?? b.createdAt ?? 0).getTime()
  );

  const multipliers: EventMultipliers = user.onboardingComplete
    ? profileMultipliersFromUser(user)
    : DEFAULT_MULTIPLIERS;

  const entries: LedgerEntryRecord[] = [];
  for (const report of allReports) {
    const finalImpact = report.adminDecision?.finalImpact ?? report.reportScore ?? 0;
    if (finalImpact === 0 && !report.deed && !report.baseScore) continue;
    const scoringRow = report.deed
      ? resolveSheetBaseImpact(report.deed, report.type)
      : resolveSheetBaseImpactFromAdminImpact(finalImpact, report.type);
    const baseImpact = typeof report.baseScore === 'number' ? report.baseScore : scoringRow.baseScore;
    const reportMultipliers: EventMultipliers = {
      ...multipliers,
      reputation: Number(report.repetitionPattern ?? report.adminDecision?.repetitionPattern ?? multipliers.reputation),
      intent: Number(report.intent ?? report.adminDecision?.intent ?? multipliers.intent),
      circumstances: Number(report.circumstances ?? report.adminDecision?.circumstances ?? multipliers.circumstances),
    };
    const delta = typeof report.reportScore === 'number' ? report.reportScore : calcDelta(baseImpact, reportMultipliers);
    if (delta === 0) continue;
    entries.push({
      t: report.adminDecision?.decidedAt ?? report.createdAt ?? new Date().toISOString(),
      delta,
      cause: 'report',
      category: report.category ?? scoringRow.category,
      eventId: report._id,
      baseScore: baseImpact,
      multiplierQuotient: calcMultiplierQuotient(reportMultipliers),
      multipliers: reportMultipliers as unknown as Record<string, number>,
    });
  }

  await usersRepo.rebuildLedger(userId, entries);
  const finalScore = entries.reduce((score, e) => applySheetScore(score, e.delta).score, 1000);
  return { userId, entriesApplied: entries.length, finalScore };
}

// Replay every user's ledger. Returns one result per user.
export async function replayAllLedgers(): Promise<ReplayResult[]> {
  const users = await usersRepo.listAll(1000);
  const results: ReplayResult[] = [];
  for (const u of users) {
    const r = await replayUserLedger(u._id);
    if (r) results.push(r);
  }
  return results;
}
