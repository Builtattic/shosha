import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

// Components
import { FeedItem } from '@/components/feed/FeedItem';
import { PostDetailModal } from '@/components/feed/PostDetailModal';
import { FollowButton } from '@/components/profile/FollowButton';
import { D3ScoreGauge } from '@/components/viz/D3ScoreGauge';

// API
import { getFeed } from '@/api/feed';
import { getTrendingPeople, getDashboardMe } from '@/api/people';

// Lib
import { calcProfileScores, calcShoshaScore } from '@/lib/scoring';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';

// Types
import type { FeedFilter, FeedReport } from '@/types/feed';
import type { TrendingPerson, MeWithAccountsData } from '@/types/dashboard';
import { toFeedItem, timestamp, filterFeedReports } from '@/lib/feed';

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS: Array<{ label: string; value: FeedFilter }> = [
  { label: 'For You',     value: 'for_you' },
  { label: 'Following',   value: 'following' },
  { label: 'Top Impact',  value: 'top' },
  { label: 'Near You',    value: 'near' },
];


// ── Page ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { firebaseUser } = useAuth();

  const [activeTab, setActiveTab] = useState<FeedFilter>('for_you');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [myReportHref, setMyReportHref] = useState('/profile');
  const [meData, setMeData] = useState<MeWithAccountsData | null>(null);
  const [heroImgError, setHeroImgError] = useState(false);

  const [rawTrendingPeople, setRawTrendingPeople] = useState<TrendingPerson[]>([]);
  const trendingPeople = useMemo(() => {
    const followingUsers = meData?.user?.following ?? [];
    const followingAccounts = meData?.user?.followingAccounts ?? [];
    return rawTrendingPeople.filter((person) => {
      const followedAsUser = person.followUserId && followingUsers.includes(person.followUserId);
      const followedAsAccount = followingAccounts.includes(person.id);
      return !followedAsUser && !followedAsAccount;
    });
  }, [rawTrendingPeople, meData]);

  const [allFeed, setAllFeed] = useState<FeedReport[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [storyDetailOpen, setStoryDetailOpen] = useState(false);

  const feed = useMemo(
    () => filterFeedReports(allFeed, activeTab),
    [allFeed, activeTab],
  );

  const topStories = useMemo(
    () => filterFeedReports(allFeed, 'top').slice(0, 5),
    [allFeed],
  );

  // ── Feed + trending fetch ────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    setLoading(true);

    getFeed(30)
      .then((res) => {
        if (active && res.ok && res.data) setAllFeed(res.data.items);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });

    getTrendingPeople()
      .then((res) => {
        if (!active || !res.ok) return;
        const items: TrendingPerson[] = res.data?.items ?? [];
        const enriched = items.map((p) => ({ ...p, followUserId: p.claimedBy ?? null }));
        if (active) setRawTrendingPeople(enriched);
      })
      .catch(() => undefined);

    return () => { active = false; };
  }, []);

  // ── /me polling ─────────────────────────────────────────────────────────
  const loadMe = useCallback(async () => {
    try {
      const res = await getDashboardMe();
      if (!res.ok || !res.data) return;
      setMeData(res.data);
      const claimedId = res.data.claimedAccounts?.[0]?._id;
      setMyReportHref(claimedId ? `/account/${claimedId}` : '/profile');
    } catch {
      // keep current snapshot
    }
  }, []);

  useEffect(() => {
    loadMe();
    const interval = window.setInterval(loadMe, 15_000);
    const onFocus = () => loadMe();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadMe();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadMe]);

  // ── Derived values ────────────────────────────────────────────────────────
  const visibleFeed = useMemo(() => {
    const cleaned = query.trim().toLowerCase();
    if (!cleaned) return feed;
    return feed.filter((r) =>
      `${r.description} ${r.account?.display_name ?? ''} ${r.account?.handle ?? ''}`.toLowerCase().includes(cleaned)
    );
  }, [feed, query]);

  const profileDims = meData?.user ? calcProfileScores(meData.user) : [];
  const credibility = calcShoshaScore(profileDims);
  const ledgerScore = meData?.user?.score ?? 1000;
  const hasOnboarded = !!(meData?.user?.onboardingComplete || meData?.user?.name || meData?.user?.occupationRole);
  const displayName =
    meData?.user?.name ||
    firebaseUser?.displayName ||
    firebaseUser?.email?.split('@')[0] ||
    'You';

  const accountAvatar = meData?.claimedAccounts?.find((a) => {
    const av = a?.avatarUrl;
    return Boolean(av && av !== 'null' && av !== 'undefined');
  })?.avatarUrl;
  const photo = meData?.user?.photoUrl || firebaseUser?.photoURL || accountAvatar;
  const avatarUrl = photo && photo !== 'null' && photo !== 'undefined' ? photo : null;
  const showHeroAvatar = Boolean(avatarUrl && !heroImgError);

  const scoreLabel = 'Shosha Score';
  const scoreContext = hasOnboarded
    ? 'Calculated from your profile dimensions and reported events'
    : 'Complete your profile to start building your Shosha Score';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen overflow-x-clip bg-background safe-bottom">
    

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

              {/* Row 1: Avatar + Name */}
              <div className="flex items-center gap-4">
                <Link
                  to="/profile"
                  aria-label="Go to profile"
                  className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted shadow-sm transition-opacity hover:opacity-80"
                >
                  {avatarUrl && (
                    <img
                      key={avatarUrl}
                      src={avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={() => setHeroImgError(true)}
                      onLoad={() => setHeroImgError(false)}
                    />
                  )}
                  <div className={cn(
                    'avatar-fallback flex h-full w-full items-center justify-center text-lg font-black',
                    showHeroAvatar && 'hidden',
                  )}>
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                </Link>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Welcome back
                  </p>
                  <h2 className="text-[20px] font-black leading-tight tracking-tight text-foreground">
                    {displayName}
                  </h2>
                </div>
              </div>

              {/* Row 2: Score + Gauge */}
              <div className="mt-8 flex items-end justify-between gap-4 sm:gap-6">
                {/* Big score number */}
                <div className="min-w-0 flex-1">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {scoreLabel}
                  </p>
                  <div className="text-[52px] font-black leading-none tabular-nums tracking-tight text-foreground sm:text-[76px]">
                    {ledgerScore.toLocaleString()}
                  </div>
                  <p className="mt-3 max-w-[240px] text-[12px] leading-[1.6] text-muted-foreground sm:text-[13px]">
                    {scoreContext}
                  </p>
                  {!hasOnboarded && (
                    <Link
                      to="/onboard"
                      className="mt-3 inline-block text-[12px] font-semibold text-foreground underline decoration-border underline-offset-4 transition-all hover:decoration-foreground"
                    >
                      Increase your credibility by completing profile
                    </Link>
                  )}
                </div>

                {/* Credibility gauge */}
                <div className="flex shrink-0 flex-col items-center gap-2 pb-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Credibility
                  </p>
                  <div className="w-[130px] sm:w-[180px]">
                    <D3ScoreGauge score={credibility} size={180} />
                  </div>
                  <p className="-mt-1 text-[13px] font-black tabular-nums text-foreground">
                    {credibility}
                    <span className="text-[10px] font-semibold text-muted-foreground"> /100</span>
                  </p>
                </div>
              </div>

              {/* Row 3: Stats + Profile link */}
              <div className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-6">
                <div className="flex gap-6">
                  <div>
                    <div className="text-[17px] font-black tabular-nums text-foreground">
                      {meData?.claimedAccounts?.length ?? 0}
                    </div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Accounts
                    </div>
                  </div>
                  {hasOnboarded && (
                    <>
                      <div className="w-px bg-border" />
                      <div>
                        <div className="text-[17px] font-black tabular-nums text-foreground">
                          {ledgerScore}
                        </div>
                        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Shosha Score
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <Link
                  to={myReportHref}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-5 py-2.5 text-[13px] font-bold text-foreground shadow-sm transition-all hover:bg-muted active:scale-95"
                >
                  My Profile <ChevronRight size={15} />
                </Link>
              </div>

            </div>
          </div>
        </motion.section>

        {/* ── Trending People Strip ────────────────────────────────────── */}
        {trendingPeople.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-4 text-[16px] font-bold text-foreground">Trending People</h2>
            <div className="horizontal-strip-scroll no-scrollbar flex gap-4 pb-4">
              {trendingPeople.map((person) => (
                <Link
                  key={person.id}
                  to={`/account/${person.id}`}
                  className="flex-shrink-0 w-[140px] rounded-[20px] border border-border bg-card p-4 text-center transition-all hover:bg-muted"
                >
                  <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full border border-border bg-muted">
                    <img src={person.avatar} alt={person.name} className="h-full w-full object-cover" />
                  </div>
                  <h3 className="truncate text-[13px] font-bold text-foreground">{person.name}</h3>
                  <p className="truncate text-[11px] text-muted-foreground">@{person.handle}</p>
                  <div className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {person.score.toLocaleString()} pts
                  </div>
                  {person.followUserId && person.followUserId !== meData?.user?._id && (
                    <div className="mt-3" onClick={(e) => e.preventDefault()}>
                      <FollowButton
                        targetUserId={person.followUserId}
                        initialFollowing={
                          meData?.user?.following?.includes(person.followUserId) ?? false
                        }
                      />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Global Top Stories Strip ─────────────────────────────────── */}
        {topStories.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-4 text-[16px] font-bold text-foreground">Global Top Stories</h2>
            <div className="horizontal-strip-scroll no-scrollbar flex gap-4 pb-4">
              {topStories.map((story) => (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => { setSelectedStoryId(story.id); setStoryDetailOpen(true); }}
                  className="flex-shrink-0 w-[280px] rounded-[20px] border border-border bg-card p-4 text-left transition-all hover:border-primary/30"
                >
                  <div className="mb-3 flex items-start gap-2.5">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                      <img
                        src={story.reporter?.photo_url || `https://api.dicebear.com/9.x/initials/svg?seed=anonymous`}
                        alt="avatar"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <div className="truncate text-[13px] font-bold text-foreground">
                        {story.reporter ? (
                          <Link
                            to={`/account/website_${story.reporter.username.replace(/^@/, '')}`}
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            @{story.reporter.username.replace(/^@/, '')}
                          </Link>
                        ) : (
                          'Anonymous'
                        )}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        reported{' '}
                        <Link
                          to={`/accounts/${story.account?.id}`}
                          className="font-semibold text-foreground hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {story.account?.display_name}
                        </Link>
                      </div>
                    </div>
                  </div>

                  <p className="mb-4 line-clamp-2 text-[14px] leading-snug text-foreground">
                    {story.description}
                  </p>

                  <div className="flex items-center justify-between border-t border-border pt-3 text-[11px] font-bold">
                    <span className={story.type === 'positive' ? 'text-green-500' : 'text-red-500'}>
                      Impact: {story.type === 'positive' ? '+' : ''}
                      {story.report_score ?? story.base_score ?? 0}
                    </span>
                    <span className="font-normal text-muted-foreground">
                      {timestamp(story.created_at)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {selectedStoryId && (
          <PostDetailModal
            reportId={selectedStoryId}
            open={storyDetailOpen}
            onClose={() => { setStoryDetailOpen(false); setSelectedStoryId(null); }}
          />
        )}

        {/* ── Feed tabs ─────────────────────────────────────────────────── */}
        <section className="mt-8">
          <h2 className="mb-4 text-[20px] font-bold text-foreground">Feed</h2>
          <div className="mb-4 rounded-2xl border border-border bg-card p-3 shadow-sm">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search feed..."
              className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-[13px] text-foreground outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
            {TABS.map((tab) => {
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

        {/* ── Feed items ────────────────────────────────────────────────── */}
        <section className="mt-4 space-y-6 pb-16">
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

          {!loading && visibleFeed.map((item) => (
            <FeedItem key={item.id} {...toFeedItem(item)} />
          ))}

          {!loading && visibleFeed.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-[24px] border border-border bg-card p-6 text-center"
            >
              {activeTab === 'following' ? (
                <>
                  <p className="text-[15px] font-bold text-foreground">No one followed yet.</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">
                    Follow accounts from their dossier to see their activity here.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[15px] font-bold text-foreground">No filings here yet.</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">
                    Create the first report to populate this view.
                  </p>
                </>
              )}
            </motion.div>
          )}
        </section>

      </div>
    </main>
  );
}
