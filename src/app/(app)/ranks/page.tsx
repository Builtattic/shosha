import * as accountsRepo from '@/lib/repos/accounts';
import { BASE_SCORE } from '@/lib/scoring';
import { RanksTabs, type RankRow } from './RanksTabs';

export const dynamic = 'force-dynamic';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function weeklyChange(account: { score: number; scoreHistory?: Array<{ t: string; s: number }> }): number {
  const history = account.scoreHistory ?? [];
  if (!history.length) return 0;
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  const before = [...history].reverse().find((entry) => new Date(entry.t).valueOf() <= cutoff);
  const baseline = before ? before.s : history[0].s;
  return account.score - baseline;
}

function toRow(account: Awaited<ReturnType<typeof accountsRepo.listTop>>[number]): RankRow {
  return {
    id: account._id,
    name: account.displayName,
    handle: account.username,
    platform: account.platform,
    avatar:
      account.avatarUrl ||
      `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(account.displayName || account.username)}`,
    score: account.score,
    change: weeklyChange(account),
    isVerified: Boolean(account.verified)
  };
}

function matchesScope(account: accountsRepo.AccountRecord, scope: string) {
  if (scope === 'global') return true;
  if (account.regionScope === scope) return true;
  const region = `${account.region ?? ''} ${account.cityCountry ?? ''}`.toLowerCase();
  if (scope === 'national') return Boolean(region);
  if (scope === 'regional') return /(asia|europe|africa|america|middle east|gcc)/i.test(region);
  if (scope === 'local') return Boolean(account.cityCountry);
  return true;
}

export default async function RanksPage({ searchParams }: { searchParams?: { scope?: string } }) {
  const scope = ['global', 'regional', 'national', 'local'].includes(searchParams?.scope ?? '')
    ? searchParams!.scope!
    : 'global';
  const all = await accountsRepo.listEvery().catch(() => []);
  const scoped = all.filter((account) => matchesScope(account, scope));
  const active = scoped.filter((account) => !account.archived);
  const archived = scoped.filter((account) => account.archived);
  const topByScore = [...active].sort((a, b) => b.score - a.score).slice(0, 50);
  const bottomByScore = [...active].sort((a, b) => a.score - b.score).slice(0, 50);
  const activeRows = active.map(toRow);

  const topByScoreRows = topByScore.map(toRow);
  const topGainers = activeRows
    .filter((row) => row.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 10);

  // Keep "On Fire" populated: weekly gainers first, then highest-score profiles.
  const gainers = [
    ...topGainers,
    ...topByScoreRows.filter((row) => !topGainers.some((gainer) => gainer.id === row.id)),
  ].slice(0, 10);

  const biggestWeeklyLosses = activeRows
    .filter((row) => row.change < 0)
    .sort((a, b) => a.change - b.change)
    .slice(0, 10);

  // Fallback: no weekly losses yet, keep legacy "below baseline" behavior.
  const underFireByScore = bottomByScore
    .map(toRow)
    .filter((row) => row.score < BASE_SCORE)
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);
  const underFire = biggestWeeklyLosses.length ? biggestWeeklyLosses : underFireByScore;

  return (
    <main className="min-h-screen bg-background p-4 safe-bottom">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">Ranks</h1>
      </div>
      <RanksTabs topGainers={gainers} underFire={underFire} archived={archived.map(toRow).slice(0, 20)} initialScope={scope} />
    </main>
  );
}
