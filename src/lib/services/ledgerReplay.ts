import * as usersRepo from '@/lib/repos/users';
import * as reportsRepo from '@/lib/repos/reports';
import {
  calcDelta,
  profileMultipliersFromUser,
  DEFAULT_MULTIPLIERS,
  type EventMultipliers,
} from '@/lib/scoring';
import type { LedgerEntryRecord } from '@/lib/repos/users';

// Map a report's approved finalImpact onto a category we know about.
// finalImpact is admin-entered −10..+10; scaled to a BaseImpact tier.
function categoryFor(finalImpact: number): { category: string; baseImpact: number } {
  const sign = finalImpact >= 0 ? 1 : -1;
  const mag = Math.abs(finalImpact);
  // Tiered mapping aligned with BASE_IMPACTS table.
  let baseImpact = 50;
  let positive = 'small_help';
  let negative = 'insult';
  if (mag >= 9) { baseImpact = 1000; positive = 'saving_life'; negative = 'severe_violence'; }
  else if (mag >= 7) { baseImpact = 700; positive = 'major_contribution'; negative = 'assault'; }
  else if (mag >= 5) { baseImpact = 500; positive = 'major_contribution'; negative = 'fraud'; }
  else if (mag >= 3) { baseImpact = 300; positive = 'integrity'; negative = 'hate_speech'; }
  else if (mag >= 2) { baseImpact = 150; positive = 'community'; negative = 'harassment'; }
  return {
    category: sign > 0 ? positive : negative,
    baseImpact: sign * baseImpact,
  };
}

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
    const finalImpact = report.adminDecision?.finalImpact ?? 0;
    if (finalImpact === 0) continue;
    const { category, baseImpact } = categoryFor(finalImpact);
    const delta = calcDelta(baseImpact, multipliers);
    if (delta === 0) continue;
    entries.push({
      t: report.adminDecision?.decidedAt ?? report.createdAt ?? new Date().toISOString(),
      delta,
      cause: 'report',
      category,
      eventId: report._id,
      multipliers: multipliers as unknown as Record<string, number>,
    });
  }

  await usersRepo.rebuildLedger(userId, entries);
  const finalScore = entries.reduce((sum, e) => sum + e.delta, 1000);
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
