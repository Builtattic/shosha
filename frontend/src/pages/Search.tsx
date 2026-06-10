import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X } from 'lucide-react';
import { searchReports, type SearchReport } from '@/api/search';
import { searchAccounts } from '@/api/accounts';
import type { Account } from '@/types/account';
import { cn } from '@/lib/utils';

type Tab = 'reports' | 'accounts';

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<SearchReport[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setReports([]);
      setAccounts([]);
      return;
    }

    let alive = true;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      const [reportsResult, accountsResult] = await Promise.allSettled([
        searchReports(trimmed),
        searchAccounts(trimmed),
      ]);

      if (!alive) return;

      if (reportsResult.status === 'fulfilled') {
        setReports(reportsResult.value);
      } else {
        setReports([]);
      }

      if (accountsResult.status === 'fulfilled') {
        const accountsRes = accountsResult.value;
        if (accountsRes.ok && accountsRes.data) {
          setAccounts(accountsRes.data.items);
        } else {
          setAccounts([]);
        }
      } else {
        setAccounts([]);
      }

      setLoading(false);
    }, 250);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const trimmed = query.trim();

  return (
    <main className="min-h-screen bg-background safe-bottom pb-20 md:pb-8">
      <header className="sticky top-0 z-50 bg-background p-4 border-b border-border">
        <div className="mx-auto max-w-2xl">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <SearchIcon size={18} />
            </div>
            <div>
              <h1 className="font-serif text-[28px] font-black leading-none tracking-tight text-foreground">
                Search
              </h1>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Find filings by content, or accounts by handle.
              </p>
            </div>
          </div>
          <div className="relative">
            <SearchIcon
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search filings, accounts, or keywords…"
              className="w-full rounded-full border border-border bg-card py-3 pl-11 pr-10 text-[14px] outline-none focus:ring-2 focus:ring-primary/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {trimmed.length >= 2 && (
            <div className="mt-3 flex gap-2">
              {(['reports', 'accounts'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-[12px] font-bold transition-colors',
                    activeTab === tab
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted',
                  )}
                >
                  {tab === 'reports' ? `Filings (${reports.length})` : `Accounts (${accounts.length})`}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 pt-4">
        {trimmed.length < 2 && (
          <div className="rounded-[24px] border border-border bg-card p-8 text-center">
            <SearchIcon size={28} className="mx-auto text-muted-foreground/60" />
            <p className="mt-3 text-[15px] font-bold text-foreground">Search for filings and accounts</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              At least 2 characters to search across filings and accounts.
            </p>
          </div>
        )}

        {trimmed.length >= 2 && loading && (
          <div className="space-y-3 py-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-[18px] border border-border bg-card" />
            ))}
          </div>
        )}

        {trimmed.length >= 2 && !loading && activeTab === 'reports' && reports.length === 0 && (
          <div className="rounded-[24px] border border-border bg-card p-8 text-center">
            <p className="text-[14px] font-bold text-foreground">
              No filings found for &ldquo;{query}&rdquo;
            </p>
          </div>
        )}

        {trimmed.length >= 2 && !loading && activeTab === 'accounts' && accounts.length === 0 && (
          <div className="rounded-[24px] border border-border bg-card p-8 text-center">
            <p className="text-[14px] font-bold text-foreground">
              No accounts found for &ldquo;{query}&rdquo;
            </p>
          </div>
        )}

        {activeTab === 'reports' && reports.length > 0 && (
          <div className="space-y-3">
            {reports.map((report) => {
              const label = report.deed ?? report.description;
              const score = report.base_score ?? 0;
              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => {
                    if (report.account?.id) navigate(`/accounts/${report.account.id}`);
                  }}
                  className={cn(
                    'w-full rounded-[18px] border border-border bg-card p-4 text-left transition-colors',
                    report.account?.id ? 'hover:bg-muted/30 cursor-pointer' : 'cursor-default',
                  )}
                >
                  <p className="text-[14px] font-bold text-foreground">{truncate(label, 80)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                    <span className="rounded-full border border-border px-2 py-0.5 font-bold uppercase">
                      {report.status}
                    </span>
                    {report.account && (
                      <span className="text-muted-foreground">
                        @{report.account.handle} · {report.account.platform}
                      </span>
                    )}
                    <span
                      className={cn(
                        'font-bold tabular-nums',
                        score >= 0 ? 'text-emerald-600' : 'text-destructive',
                      )}
                    >
                      {score >= 0 ? '+' : ''}
                      {score}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'accounts' && accounts.length > 0 && (
          <ul className="space-y-2">
            {accounts.map((account) => (
              <li key={account.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/accounts/${account.id}`)}
                  className="flex w-full items-center gap-3 rounded-[18px] border border-border bg-card p-4 text-left transition-colors hover:bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-foreground truncate">
                      {account.display_name ?? account.handle}
                    </p>
                    <p className="text-[12px] text-muted-foreground capitalize">{account.platform}</p>
                  </div>
                  <span className="text-[12px] font-bold tabular-nums">{Math.round(account.score)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
