'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, Plus, ChevronRight, CheckCircle2, X } from 'lucide-react';
import { FeedItem, type FeedItemProps } from '@/components/feed/FeedItem';
import { ScoreGauge } from '@/components/viz/ScoreGauge';
import { cn } from '@/lib/utils';
import { ReportModal } from '@/components/report/ReportModal';
import { SignInChip } from '@/components/nav/SignInChip';

type FeedFilter = 'for_you' | 'following' | 'top' | 'near';

type FeedReport = {
  _id: string;
  type: 'positive' | 'negative';
  description: string;
  media?: { type: 'image' | 'video'; url: string };
  createdAt?: string;
  stats?: { aligns: number; opposes: number; comments: number; shares: number };
  aiVerdict?: { proposedImpact?: number } | null;
  adminDecision?: { finalImpact?: number } | null;
  viewer?: FeedItemProps['viewer'];
  account: {
    _id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    verified?: boolean;
    score: number;
  };
};

type Notification = { id: string; title: string; body: string };
type Platform = 'x' | 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'linkedin' | 'website';
type AccountMatch = {
  _id: string;
  platform: Platform;
  username: string;
  displayName: string;
  bio?: string;
  followers?: string;
};
type AccountCandidate = {
  platform: Platform;
  username: string;
  displayName: string;
  sourceUrl: string;
  bio: string;
  followers?: string;
  verified?: boolean;
  confidence: number;
  reason: string;
};

const tabs: Array<{ label: string; value: FeedFilter }> = [
  { label: 'For You', value: 'for_you' },
  { label: 'Following', value: 'following' },
  { label: 'Top Impact', value: 'top' },
  { label: 'Near You', value: 'near' }
];

