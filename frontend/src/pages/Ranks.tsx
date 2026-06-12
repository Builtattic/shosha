import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { listAccounts } from '@/api/accounts';
import type { Account } from '@/types/account';
import { UNDER_FIRE_THRESHOLD } from '@/lib/constants';
import { cn } from '@/lib/utils';

type Scope = 'global' | 'regional';

export default function Ranks() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeScope, setActiveScope] = useState<Scope>('global');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listAccounts(100)
      .then((data) => {
        if (alive) setAccounts(data.items ?? []);
      })
      .catch(() => {
        if (alive) setError('Failed to load rankings');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const sorted = useMemo(() => {
    // TODO: region filter — blocked on onboarding region field (Day 20 open item)
    const list = activeScope === 'regional' ? [...accounts] : [...accounts];
    return list.sort((a, b) => b.score - a.score);
  }, [accounts, activeScope]);

  const onFire = sorted.slice(0, 10);
  const underFire = useMemo(
    () =>
      sorted
        .filter(
          (account) =>
            account.weekly_delta != null &&
            account.weekly_delta < UNDER_FIRE_THRESHOLD,
        )
        .sort((a, b) => (a.weekly_delta ?? 0) - (b.weekly_delta ?? 0)),
    [sorted],
  );
  const allAccounts = sorted;

  return (
    <main className="min-h-screen bg-background safe-bottom pb-20 md:pb-8 p-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="font-serif text-[28px] font-black leading-none tracking-tight text-foreground">
            Ranks
          </h1>
          <TrendingUp size={24} className="text-primary" />
        </div>

        <div className="mb-6 flex gap-2">
          {(['global', 'regional'] as const).map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => setActiveScope(scope)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-[12px] font-bold capitalize transition-colors',
                activeScope === scope
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted',
              )}
            >
              {scope}
            </button>
          ))}
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-[18px] border border-border bg-card" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-[24px] border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-[14px] font-bold text-destructive">{error}</p>
          </div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className="rounded-[24px] border border-border bg-card p-8 text-center">
            <p className="text-[15px] font-bold text-foreground">No accounts ranked yet</p>
          </div>
        )}

        {!loading && !error && sorted.length > 0 && (
          <div className="space-y-8">
            <section>
              <h2 className="mb-4 text-[16px] font-bold text-foreground">On Fire</h2>
              <ul className="space-y-2">
                {onFire.map((account, index) => (
                  <li key={account.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/accounts/${account.id}`)}
                      className="flex w-full items-center gap-4 rounded-[18px] border border-border bg-card p-4 text-left transition-colors hover:bg-muted/30"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[14px] font-black text-primary tabular-nums">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-bold text-foreground truncate">
                          {account.display_name ?? account.handle}
                        </p>
                        <p className="text-[11px] text-muted-foreground capitalize">{account.platform}</p>
                      </div>
                      <span className="text-[18px] font-black tabular-nums">
                        {account.score.toLocaleString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {underFire.length > 0 && (
              <section>
                <h2 className="mb-4 text-[16px] font-bold text-destructive">Under Fire</h2>
                <ul className="space-y-2">
                  {underFire.map((account) => (
                    <li key={`under-${account.id}`}>
                      <button
                        type="button"
                        onClick={() => navigate(`/accounts/${account.id}`)}
                        className="flex w-full items-center gap-4 rounded-[18px] border border-destructive/30 bg-card p-4 text-left transition-colors hover:bg-destructive/5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-bold text-foreground truncate">
                            {account.display_name ?? account.handle}
                          </p>
                          <p className="text-[11px] text-muted-foreground capitalize">{account.platform}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[18px] font-black tabular-nums">
                            {account.score.toLocaleString()}
                          </span>
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-bold text-destructive tabular-nums">
                            {account.weekly_delta} pts this week
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="mb-4 text-[16px] font-bold text-foreground">All Accounts</h2>
              <ul className="space-y-2">
                {allAccounts.map((account, index) => (
                  <li key={`all-${account.id}`}>
                    <button
                      type="button"
                      onClick={() => navigate(`/accounts/${account.id}`)}
                      className="flex w-full items-center gap-4 rounded-[18px] border border-border bg-card p-3 text-left transition-colors hover:bg-muted/30"
                    >
                      <span className="w-8 shrink-0 text-[12px] font-bold text-muted-foreground tabular-nums">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-foreground truncate">
                          {account.display_name ?? account.handle}
                        </p>
                        <p className="text-[11px] text-muted-foreground capitalize">{account.platform}</p>
                      </div>
                      <span className="text-[15px] font-bold tabular-nums">
                        {account.score.toLocaleString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
