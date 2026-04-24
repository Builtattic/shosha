'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { cn, formatPlatform } from '@/lib/utils';

type AccountRow = {
  _id: string;
  platform: 'x' | 'instagram';
  username: string;
  displayName: string;
  score: number;
  bio: string;
};

export function SearchFeed({ initialAccounts }: { initialAccounts: AccountRow[] }) {
  const router = useRouter();
  const { data: session } = useSession();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [accounts, setAccounts] = useState(initialAccounts);
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState<'instagram' | 'x'>('instagram');
  const [tracking, setTracking] = useState(false);

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

  const normalizedHandle = useMemo(() => q.trim().replace(/^@/, '').toLowerCase(), [q]);
  const validHandle = useMemo(() => /^[a-zA-Z0-9_.]{2,50}$/.test(normalizedHandle), [normalizedHandle]);

  async function trackHandle() {
    if (!session) {
      router.push('/signin');
      return;
    }
    setTracking(true);
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, username: normalizedHandle })
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error.message);
      toast.push('Live profile captured into a new dossier.');
      router.push(`/account/${payload.data._id}`);
      router.refresh();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'The live lookup did not return a dossier.');
    } finally {
      setTracking(false);
    }
  }

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
          <div className="space-y-3">
            <EmptyState
              title="No file yet."
              body={
                validHandle
                  ? 'This handle has not entered the archive. Open the first dossier from a live platform lookup.'
                  : 'The archive has no matching trace.'
              }
            />
            {validHandle ? (
              <div className="border border-border bg-raised p-4">
                <p className="text-xs uppercase text-muted">Track @{normalizedHandle}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(['instagram', 'x'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPlatform(option)}
                      className={cn(
                        'min-h-11 border px-3 text-xs uppercase',
                        platform === option ? 'border-accent text-accent' : 'border-border text-muted'
                      )}
                    >
                      {formatPlatform(option)}
                    </button>
                  ))}
                </div>
                <Button className="mt-3 w-full" disabled={tracking} onClick={trackHandle}>
                  <Plus size={16} />
                  {tracking ? 'Fetching live account' : session ? 'Open live dossier' : 'Sign in to track'}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
