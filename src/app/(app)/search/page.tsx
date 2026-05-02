'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search as SearchIcon, X } from 'lucide-react';
import { FeedItem, type FeedItemProps } from '@/components/feed/FeedItem';
import { cn } from '@/lib/utils';

type FeedReport = {
  _id: string;
  type: 'positive' | 'negative';
  description: string;
  media?: { type: 'image' | 'video'; url: string };
  createdAt?: string;
  stats?: FeedItemProps['stats'];
  aiVerdict?: { proposedImpact?: number } | null;
  adminDecision?: { finalImpact?: number } | null;
  category?: string;
  deed?: string;
  disputeStatus?: string;
  reportScore?: number;
  baseScore?: number;
  viewer?: FeedItemProps['viewer'];
    verified?: boolean;
    platform?: string;
  };
  reporter?: {
    username: string;
    name?: string;
    photoUrl?: string;
    role?: string;
  } | null;
};

type AccountResult = {
  _id: string;
  platform: string;
  username: string;
  displayName: string;
  score?: number;
  bio?: string;
  avatarUrl?: string;
  followers?: string;
  verified?: boolean;
};

function timestamp(value?: string) {
  if (!value) return 'just now';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes < 60) return minutes < 1 ? 'just now' : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

function toFeedItem(report: FeedReport): FeedItemProps {
  return {
    id: report._id,
    user: {
      name: report.account.displayName.replace(/^@/, ''),
      handle: report.account.username.replace(/^@/, ''),
      avatar: report.account.avatarUrl ?? '',
      isVerified: Boolean(report.account.verified),
      platform: report.account.platform,
      accountId: report.account._id
    },
    reporter: report.reporter ? {
      name: report.reporter.name || report.reporter.username.replace(/^@/, ''),
      handle: report.reporter.username.replace(/^@/, ''),
      avatar: report.reporter.photoUrl ?? '',
      isVerified: report.reporter.role === 'admin' || report.reporter.role === 'moderator'
    } : undefined,
    timestamp: timestamp(report.createdAt),
    type: report.type,
    title: report.description,
    location: 'Global',
    media: report.media,
    category: report.category,
    deed: report.deed,
    disputeStatus: report.disputeStatus,
    reportScore: report.reportScore ?? report.baseScore,
    stats: report.stats ?? { aligns: 0, opposes: 0, comments: 0, shares: 0 },
    delta: report.adminDecision?.finalImpact ?? report.aiVerdict?.proposedImpact ?? 0,
    viewer: report.viewer
  };
}

type Tab = 'reports' | 'accounts';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<FeedReport[]>([]);
  const [accounts, setAccounts] = useState<AccountResult[]>([]);
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
    const t = setTimeout(async () => {
      try {
        const [rRes, aRes] = await Promise.all([
          fetch(`/api/search/reports?q=${encodeURIComponent(trimmed)}&limit=30`).then((r) => r.json()),
          fetch(`/api/accounts/search?q=${encodeURIComponent(trimmed)}`).then((r) => r.json())
        ]);
        if (!alive) return;
        if (rRes.ok) setReports(rRes.data ?? []);
        if (aRes.ok) {
          // /api/accounts/search returns { accounts, candidates } in some shapes — normalise.
          const list = Array.isArray(aRes.data)
            ? aRes.data
            : aRes.data?.accounts ?? aRes.data?.results ?? [];
          setAccounts(list);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);

  const total = useMemo(() => reports.length + accounts.length, [reports, accounts]);

  return (
    <main className="min-h-screen bg-background safe-bottom">
      <header className="sticky top-0 z-50 bg-background/80 p-4 backdrop-blur-xl border-b border-border">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <SearchIcon size={18} />
            </div>
            <div>
              <h1 className="text-[22px] font-serif font-black text-foreground leading-none">Search</h1>
              <p className="text-[11px] text-muted-foreground mt-1">Find filings by content, or accounts by handle.</p>
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

          {query.trim().length >= 2 && (
            <div className="mt-3 flex gap-2">
              {(['reports', 'accounts'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-[12px] font-bold transition-colors',
                    tab === t
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  )}
                >
                  {t === 'reports' ? `Filings (${reports.length})` : `Accounts (${accounts.length})`}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 pt-4">
        {query.trim().length < 2 && (
          <div className="rounded-[24px] border border-border bg-card p-8 text-center">
            <SearchIcon size={28} className="mx-auto text-muted-foreground/60" />
            <p className="mt-3 text-[15px] font-bold text-foreground">Start typing</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              At least 2 characters to search across filings and accounts.
            </p>
          </div>
        )}

        {query.trim().length >= 2 && loading && total === 0 && (
          <p className="text-center text-[13px] text-muted-foreground py-10">Searching…</p>
        )}

        {query.trim().length >= 2 && !loading && total === 0 && (
          <div className="rounded-[24px] border border-border bg-card p-8 text-center">
            <p className="text-[14px] font-bold text-foreground">No results for &ldquo;{query}&rdquo;</p>
            <p className="text-[12px] text-muted-foreground mt-1">Try a different keyword or handle.</p>
          </div>
        )}

        {tab === 'reports' && reports.length > 0 && (
          <div className="space-y-6">
            {reports.map((r) => (
              <FeedItem key={r._id} {...toFeedItem(r)} />
            ))}
          </div>
        )}

        {tab === 'accounts' && accounts.length > 0 && (
          <ul className="space-y-2">
            {accounts.map((a) => (
              <li key={a._id}>
                <Link
                  href={`/account/${a._id}`}
                  className="flex items-center gap-3 rounded-[18px] border border-border bg-card p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                    {a.avatarUrl ? (
                      <img src={a.avatarUrl} alt={a.displayName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[14px] font-bold text-muted-foreground">
                        {a.displayName?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-foreground truncate">{a.displayName.replace(/^@/, '')}</p>
                    <p className="text-[12px] text-muted-foreground truncate">
                      {a.platform}
                    </p>
                  </div>
                  {typeof a.score === 'number' && (
                    <span className="text-[12px] font-bold text-foreground tabular-nums">
                      {Math.round(a.score)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