function timestamp(value?: string) {
  if (!value) return 'just now';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function toFeedItem(report: FeedReport): FeedItemProps {
  return {
    id: report._id,
    user: {
      name: report.account.displayName,
      handle: report.account.username,
      avatar: report.account.avatarUrl ?? '',
      isVerified: Boolean(report.account.verified)
    },
    timestamp: timestamp(report.createdAt),
    type: report.type,
    title: report.description,
    location: 'Global',
    media: report.media ? { type: report.media.type, url: report.media.url } : undefined,
    stats: report.stats ?? { aligns: 0, opposes: 0, comments: 0, shares: 0 },
    delta: report.adminDecision?.finalImpact ?? report.aiVerdict?.proposedImpact ?? 0,
    viewer: report.viewer
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FeedFilter>('for_you');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [feed, setFeed] = useState<FeedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [myReportHref, setMyReportHref] = useState('/profile');
  const [accountMatches, setAccountMatches] = useState<AccountMatch[]>([]);
  const [accountCandidates, setAccountCandidates] = useState<AccountCandidate[]>([]);
  const [searchingAccounts, setSearchingAccounts] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch('/api/events')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (active && payload.ok) setFeed(payload.data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeTab]);

  useEffect(() => {
    fetch('/api/me')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (!payload.ok) return;
        const accountId = payload.data.claimedAccounts?.[0]?._id;
        const reportAccountId = payload.data.recentReports?.[0]?.accountId;
        setMyReportHref(accountId || reportAccountId ? `/account/${accountId ?? reportAccountId}` : '/profile');
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;
    fetch('/api/notifications')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (payload.ok) setNotifications(payload.data);
      })
      .catch(() => undefined);
  }, [notificationsOpen]);

  useEffect(() => {
    if (!searchOpen || query.trim().length < 2) {
      setAccountMatches([]);
      setAccountCandidates([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearchingAccounts(true);
      try {
        const response = await fetch(`/api/accounts/search?q=${encodeURIComponent(query)}&discover=1`);
        const payload = await response.json();
        if (payload.ok) {
          setAccountMatches(payload.data.accounts ?? []);
          setAccountCandidates(payload.data.candidates ?? []);
        }
      } catch {
        setAccountMatches([]);
        setAccountCandidates([]);
      } finally {
        setSearchingAccounts(false);
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [query, searchOpen]);

  async function openCandidate(candidate: AccountCandidate) {
    const response = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: candidate.platform,
        username: candidate.username,
        displayName: candidate.displayName,
        sourceUrl: candidate.sourceUrl,
        bio: candidate.bio,
        followers: candidate.followers,
        verified: candidate.verified
      })
    });
    const payload = await response.json();
    if (payload.ok) router.push(`/account/${payload.data._id}`);
  }

  const visibleFeed = useMemo(() => {
    const cleaned = query.trim().toLowerCase();
    if (!cleaned) return feed;
    return feed.filter((report) =>
      `${report.description} ${report.account.displayName} ${report.account.username}`.toLowerCase().includes(cleaned)
    );
  }, [feed, query]);

  const heroAccount = feed[0]?.account;
  const heroScore = heroAccount?.score ?? 60;

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-50 bg-background/80 p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="font-serif text-[28px] font-black text-foreground">
            Sho<span className="font-normal italic text-muted-foreground">शा</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen((value) => !value)}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Search feed"
            >
              {searchOpen ? <X size={22} /> : <Search size={22} />}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((value) => !value)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell size={22} />
              </button>
              <span className="absolute right-0.5 top-0 h-2 w-2 rounded-full border border-background bg-destructive" />
              {notificationsOpen && (
                <div className="absolute right-0 top-9 w-72 rounded-[18px] border border-border bg-card p-3 shadow-xl">
                  {notifications.map((item) => (
                    <div key={item.id} className="border-b border-border py-3 last:border-0">
                      <p className="text-[13px] font-bold text-foreground">{item.title}</p>
                      <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{item.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setReportModalOpen(true)}
              className="flex items-center gap-1 rounded-full bg-foreground px-4 py-2 text-[13px] font-bold text-background shadow-sm transition-all hover:bg-foreground/90 active:scale-95"
            >
              <Plus size={16} strokeWidth={3} /> Create Report
            </button>
            <div className="hidden sm:block">
              <SignInChip />
            </div>
          </div>
        </div>
        {searchOpen && (
          <div className="relative mt-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
              placeholder="Search reports, people, handles..."
              className="w-full rounded-full border border-border bg-card px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/20"
            />
            {(searchingAccounts || accountMatches.length > 0 || accountCandidates.length > 0) && (
              <div className="absolute left-0 right-0 top-14 z-50 max-h-[70vh] overflow-y-auto rounded-[20px] border border-border bg-card p-3 shadow-xl">
                {searchingAccounts && <p className="px-2 py-2 text-[12px] text-muted-foreground">Searching accounts with Gemini...</p>}
                {accountMatches.map((account) => (
                  <Link
                    key={account._id}
                    href={`/account/${account._id}`}
                    className="block rounded-[14px] px-3 py-3 transition hover:bg-muted"
                  >
                    <p className="text-[13px] font-bold">{account.displayName}</p>
                    <p className="text-[11px] text-muted-foreground">{account.platform} / @{account.username}</p>
                  </Link>
                ))}
                {accountCandidates.map((candidate) => (
                  <button
                    key={`${candidate.platform}:${candidate.username}:${candidate.sourceUrl}`}
                    type="button"
                    onClick={() => openCandidate(candidate)}
                    className="block w-full rounded-[14px] px-3 py-3 text-left transition hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold">{candidate.displayName}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{candidate.platform} / @{candidate.username}</p>
                      </div>
                      <span className="rounded-full bg-foreground px-2 py-1 text-[10px] font-bold text-background">
                        {Math.round(candidate.confidence * 100)}%
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{candidate.reason}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      <section className="mt-2 px-4">
        <div className="relative overflow-hidden rounded-[32px] border border-border bg-card p-6 shadow-sm">
          <div className="relative z-10 mb-2 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 overflow-hidden rounded-full border border-border shadow-sm">
                {heroAccount?.avatarUrl ? (
                  <img src={heroAccount.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted font-bold">
                    {(heroAccount?.displayName ?? 'S').slice(0, 1)}
                  </div>
                )}
              </div>
              <div>
                <p className="mb-0.5 text-[12px] font-medium text-muted-foreground">Current signal</p>
                <h2 className="flex items-center gap-1 text-[18px] font-bold text-foreground">
                  {heroAccount?.displayName ?? 'Create your first report'}
                  {heroAccount?.verified && <CheckCircle2 size={16} className="fill-foreground/10 text-foreground" />}
                </h2>
              </div>
            </div>
            <div className="mt-1 text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Shosha Score</p>
            </div>
          </div>

          <div className="relative -mt-8 flex justify-center">
            <ScoreGauge score={heroScore} min={0} max={100} className="w-full scale-[0.85]" />
          </div>

          <div className="mt-[-10px] flex items-center justify-between gap-3">
            <p className="max-w-[170px] text-[12px] font-medium leading-snug text-muted-foreground">
              Live filings, account captures, and votes are now connected to the backend.
            </p>
            <Link
              href={myReportHref}
              className="flex items-center gap-1 rounded-full border border-border bg-background px-4 py-2 text-[12px] font-bold text-foreground shadow-sm transition-all hover:bg-muted active:scale-95"
            >
              View My Report <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 px-4">
        <h2 className="mb-4 text-[20px] font-bold text-foreground">Feed</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
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
      </section>

      <section className="mt-4 space-y-6 px-4">
        {loading && <p className="rounded-[20px] border border-border bg-card p-5 text-sm text-muted-foreground">Loading live filings...</p>}
        {!loading && visibleFeed.map((item) => <FeedItem key={item._id} {...toFeedItem(item)} />)}
        {!loading && visibleFeed.length === 0 && (
          <div className="rounded-[24px] border border-border bg-card p-6 text-center">
            <p className="text-[15px] font-bold text-foreground">No filings here yet.</p>
            <p className="mt-2 text-[13px] text-muted-foreground">Create a report or seed the emulator to populate this view.</p>
          </div>
        )}
      </section>

      <ReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSubmitted={(accountId) => setMyReportHref(`/account/${accountId}`)}
      />
    </main>
  );
}
