import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAccounts } from '@/api/accounts';
import type { Account } from '@/types/account';
import { cn } from '@/lib/utils';

const BASE_SCORE = 1000;

type LeaderRow = {
  id: string;
  displayName: string;
  bio: string;
  score: number;
};

function toRow(account: Account): LeaderRow {
  return {
    id: account.id,
    displayName: account.display_name ?? account.handle,
    bio: `${account.platform.toUpperCase()} · @${account.handle}`,
    score: account.score,
  };
}

function initials(name: string) {
  return name.slice(0, 1).toUpperCase();
}

function TopCard({ row, rank, featured = false }: { row: LeaderRow; rank: number; featured?: boolean }) {
  return (
    <Link
      to={`/accounts/${row.id}`}
      className={cn(
        'relative flex flex-col items-center justify-center bg-card/50 p-8 text-center transition-all hover:bg-muted/30',
        featured ? 'border-2 border-emerald-500/30' : 'border border-border',
      )}
    >
      {featured ? (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 font-mono text-[9px] text-emerald-500">
          ★ #1
        </div>
      ) : (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 font-mono text-[9px] text-muted-foreground">#{rank}</div>
      )}

      <div
        className={cn(
          'mt-4 flex h-14 w-14 items-center justify-center border font-serif text-3xl font-bold transition-colors',
          featured ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/5' : 'border-border text-muted-foreground',
        )}
      >
        {initials(row.displayName)}
      </div>

      <h2 className="mt-6 font-serif text-2xl font-bold text-foreground">{row.displayName}</h2>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-[2px] text-muted-foreground">{row.bio}</p>

      <div className={cn('mt-6 font-serif text-[40px] font-black leading-none', featured ? 'text-emerald-500' : 'text-emerald-500/70')}>
        {row.score.toLocaleString()}
      </div>
    </Link>
  );
}

function RankRow({ row, rank, negative = false }: { row: LeaderRow; rank: number; negative?: boolean }) {
  return (
    <Link
      to={`/accounts/${row.id}`}
      className="flex items-center justify-between border-b border-border bg-background/30 px-8 py-4 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-center gap-8">
        <span className={cn('w-6 font-serif text-2xl font-bold', negative ? 'text-red-500/50' : 'text-muted-foreground/50')}>
          {rank}
        </span>

        <div className="flex items-center gap-4">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center border font-serif text-xl font-bold',
              negative ? 'border-red-500/20 text-red-500/60 bg-red-500/5' : 'border-border text-muted-foreground bg-card/50',
            )}
          >
            {initials(row.displayName)}
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground/90">{row.displayName}</h3>
            <p className="font-mono text-[9px] uppercase tracking-[2px] text-muted-foreground/50">{row.bio}</p>
          </div>
        </div>
      </div>

      <div className={cn('font-serif text-3xl font-black', negative ? 'text-red-500' : 'text-emerald-500')}>
        {row.score.toLocaleString()}
      </div>
    </Link>
  );
}

export default function Leaderboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    listAccounts(100)
      .then((data) => {
        if (alive) setAccounts(data.items ?? []);
      })
      .catch(() => {
        if (alive) setAccounts([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  const bestRows = useMemo(
    () => [...accounts].sort((a, b) => b.score - a.score).slice(0, 50).map(toRow),
    [accounts],
  );

  const worstRows = useMemo(
    () => [...accounts].filter((a) => a.score < BASE_SCORE).sort((a, b) => a.score - b.score).slice(0, 50).map(toRow),
    [accounts],
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading leaderboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <section className="flex flex-col gap-6 border-b border-border px-8 py-8 md:flex-row md:items-center md:justify-between">
        <h1 className="font-serif text-[44px] font-black leading-none text-foreground">Leaderboard</h1>
        <div className="flex gap-2">
          {['REGIONAL', 'NATIONAL', 'CONTINENTAL', 'GLOBAL'].map((scope) => (
            <button
              key={scope}
              type="button"
              className={cn(
                'border border-border px-6 py-2 font-mono text-[10px] uppercase tracking-[2px] text-muted-foreground transition-all hover:border-muted-foreground hover:text-foreground',
                scope === 'GLOBAL' && 'border-muted-foreground text-foreground',
              )}
            >
              {scope}
            </button>
          ))}
        </div>
      </section>

      <section className="px-8 py-10">
        <div className="mb-10 flex items-center gap-6">
          <p className="font-mono text-[10px] uppercase tracking-[4px] text-muted-foreground">Best Scores — Global</p>
          <div className="h-px flex-1 bg-border" />
        </div>

        {bestRows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="font-semibold">No accounts tracked yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">Open a dossier on someone to seed the leaderboard.</p>
          </div>
        ) : bestRows.length < 3 ? (
          <div className="space-y-px">
            {bestRows.map((row, index) => (
              <RankRow key={row.id} row={row} rank={index + 1} />
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
                <RankRow key={row.id} row={row} rank={index + 4} />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="px-8 pb-20">
        <div className="mb-10 flex items-center gap-6">
          <p className="font-mono text-[10px] uppercase tracking-[4px] text-red-500">Worst Scores — Global</p>
          <div className="h-px flex-1 bg-border" />
        </div>

        {worstRows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="font-semibold">No accounts under baseline.</p>
            <p className="mt-1 text-sm text-muted-foreground">No accounts have dropped below the neutral score yet.</p>
          </div>
        ) : (
          <div className="space-y-px">
            {worstRows.map((row, index) => (
              <RankRow key={row.id} row={row} rank={index + 1} negative />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
