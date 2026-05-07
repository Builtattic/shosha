'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Bell, Plus, X } from 'lucide-react';
import { FeedItem } from '@/components/feed/FeedItem';
import { useReportModal } from '@/components/report/ReportModalProvider';
import { PostDetailModal } from '@/components/feed/PostDetailModal';
import { cn } from '@/lib/utils';
import { type FeedReport, toFeedItem } from '@/lib/feed';

type FeedFilter = 'for_you' | 'top' | 'positive' | 'negative' | 'following';

const tabs: Array<{ label: string; value: FeedFilter }> = [
  { label: 'All', value: 'for_you' },
  { label: 'Trending', value: 'top' },
  { label: 'Positive', value: 'positive' },
  { label: 'Negative', value: 'negative' },
  { label: 'Following', value: 'following' }
];

function FeedContent() {
  const reportModal = useReportModal();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const initialReportId = searchParams.get('report');
  const [activeTab, setActiveTab] = useState<FeedFilter>('for_you');
  const [feed, setFeed] = useState<FeedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(initialReportId);
  const [detailOpen, setDetailOpen] = useState(!!initialReportId);

  useEffect(() => {
    if (initialReportId) {
      setSelectedReportId(initialReportId);
      setDetailOpen(true);
    }
  }, [initialReportId]);

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
            <button type="button" onClick={() => router.push('/notifications')} className="relative text-muted-foreground transition-colors hover:text-foreground" aria-label="Notifications">
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
          {!loading && visibleFeed.map((item) => (
            <div key={item._id} onClick={() => {
              setSelectedReportId(item._id);
              setDetailOpen(true);
            }} className="cursor-pointer">
              <FeedItem {...toFeedItem(item)} />
            </div>
          ))}
          {!loading && visibleFeed.length === 0 && (
            <div className="rounded-[24px] border border-border bg-card p-6 text-center">
              {activeTab === 'following' ? (
                <>
                  <p className="text-[15px] font-bold text-foreground">No one followed yet.</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">Follow accounts from their dossier to see their filings here.</p>
                </>
              ) : (
                <>
                  <p className="text-[15px] font-bold text-foreground">No reports match this view.</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">Try another tab or create the first filing.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <PostDetailModal
        open={detailOpen}
        reportId={selectedReportId}
        onClose={() => {
          setDetailOpen(false);
          if (initialReportId) {
            router.replace('/feed');
          }
        }}
      />
    </main>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={null}>
      <FeedContent />
    </Suspense>
  );
}
