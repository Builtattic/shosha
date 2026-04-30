'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useMemo, useState } from 'react';
import { Link2, MessageCircle, Plus, Search, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { cn, formatPlatform } from '@/lib/utils';
import { BASE_SCORE } from '@/lib/scoring';

type AccountRow = {
  _id: string;
  platform: 'x' | 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'linkedin' | 'website';
  username: string;
  displayName: string;
  score: number;
  bio: string;
  avatarUrl?: string;
  followers?: string;
  verified?: boolean;
};

type AccountCandidate = {
  platform: AccountRow['platform'];
  username: string;
  displayName: string;
  sourceUrl: string;
  bio: string;
  followers?: string;
  verified?: boolean;
  confidence: number;
  reason: string;
};

type FeedFilter = 'all' | 'positive' | 'negative' | 'following';

const feedFilters: Array<{ value: FeedFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'positive', label: 'Positive' },
  { value: 'negative', label: 'Negative' },
  { value: 'following', label: 'Following' }
];

function scoreTone(score: number) {
  if (score >= BASE_SCORE) return 'text-success border-success';
  if (score < 0) return 'text-danger border-danger';
  return 'text-warn border-warn';
}

function eventScore(score: number) {
  const delta = Math.round(score - BASE_SCORE);
  return delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString();
}

export function SearchFeed({ initialAccounts }: { initialAccounts: AccountRow[] }) {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [accounts, setAccounts] = useState(initialAccounts);
  const [candidates, setCandidates] = useState<AccountCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState<AccountRow['platform']>('instagram');
  const [tracking, setTracking] = useState(false);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');

  useEffect(() => {
    if (!q.trim()) {
      setAccounts(initialAccounts);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      const response = await fetch(`/api/accounts/search?q=${encodeURIComponent(q)}&discover=1`);
      const payload = await response.json();
      if (payload.ok) {
        if (Array.isArray(payload.data)) {
          setAccounts(payload.data);
          setCandidates([]);
        } else {
          setAccounts(payload.data.accounts ?? []);
          setCandidates(payload.data.candidates ?? []);
        }
      }
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [initialAccounts, q]);

  const normalizedHandle = useMemo(() => q.trim().replace(/^@/, '').toLowerCase(), [q]);
  const validHandle = useMemo(() => /^[a-zA-Z0-9_.]{2,50}$/.test(normalizedHandle), [normalizedHandle]);
  const filteredAccounts = useMemo(() => {
    if (feedFilter === 'positive') return accounts.filter((account) => account.score >= BASE_SCORE);
    if (feedFilter === 'negative') return accounts.filter((account) => account.score < BASE_SCORE);
    if (feedFilter === 'following') return accounts.filter((account) => account.verified);
    return accounts;
  }, [accounts, feedFilter]);

  async function trackHandle(candidate?: AccountCandidate) {
    if (!user) {
      router.push('/sign-in');
      return;
    }
    const username = candidate?.username ?? normalizedHandle;
    const selectedPlatform = candidate?.platform ?? platform;
    setTracking(true);
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform,
          username,
          displayName: candidate?.displayName,
          sourceUrl: candidate?.sourceUrl,
          bio: candidate?.bio,
          followers: candidate?.followers,
          verified: candidate?.verified
        })
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
    <section className="px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
      <div className="flex flex-col gap-3 border-b border-border pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-3 text-muted" size={18} />
          <Input
            className="pl-10"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="search profiles..."
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {feedFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setFeedFilter(filter.value)}
              className={cn(
                'h-9 border px-4 text-[10px] uppercase tracking-[0.28em] transition',
                feedFilter === filter.value
                  ? 'border-accent text-accent'
                  : 'border-border bg-transparent text-muted hover:text-text'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 space-y-4">
        {filteredAccounts.map((account) => {
          const tone = scoreTone(account.score);
          return (
            <article key={account._id} className={cn('border bg-raised/80', tone)}>
              <Link href={`/account/${account._id}`} className="block p-5 text-text lg:p-6">
                <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center border border-border bg-dim font-serif text-2xl text-accent">
                      {account.displayName.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-serif text-3xl leading-none sm:text-4xl">{account.displayName}</h2>
                      <p className="mt-1 truncate text-[10px] uppercase tracking-[0.28em] text-muted">
                        {formatPlatform(account.platform)} / @{account.username}
                        {account.followers ? ` / ${account.followers}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className={cn('font-serif text-4xl leading-none sm:text-5xl', tone.split(' ')[0])}>
                      {eventScore(account.score)}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted">Score {account.score}</p>
                  </div>
                </div>
                <div className="mt-6">
                  <p className={cn('text-[10px] uppercase tracking-[0.28em]', tone.split(' ')[0])}>
                    {account.score >= BASE_SCORE ? 'documented - positive signal' : account.score < 0 ? 'reported - review signal' : 'documented - mixed signal'}
                  </p>
                  <p className="mt-4 max-w-[120ch] text-sm leading-7 text-text">
                    {account.bio || 'Public profile dossier with filings, captured posts, and score history ready for review.'}
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-2 bg-dim/80 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-muted">
                  <Link2 size={14} className="shrink-0" />
                  Source:
                  <span className="truncate text-accent">
                    {formatPlatform(account.platform)} index - public filings - captured posts
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    `Trust x${(account.score / 30).toFixed(1)}`,
                    `Reach x${(Number.parseInt(account.followers ?? '0', 10) || account.score).toFixed(0)}`,
                    account.verified ? 'Verified x3.0' : 'Unclaimed x0.5'
                  ].map((tag) => (
                    <span key={tag} className="border border-border bg-dim px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
              <div className="grid border-t border-border text-[10px] uppercase tracking-[0.22em] text-muted sm:grid-cols-4">
                <div className="flex min-h-11 items-center justify-center border-b border-border px-4 sm:border-b-0 sm:border-r">
                  + Align
                </div>
                <div className="flex min-h-11 items-center justify-center border-b border-border px-4 sm:border-b-0 sm:border-r">
                  - Oppose
                </div>
                <div className="flex min-h-11 items-center justify-center gap-2 border-b border-border px-4 sm:border-b-0 sm:border-r">
                  <MessageCircle size={13} />
                  Comment
                </div>
                <div className="flex min-h-11 items-center justify-center gap-2 px-4">
                  <Share2 size={13} />
                  Share
                </div>
              </div>
            </article>
          );
        })}
        {loading ? <p className="border border-border bg-dim p-4 text-xs uppercase text-muted">Indexing the query</p> : null}
        {!loading && filteredAccounts.length === 0 ? (
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
                  {(['instagram', 'facebook', 'x', 'youtube', 'tiktok', 'linkedin'] as const).map((option) => (
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
                <Button className="mt-3 w-full" disabled={tracking} onClick={() => trackHandle()}>
                  <Plus size={16} />
                  {tracking ? 'Fetching live account' : user ? 'Open live dossier' : 'Sign in to track'}
                </Button>
                {candidates.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs uppercase text-muted">Gemini-ranked public matches</p>
                    {candidates.map((candidate) => (
                      <button
                        key={`${candidate.platform}:${candidate.username}:${candidate.sourceUrl}`}
                        type="button"
                        onClick={() => trackHandle(candidate)}
                        disabled={tracking}
                        className="block w-full border border-border bg-dim p-3 text-left transition hover:border-accent disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-bold">{candidate.displayName}</span>
                          <span className="text-[10px] uppercase text-accent">{Math.round(candidate.confidence * 100)}%</span>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted">
                          {formatPlatform(candidate.platform)} / @{candidate.username}
                        </p>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{candidate.reason}</p>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
