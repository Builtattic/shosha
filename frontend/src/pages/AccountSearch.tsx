import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { searchAccounts } from '@/api/accounts';
import type { Account } from '@/types/account';
import { AccountCard } from '@/components/accounts/AccountCard';

export default function AccountSearch() {
  const [query, setQuery] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchAccounts(trimmed);
        if (!alive) return;
        setAccounts(res.ok ? res.data?.items ?? [] : []);
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <main className="min-h-screen bg-background p-4 pb-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-2xl font-bold">Search Accounts</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Search for accounts by name or handle
        </p>

        <div className="relative mt-4">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accounts…"
            className="w-full rounded-full border border-border bg-card py-3 pl-11 pr-10 text-[14px] outline-none focus:ring-2 focus:ring-primary/20"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label="Clear"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        <div className="mt-6 space-y-3">
          {query.trim().length < 2 ? (
            <p className="py-12 text-center text-[13px] text-muted-foreground">
              Search for accounts by name or handle
            </p>
          ) : loading ? (
            <p className="py-12 text-center text-[13px] text-muted-foreground">Searching…</p>
          ) : accounts.length === 0 ? (
            <p className="py-12 text-center text-[13px] text-muted-foreground">
              No accounts found for &apos;{query.trim()}&apos;
            </p>
          ) : (
            accounts.map((account) => <AccountCard key={account.id} account={account} />)
          )}
        </div>
      </div>
    </main>
  );
}
