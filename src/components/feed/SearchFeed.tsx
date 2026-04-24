'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { formatPlatform } from '@/lib/utils';

type AccountRow = {
  _id: string;
  platform: 'x' | 'instagram';
  username: string;
  displayName: string;
  score: number;
  bio: string;
};

export function SearchFeed({ initialAccounts }: { initialAccounts: AccountRow[] }) {
  const [q, setQ] = useState('');
  const [accounts, setAccounts] = useState(initialAccounts);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const response = await fetch(`/api/accounts/search?q=${encodeURIComponent(q)}`);
      const payload = await response.json();
      if (payload.ok) setAccounts(payload.data);
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q]);

  const validHandle = useMemo(() => /^[a-zA-Z0-9_.]{2,50}$/.test(q), [q]);

  return (
    <section className="px-4 py-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 text-muted" size={18} />
        <Input
          className="pl-10"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="search an account"
        />
      </div>
      <div className="mt-5 space-y-3">
        {accounts.map((account) => (
          <Link key={account._id} href={`/account/${account._id}`} className="block border border-border bg-raised p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase text-muted">{formatPlatform(account.platform)} dossier</p>
                <h2 className="mt-1 font-serif text-4xl">{account.displayName}</h2>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">@{account.username}</p>
              </div>
              <div className="text-right">
                <p className="font-serif text-5xl text-accent">{account.score}</p>
                <p className="text-[10px] uppercase text-muted">Shosha Score</p>
              </div>
            </div>
          </Link>
        ))}
        {loading ? <p className="border border-border bg-dim p-4 text-xs uppercase text-muted">Indexing the query</p> : null}
        {!loading && accounts.length === 0 ? (
          <EmptyState
            title="No file yet."
            body={
              validHandle
                ? 'This handle has not entered the archive. A signed in user can open the first dossier.'
                : 'The archive has no matching trace.'
            }
          />
        ) : null}
      </div>
    </section>
  );
}
