'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Bell, Plus, X } from 'lucide-react';
import { FeedItem, type FeedItemProps } from '@/components/feed/FeedItem';
import { useReportModal } from '@/components/report/ReportModalProvider';
import { cn } from '@/lib/utils';

type FeedFilter = 'for_you' | 'top' | 'positive' | 'negative' | 'following';
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
    username: string;
    displayName: string;
    avatarUrl?: string;
    verified?: boolean;
    platform?: string;
  };
};

const tabs: Array<{ label: string; value: FeedFilter }> = [
  { label: 'All', value: 'for_you' },
  { label: 'Trending', value: 'top' },
  { label: 'Positive', value: 'positive' },
  { label: 'Negative', value: 'negative' },
  { label: 'Following', value: 'following' }
];

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
      platform: report.account.platform
    },
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

export default function FeedPage() {
  const reportModal = useReportModal();
  const [activeTab, setActiveTab] = useState<FeedFilter>('for_you');
  const [feed, setFeed] = useState<FeedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const backendFilter = activeTab === 'positive' || activeTab === 'negative' ? 'for_you' : activeTab;
    let alive = true;
    setLoading(true);
    fetch(`/api/feed?filter=${backendFilter}`)
      .then((response) => response.json())
      .then((payload) => {
        if (alive && payload.ok) setFeed(payload.data);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [activeTab]);

  const visibleFeed = useMemo(() => {
    const cleaned = query.trim().toLowerCase();
    return feed.filter((report) => {
      const tabMatches =
        activeTab === 'positive' ? report.type === 'positive' : activeTab === 'negative' ? report.type === 'negative' : true;
      const queryMatches = cleaned
        ? `${report.description} ${report.account.displayName} ${report.account.username}`.toLowerCase().includes(cleaned)
        : true;
      return tabMatches && queryMatches;
    });
  }, [activeTab, feed, query]);

  return (
    <main className="min-h-screen bg-background safe-bottom">
      <header className="sticky top-0 z-50 bg-background/80 p-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="font-serif text-[28px] font-black text-foreground">
            Sho<span className="font-normal italic text-muted-foreground">शा</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSearchOpen((value) => !value)}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Search reports"
            >
              {searchOpen ? <X size={22} /> : <Search size={22} />}
            </button>
            <button
              type="button"
              onClick={() => reportModal.open()}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Create report"
            >
              <Plus size={22} />
            </button>
            <button type="button" className="relative text-muted-foreground transition-colors hover:text-foreground" aria-label="Notifications">
              <Bell size={22} />
              <span className="absolute right-0.5 top-0 h-2 w-2 rounded-full border border-background bg-destructive" />
            </button>
          </div>
        </div>
        {searchOpen && (
          <div className="mx-auto max-w-2xl">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
              placeholder="Search reports..."
              className="mt-3 w-full rounded-full border border-border bg-card px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}
      </header>

      <div className="mx-auto max-w-2xl">
        <div className="mb-6 mt-2 px-4">
          <div className="flex gap-2 overflow-x-auto scroll-smooth no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  'whitespace-nowrap rounded-full border px-5 py-2 text-[13px] font-bold transition-all',
                  activeTab === tab.value
                    ? 'scale-105 border-foreground bg-foreground text-background shadow-md'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 px-4">
          {loading && (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="mb-6 overflow-hidden rounded-[24px] border border-border bg-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
                    <div className="flex flex-col gap-2">
                      <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
                      <div className="h-3 w-20 animate-pulse rounded-md bg-muted" />
                    </div>
                  </div>
                  <div className="mt-4 h-[250px] w-full animate-pulse rounded-[16px] bg-muted" />
                  <div className="mt-4 h-6 w-3/4 animate-pulse rounded-md bg-muted" />
                  <div className="mt-6 flex gap-3">
                    <div className="h-12 flex-1 animate-pulse rounded-xl bg-muted" />
                    <div className="h-12 flex-1 animate-pulse rounded-xl bg-muted" />
                  </div>
                </div>
              ))}
            </>
          )}
          {!loading && visibleFeed.map((item) => <FeedItem key={item._id} {...toFeedItem(item)} />)}
          {!loading && visibleFeed.length === 0 && (
            <div className="rounded-[24px] border border-border bg-card p-6 text-center">
              <p className="text-[15px] font-bold text-foreground">No reports match this view.</p>
              <p className="mt-2 text-[13px] text-muted-foreground">Try another tab or create the first filing.</p>
            </div>
          )}
        </div>
      </div>

    </main>
  );
}
