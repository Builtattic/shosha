import { getCurrentUser } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import type { AppUser } from '@/lib/repos/users';
import { resolveRankScope } from '@/lib/rankScope';
import { BASE_SCORE } from '@/lib/scoring';
import { RanksTabs, type RankRow } from './RanksTabs';
import { MobileAppHeader } from '@/components/nav/MobileAppHeader';

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

function normalizeLoc(value?: string) {
  return (value ?? '').trim().toLowerCase();
}

function parseAccountLocation(account: accountsRepo.AccountRecord): { city?: string; country?: string } {
  const cc = (account.cityCountry ?? '').trim();
  if (cc) {
    const parts = cc.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return { city: parts[0], country: parts[parts.length - 1] };
    }
    if (parts.length === 1) {
      const region = (account.region ?? '').trim();
      return region ? { country: region } : { country: parts[0] };
    }
  }
  const region = (account.region ?? '').trim();
  return region ? { country: region } : {};
}

function matchesScope(account: accountsRepo.AccountRecord, scope: string, viewer: AppUser | null) {
  if (scope === 'global') return true;

  const viewerCountry = normalizeLoc(viewer?.country);
  const viewerCity = normalizeLoc(viewer?.city);
  const accountLoc = parseAccountLocation(account);
  const accountCountry = normalizeLoc(accountLoc.country);
  const accountCity = normalizeLoc(accountLoc.city);

  switch (scope) {
    case 'national':
      return Boolean(viewerCountry) && accountCountry === viewerCountry;
    case 'local':
      return (
        Boolean(viewerCountry && viewerCity) &&
        accountCountry === viewerCountry &&
        accountCity === viewerCity
      );
    default:
      return true;
  }
}

export default async function RanksPage({ searchParams }: { searchParams?: { scope?: string } }) {
  const scope = resolveRankScope(searchParams?.scope);
  const viewer = await getCurrentUser();
  const all = await accountsRepo.listEvery().catch(() => []);
  const scoped = all.filter((account) => matchesScope(account, scope, viewer));
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
      <MobileAppHeader />
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-[28px] font-black leading-none tracking-tight text-foreground">Ranks</h1>
      </div>
      <RanksTabs topGainers={gainers} underFire={underFire} archived={archived.map(toRow).slice(0, 20)} initialScope={scope} />
    </main>
  );
}
