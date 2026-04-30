import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import * as usersRepo from '@/lib/repos/users';
import {
  DEFAULT_MULTIPLIERS,
  BASE_SCORE,
  applySheetScore,
  calcDelta,
  calcMultiplierQuotient,
  profileMultipliersFromUser,
  resolveSheetBaseImpactFromAdminImpact,
  type EventMultipliers,
} from '@/lib/scoring';
import type { ScoreHistoryPoint } from '@/lib/repos/accounts';

export type AccountReplayResult = {
  accountId: string;
  entriesApplied: number;
  finalScore: number;
};

export async function replayAccountLedger(accountId: string): Promise<AccountReplayResult | null> {
  const account = await accountsRepo.findById(accountId);
  if (!account) return null;

  const claimant = account.claimedBy ? await usersRepo.findById(account.claimedBy).catch(() => null) : null;
  const multipliers: EventMultipliers = claimant?.onboardingComplete
    ? profileMultipliersFromUser(claimant)
    : DEFAULT_MULTIPLIERS;

  const reports = await reportsRepo.listForAccount(accountId, ['approved'], 1000).catch(() => []);
  reports.sort((a, b) =>
    new Date(a.adminDecision?.decidedAt ?? a.createdAt ?? 0).getTime() -
    new Date(b.adminDecision?.decidedAt ?? b.createdAt ?? 0).getTime()
  );

  const entries: ScoreHistoryPoint[] = [];
  for (const report of reports) {
    const finalImpact = report.adminDecision?.finalImpact ?? 0;
    if (finalImpact === 0) continue;
    const scoringRow = resolveSheetBaseImpactFromAdminImpact(finalImpact, report.type);
    const delta = calcDelta(scoringRow.baseScore, multipliers);
    if (delta === 0) continue;
    entries.push({
      t: report.adminDecision?.decidedAt ?? report.createdAt ?? new Date().toISOString(),
      s: 0,
      cause: 'report',
      delta,
      baseScore: scoringRow.baseScore,
      profileId: accountId,
      eventId: report.eventId ?? report._id,
      multiplierQuotient: calcMultiplierQuotient(multipliers),
      category: scoringRow.category,
      deed: scoringRow.deed,
      multipliers: multipliers as unknown as Record<string, number>,
    });
  }

  await accountsRepo.rebuildLedger(accountId, entries);
  const finalScore = entries.reduce((score, entry) => applySheetScore(score, entry.delta ?? 0).score, BASE_SCORE);
  return { accountId, entriesApplied: entries.length, finalScore };
}

export async function replayAllAccountLedgers(): Promise<AccountReplayResult[]> {
  const accounts = await accountsRepo.listAll(1000);
  const results: AccountReplayResult[] = [];
  for (const account of accounts) {
    const result = await replayAccountLedger(account._id);
    if (result) results.push(result);
  }
  return results;
}
