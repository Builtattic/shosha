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

export default async function RanksPage() {
  const [top, bottom] = await Promise.all([
    accountsRepo.listTop(50).catch(() => []),
    accountsRepo.listBottom(50).catch(() => [])
  ]);

  const topGainers = top
    .map(toRow)
    .filter((row) => row.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 10);

  // Fallback: if nothing has weekly history yet, show top by score so the page isn't empty.
  const gainers = topGainers.length ? topGainers : top.map(toRow).slice(0, 10);

  const underFire = bottom
    .map(toRow)
    .filter((row) => row.score < BASE_SCORE)
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);

  return (
    <main className="min-h-screen bg-background p-4 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">Ranks</h1>
      </div>
      <RanksTabs topGainers={gainers} underFire={underFire} />
    </main>
  );
}
