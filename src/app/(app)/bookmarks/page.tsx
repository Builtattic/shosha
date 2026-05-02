'use client';

import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { FeedItem, type FeedItemProps } from '@/components/feed/FeedItem';

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
  account: {
    _id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
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
      name: report.account.displayName,
      handle: report.account.username,
      avatar: report.account.avatarUrl ?? '',
      isVerified: Boolean(report.account.verified),
      platform: report.account.platform,
      accountId: report.account._id
    },
    reporter: report.reporter ? {
      name: report.reporter.name || report.reporter.username,
      handle: report.reporter.username,
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

export default function BookmarksPage() {
  const [items, setItems] = useState<FeedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/me/bookmarks')
      .then(async (response) => {
        const payload = await response.json();
        if (!alive) return;
        if (!payload.ok) {
          setError(payload.error?.message ?? 'Failed to load bookmarks.');
          setItems([]);
          return;
        }
        setItems(payload.data ?? []);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background safe-bottom">
      <header className="sticky top-0 z-50 bg-background/80 p-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bookmark size={20} />
          </div>
          <div>
            <h1 className="text-[24px] font-serif font-black text-foreground leading-none">Bookmarks</h1>
            <p className="text-[12px] text-muted-foreground mt-1">Filings you saved for later.</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 pt-4">
        {loading && (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="overflow-hidden rounded-[24px] border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
                    <div className="h-3 w-20 animate-pulse rounded-md bg-muted" />
                  </div>
                </div>
                <div className="mt-4 h-[200px] w-full animate-pulse rounded-[16px] bg-muted" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-[24px] border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-[14px] font-bold text-destructive">{error}</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-[24px] border border-border bg-card p-8 text-center">
            <Bookmark size={28} className="mx-auto text-muted-foreground/60" />
            <p className="mt-3 text-[15px] font-bold text-foreground">No bookmarks yet</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Tap the bookmark icon on any filing to save it here.
            </p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="space-y-6">
            {items.map((item) => (
              <FeedItem key={item._id} {...toFeedItem(item)} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
