'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FeedItem } from '@/components/feed/FeedItem';
import { PostDetailModal } from '@/components/feed/PostDetailModal';
import { cn } from '@/lib/utils';
import { type FeedReport, toFeedItem } from '@/lib/feed';
import { MobileAppHeader } from '@/components/nav/MobileAppHeader';

type FeedFilter = 'for_you' | 'top' | 'positive' | 'negative' | 'following';

const tabs: Array<{ label: string; value: FeedFilter }> = [
  { label: 'All', value: 'for_you' },
  { label: 'Trending', value: 'top' },
  { label: 'Positive', value: 'positive' },
  { label: 'Negative', value: 'negative' },
  { label: 'Following', value: 'following' }
];

function FeedContent() {
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
      <MobileAppHeader
        onSearch={(q) => setQuery(q)}
        showSearch={searchOpen}
        onSearchToggle={() => setSearchOpen((v) => !v)}
      />

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
            <div
              key={item._id}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button, a, input, textarea')) return;
                setSelectedReportId(item._id);
                setDetailOpen(true);
              }}
              className="cursor-pointer"
            >
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
