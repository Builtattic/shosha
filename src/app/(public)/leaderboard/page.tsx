import { cn } from '@/lib/utils';
import * as accountsRepo from '@/lib/repos/accounts';
import { EmptyState } from '@/components/ui/EmptyState';
import { BASE_SCORE } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type LeaderRow = {
  _id: string;
  displayName: string;
  bio?: string;
  score: number;
  delta: number;
};

function weeklyDelta(account: { score: number; scoreHistory?: Array<{ t: string; s: number }> }): number {
  const history = account.scoreHistory ?? [];
  if (!history.length) return 0;
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  const before = [...history].reverse().find((entry) => new Date(entry.t).valueOf() <= cutoff);
  const baseline = before ? before.s : history[0].s;
  return account.score - baseline;
}

function toRow(account: Awaited<ReturnType<typeof accountsRepo.listTop>>[number]): LeaderRow {
  return {
    _id: account._id,
    displayName: account.displayName,
    bio: `${account.platform.toUpperCase()} · @${account.username}`,
    score: account.score,
    delta: weeklyDelta(account)
  };
}

function formatSigned(value: number) {
  if (value === 0) return '0';
  return `${value >= 0 ? '+' : '-'}${Math.abs(value).toLocaleString()}`;
}

function initials(name: string) {
  return name.slice(0, 1).toUpperCase();
}

function TopCard({ row, rank, featured = false }: { row: LeaderRow; rank: number; featured?: boolean }) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center bg-surface/50 p-8 text-center transition-all group hover:bg-surface2/50',
        featured ? 'border-2 border-brand-green/30' : 'border border-border'
      )}
    >
      {featured ? (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 font-mono text-[9px] text-brand-green">
          ★ #1
        </div>
      ) : (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 font-mono text-[9px] text-muted">#{rank}</div>
      )}

      <div
        className={cn(
          'mt-4 flex h-14 w-14 items-center justify-center border font-serif text-3xl font-bold transition-colors',
          featured ? 'border-brand-green/50 text-brand-green bg-brand-green/5' : 'border-border text-muted group-hover:text-text'
        )}
      >
        {initials(row.displayName)}
      </div>

      <h2 className="mt-6 font-serif text-2xl font-bold text-white">{row.displayName}</h2>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-[2px] text-muted">{row.bio}</p>

      <div
        className={cn(
          'mt-6 font-serif text-[40px] font-black leading-none',
          featured ? 'text-brand-green' : 'text-brand-green/70'
        )}
      >
        {row.score.toLocaleString()}
      </div>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[1px] text-muted/60">
        {row.delta === 0 ? 'No weekly change' : `${row.delta > 0 ? '↑ +' : '↓ '}${row.delta.toLocaleString()}`}
      </p>
    </div>
  );
}

function RankRow({ row, rank, negative = false }: { row: LeaderRow; rank: number; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-bg/30 px-8 py-4 transition-colors hover:bg-surface/50">
      <div className="flex items-center gap-8">
        <span className={cn('w-6 font-serif text-2xl font-bold', negative ? 'text-brand-red/50' : 'text-muted/50')}>
          {rank}
        </span>

        <div className="flex items-center gap-4">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center border font-serif text-xl font-bold',
              negative ? 'border-brand-red/20 text-brand-red/60 bg-brand-red/5' : 'border-border text-muted bg-surface/50'
            )}
          >
            {initials(row.displayName)}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white/90">{row.displayName}</h3>
            <p className="font-mono text-[9px] uppercase tracking-[2px] text-muted/50">{row.bio}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-12 text-right">
        <div className={cn('font-serif text-3xl font-black', negative ? 'text-brand-red' : 'text-brand-green')}>
          {formatSigned(row.score)}
        </div>
        <div
          className={cn(
            'w-24 font-mono text-[10px] tracking-[1px]',
            negative ? 'text-brand-red/60' : 'text-brand-green/60'
          )}
        >
          {row.delta === 0 ? (
            <span className="text-muted/40 uppercase">no change</span>
          ) : (
            <>
              {row.delta > 0 ? '↑ ' : '↓ '}
              {Math.abs(row.delta).toLocaleString()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function LeaderboardPage() {
  const [top, bottom] = await Promise.all([
    accountsRepo.listTop(50).catch(() => []),
    accountsRepo.listBottom(50).catch(() => [])
  ]);

  const bestRows = top.map(toRow);
  const worstRows = bottom.filter((account) => account.score < BASE_SCORE).map(toRow);

  return (
    <main className="min-h-screen bg-bg">
      <section className="flex flex-col gap-6 border-b border-border px-8 py-8 md:flex-row md:items-center md:justify-between">
        <h1 className="font-serif text-[44px] font-black leading-none text-white">Leaderboard</h1>
        <div className="flex gap-2">
          {['REGIONAL', 'NATIONAL', 'CONTINENTAL', 'GLOBAL'].map((scope) => (
            <button
              key={scope}
              className={cn(
                'border border-border px-6 py-2 font-mono text-[10px] uppercase tracking-[2px] text-muted transition-all hover:border-muted hover:text-text',
                scope === 'GLOBAL' && 'border-muted text-text'
              )}
            >
              {scope}
            </button>
          ))}
        </div>
      </section>

      <section className="px-8 py-10">
        <div className="mb-10 flex items-center gap-6">
          <p className="font-mono text-[10px] uppercase tracking-[4px] text-muted">Best Scores — Global</p>
          <div className="h-px flex-1 bg-border" />
        </div>

        {bestRows.length === 0 ? (
          <EmptyState
            title="No accounts tracked yet."
            body="Open a dossier on someone to seed the leaderboard."
          />
        ) : bestRows.length < 3 ? (
          <div className="space-y-px">
            {bestRows.map((row, index) => (
              <RankRow key={row._id} row={row} rank={index + 1} />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-px bg-border lg:grid-cols-3">
              <TopCard row={bestRows[1]} rank={2} />
              <TopCard row={bestRows[0]} rank={1} featured />
              <TopCard row={bestRows[2]} rank={3} />
            </div>
            <div className="mt-8">
              {bestRows.slice(3).map((row, index) => (
                <RankRow key={row._id} row={row} rank={index + 4} />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="px-8 pb-20">
        <div className="mb-10 flex items-center gap-6">
          <p className="font-mono text-[10px] uppercase tracking-[4px] text-brand-red">Worst Scores — Global</p>
          <div className="h-px flex-1 bg-border" />
        </div>

        {worstRows.length === 0 ? (
          <EmptyState title="No accounts under baseline." body="No accounts have dropped below the neutral score yet." />
        ) : (
          <div className="space-y-px">
            {worstRows.map((row, index) => (
              <RankRow key={row._id} row={row} rank={index + 1} negative />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
