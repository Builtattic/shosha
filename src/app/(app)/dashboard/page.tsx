'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Bell, Plus, ChevronRight, CheckCircle2, X } from 'lucide-react';
import { FeedItem, type FeedItemProps } from '@/components/feed/FeedItem';
import { D3ScoreGauge } from '@/components/viz/D3ScoreGauge';
import { cn } from '@/lib/utils';
import { useReportModal } from '@/components/report/ReportModalProvider';
import { SignInChip } from '@/components/nav/SignInChip';
import { calcProfileScores, calcShoshaScore } from '@/lib/scoring';
import { useAuth } from '@/contexts/AuthContext';

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
  category?: string;
  deed?: string;
  disputeStatus?: string;
  reportScore?: number;
  baseScore?: number;
  canRequestModeration?: boolean;
  viewer?: FeedItemProps['viewer'];
  account: {
    _id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    verified?: boolean;
    score: number;
    platform?: string;
  };
  reporter?: {
    username: string;
    name?: string;
    photoUrl?: string;
    role?: string;
  } | null;
};

type Notification = { id: string; title: string; body: string; link?: string; read?: boolean };
type Platform = 'x' | 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'linkedin' | 'reddit' | 'snapchat' | 'website';
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
      name: report.account.displayName.replace(/^@/, ''),
      handle: report.account.username.replace(/^@/, ''),
      avatar: report.account.avatarUrl ?? '',
      isVerified: Boolean(report.account.verified),
      accountId: report.account._id,
      platform: report.account.platform
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
    media: report.media ? { type: report.media.type, url: report.media.url } : undefined,
    category: report.category,
    deed: report.deed,
    disputeStatus: report.disputeStatus,
    reportScore: report.reportScore ?? report.baseScore,
    stats: report.stats ?? { aligns: 0, opposes: 0, comments: 0, shares: 0 },
    delta: report.adminDecision?.finalImpact ?? report.aiVerdict?.proposedImpact ?? 0,
    viewer: report.viewer,
    canRequestModeration: report.canRequestModeration
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user: firebaseUser } = useAuth();
  const reportModal = useReportModal();
  const [activeTab, setActiveTab] = useState<FeedFilter>('for_you');
  const [feed, setFeed] = useState<FeedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [myReportHref, setMyReportHref] = useState('/profile');
  const [accountMatches, setAccountMatches] = useState<AccountMatch[]>([]);
  const [accountCandidates, setAccountCandidates] = useState<AccountCandidate[]>([]);
  const [searchingAccounts, setSearchingAccounts] = useState(false);
  const [meData, setMeData] = useState<{ user: any; claimedAccounts: any[] } | null>(null);
  const [heroImgError, setHeroImgError] = useState(false);
  
  const [trendingPeople, setTrendingPeople] = useState<any[]>([]);
  const [topStories, setTopStories] = useState<FeedReport[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const filterMap: Record<FeedFilter, string> = {
      for_you: 'for_you',
      following: 'following',
      top: 'top',
      near: 'near',
    };
    fetch(`/api/feed?filter=${filterMap[activeTab]}`)
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
      
    fetch('/api/people/trending')
      .then(r => r.json())
      .then(p => { if (active && p.ok) setTrendingPeople(p.data.items); })
      .catch(() => undefined);
      
    fetch('/api/feed?filter=top')
      .then(r => r.json())
      .then(p => { if (active && p.ok) setTopStories(p.data.slice(0, 5)); })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [activeTab]);

  const loadMe = useCallback(async () => {
    try {
      const response = await fetch('/api/me', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload.ok) return;
      setMeData({ user: payload.data.user, claimedAccounts: payload.data.claimedAccounts ?? [] });
      const claimedAccountId = payload.data.claimedAccounts?.[0]?._id;
      setMyReportHref(claimedAccountId ? `/account/${claimedAccountId}` : '/profile');
    } catch {
      // keep the current dashboard snapshot
    }
  }, []);

  useEffect(() => {
    loadMe();
    const interval = window.setInterval(loadMe, 15_000);
    const onFocus = () => loadMe();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadMe();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [loadMe]);

  // Always fetch unread count for the badge
  useEffect(() => {
    fetch('/api/notifications')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (!payload.ok) return;
        const items = Array.isArray(payload.data?.items) ? payload.data.items : [];
        setNotifications(items);
        setUnreadCount(typeof payload.data?.unread === 'number' ? payload.data.unread : 0);
      })
      .catch(() => undefined);
  }, [notificationsOpen]);

  useEffect(() => {
    if (!searchOpen || query.trim().length < 2) {
      setAccountMatches([]);
      setAccountCandidates([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchingAccounts(true);
      try {
        const response = await fetch(`/api/accounts/search?q=${encodeURIComponent(query)}&discover=1`, { signal: controller.signal });
        const payload = await response.json();
        if (payload.ok) {
          setAccountMatches(payload.data.accounts ?? []);
          setAccountCandidates(payload.data.candidates ?? []);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setAccountMatches([]);
          setAccountCandidates([]);
        }
      } finally {
        if (!controller.signal.aborted) setSearchingAccounts(false);
      }
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
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

  // Compute user's own Shosha Score from profile dimensions
  const profileDims = meData?.user ? calcProfileScores(meData.user) : [];
  const contextPercent = calcShoshaScore(profileDims);
  const ledgerScore = meData?.user?.score ?? 1000;
  const credibility = contextPercent;
  const hasOnboarded = !!(meData?.user?.onboardingComplete || meData?.user?.name || meData?.user?.occupationRole);
  const displayName = meData?.user?.name || firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'You';
  
  const accountAvatar = meData?.claimedAccounts?.find((account) => {
    const avatar = account?.avatarUrl;
    return Boolean(avatar && avatar !== 'null' && avatar !== 'undefined');
  })?.avatarUrl;
  const photo = meData?.user?.photoUrl || firebaseUser?.photoURL || accountAvatar;
  const avatarUrl = (photo && photo !== 'null' && photo !== 'undefined') ? photo : null;
  const showHeroAvatar = Boolean(avatarUrl && !heroImgError);

  const displayScore = ledgerScore;
  const scoreLabel = 'Shosha Score';
  const scoreContext = hasOnboarded
    ? 'Calculated from your profile dimensions and reported events'
    : 'Complete your profile to start building your Shosha Score';

  return (
    <main className="min-h-screen overflow-x-clip bg-background safe-bottom">
      <header className="sticky top-0 z-50 bg-background/80 p-4 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl">
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
                {unreadCount > 0 && (
                  <span className="pointer-events-none absolute right-0.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full border border-background bg-destructive px-1 text-[9px] font-bold text-background">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                {notificationsOpen && (
                  <div className="absolute right-0 top-9 z-30 w-80 rounded-[18px] border border-border bg-card p-2 shadow-xl">
                    {notifications.length === 0 ? (
                      <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">You&apos;re all caught up.</p>
                    ) : (
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.slice(0, 12).map((item) => {
                          const content = (
                            <>
                              <p className={cn('text-[13px] font-bold', item.read ? 'text-muted-foreground' : 'text-foreground')}>{item.title}</p>
                              <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{item.body}</p>
                            </>
                          );
                          return item.link ? (
                            <Link key={item.id} href={item.link} className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-muted">
                              {content}
                            </Link>
                          ) : (
                            <div key={item.id} className="rounded-xl px-3 py-2.5">
                              {content}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <motion.button
                type="button"
                onClick={() => reportModal.open({ onSubmitted: (id) => setMyReportHref(`/account/${id}`) })}
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className="hidden sm:flex items-center gap-1 rounded-full bg-foreground px-4 py-2 text-[13px] font-bold text-background shadow-sm transition-colors hover:bg-foreground/90"
              >
                <Plus size={16} strokeWidth={3} /> Create Report
              </motion.button>
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
                {searchingAccounts && <p className="px-2 py-2 text-[12px] text-muted-foreground">Searching accounts with Shosha...</p>}
                {accountMatches.map((account) => (
                  <Link
                    key={account._id}
                    href={`/account/${account._id}`}
                    className="block rounded-[14px] px-3 py-3 transition hover:bg-muted"
                  >
                    <Link href={`/account/${account._id}`} className="text-[13px] font-bold hover:underline">{account.displayName}</Link>
                    <p className="text-[11px] text-muted-foreground">{account.platform}</p>
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
                        <p className="truncate text-[11px] text-muted-foreground">{candidate.platform}</p>
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
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 lg:px-0">
        {/* ── Hero Banner ─────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4"
        >
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm">

            <div className="px-5 pt-6 pb-7 sm:px-8 sm:pt-7 sm:pb-8">

              {/* ── Row 1: Avatar + Name ── */}
              <div className="flex items-center gap-4">
                <Link href="/profile" aria-label="Go to profile" className="h-14 w-14 overflow-hidden rounded-2xl border border-border bg-muted shadow-sm shrink-0 flex items-center justify-center relative hover:opacity-80 transition-opacity">
                  {avatarUrl ? (
                    <img
                      key={avatarUrl}
                      src={avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={() => setHeroImgError(true)}
                      onLoad={() => setHeroImgError(false)}
                    />
                  ) : null}
                  <div className={cn(
                    "avatar-fallback flex h-full w-full items-center justify-center text-lg font-black",
                    showHeroAvatar && "hidden"
                  )}>
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                </Link>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Welcome back
                  </p>
                  <h2 className="text-[20px] font-black text-foreground leading-tight tracking-tight">
                    {displayName}
                  </h2>
                </div>
              </div>

              {/* ── Row 2: Score + Gauge side by side ── */}
              <div className="mt-8 flex items-end justify-between gap-4 sm:gap-6">

                {/* Left: big score number */}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                    {scoreLabel}
                  </p>
                  <div className="text-[52px] sm:text-[76px] font-black leading-none text-foreground tabular-nums tracking-tight">
                    {displayScore.toLocaleString()}
                  </div>
                  <p className="mt-3 text-[12px] sm:text-[13px] leading-[1.6] text-muted-foreground max-w-[240px]">
                    {scoreContext}
                  </p>
                  {!hasOnboarded && (
                    <Link
                      href="/onboard"
                      className="mt-3 inline-block text-[12px] font-semibold text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-all"
                    >
                      Increase your credibility by completing profile
                    </Link>
                  )}
                </div>

                {/* Right: credibility gauge — the only credibility visual */}
                <div className="shrink-0 flex flex-col items-center gap-2 pb-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Credibility
                  </p>
                  <div className="w-[130px] sm:w-[180px]">
                    <D3ScoreGauge score={credibility} size={180} />
                  </div>
                  <p className="text-[13px] font-black text-foreground tabular-nums -mt-1">
                    {credibility}<span className="text-[10px] font-semibold text-muted-foreground"> /100</span>
                  </p>
                </div>
              </div>

              {/* ── Row 3: Stats + Profile link ── */}
              <div className="mt-7 pt-6 border-t border-border flex items-center justify-between gap-3">
                <div className="flex gap-6">
                  <div>
                    <div className="text-[17px] font-black text-foreground tabular-nums">
                      {meData?.claimedAccounts?.length ?? 0}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-0.5">
                      Accounts
                    </div>
                  </div>
                  {hasOnboarded && (
                    <>
                      <div className="w-px bg-border" />
                      <div>
                        <div className="text-[17px] font-black text-foreground tabular-nums">
                          {ledgerScore}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-0.5">
                          Shosha Score
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <Link
                  href={myReportHref}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-background px-5 py-2.5 text-[13px] font-bold text-foreground shadow-sm transition-all hover:bg-muted active:scale-95 shrink-0"
                >
                  My Profile <ChevronRight size={15} />
                </Link>
              </div>

            </div>
          </div>
        </motion.section>

        {/* ── Trending People Strip ── */}
        {trendingPeople.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-4 text-[16px] font-bold text-foreground">Trending People</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {trendingPeople.map((person) => (
                <Link
                  key={person.id}
                  href={`/account/${person.id}`}
                  className="flex-shrink-0 w-[140px] rounded-[20px] border border-border bg-card p-4 text-center transition-all hover:bg-muted"
                >
                  <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full border border-border bg-muted">
                    <img src={person.avatar} alt={person.name} className="h-full w-full object-cover" />
                  </div>
                  <h3 className="truncate text-[13px] font-bold text-foreground">{person.name}</h3>
                  <p className="truncate text-[11px] text-muted-foreground">{person.handle}</p>
                  <div className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {person.score.toLocaleString()} pts
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Global Top Stories Strip ── */}
        {topStories.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-4 text-[16px] font-bold text-foreground">Global Top Stories</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {topStories.map((story) => (
                <div
                  key={story._id}
                  className="flex-shrink-0 w-[280px] rounded-[20px] border border-border bg-card p-4 transition-all hover:border-primary/30"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <img src={story.account.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${story.account.username}`} alt={story.account.displayName} className="h-6 w-6 rounded-full" />
                    <span className="truncate text-[12px] font-bold">{story.account.displayName}</span>
                  </div>
                  <p className="line-clamp-2 text-[13px] text-muted-foreground leading-snug mb-3">
                    {story.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className={story.type === 'positive' ? 'text-green-500' : 'text-red-500'}>
                      {story.type === 'positive' ? '+' : ''}{story.adminDecision?.finalImpact ?? story.reportScore ?? story.baseScore ?? 0} pts
                    </span>
                    <span className="text-muted-foreground">{story.stats?.aligns ?? 0} aligns</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="mb-4 text-[20px] font-bold text-foreground">Feed</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.value;
              return (
                <motion.button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={cn(
                    'whitespace-nowrap rounded-full border px-5 py-2 text-[13px] font-bold transition-colors duration-200',
                    isActive
                      ? 'border-foreground bg-foreground text-background shadow-md'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {tab.label}
                </motion.button>
              );
            })}
          </div>
        </section>

        <section className="mt-4 space-y-6">
          {loading && (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-[24px] border border-border bg-card p-5 shadow-sm"
                  style={{ opacity: 1 - i * 0.2 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                      <div className="h-2.5 w-1/4 animate-pulse rounded bg-muted/70" />
                    </div>
                    <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                  </div>
                  <div className="mt-4 h-44 animate-pulse rounded-2xl bg-muted" />
                  <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          )}
          {!loading && visibleFeed.map((item) => <FeedItem key={item._id} {...toFeedItem(item)} />)}
          {!loading && visibleFeed.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-[24px] border border-border bg-card p-6 text-center"
            >
              {activeTab === 'following' ? (
                <>
                  <p className="text-[15px] font-bold text-foreground">No one followed yet.</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">Follow accounts from their dossier to see their activity here.</p>
                </>
              ) : (
                <>
                  <p className="text-[15px] font-bold text-foreground">No filings here yet.</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">Create the first report to populate this view.</p>
                </>
              )}
            </motion.div>
          )}
        </section>
      </div>

    </main>
  );
}
