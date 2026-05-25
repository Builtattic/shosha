'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  motion,
  AnimatePresence,
} from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ChevronsRight,
  ChevronDown,
  Users,
  Share2,
  X,
  Check,
  ShieldCheck,
  MapPin,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

export type PeopleDeckItem = {
  id: string; name: string; handle: string; avatar: string; platform: string;
  role: string; region: string; score: number; followers: string; verified: boolean;
  profileKind?: string; bio?: string; categories?: string[];
  topReports: Array<{ title: string; delta: number; type: string }>;
  followUserId?: string | null;
  weekDelta?: number | null;
};

function compact(v: number) {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString();
}
function compactFollowers(raw: string | number | undefined): string {
  if (!raw) return '—';
  const n = typeof raw === 'string' ? parseFloat(raw.replace(/[^0-9.]/g, '')) : raw;
  return isNaN(n) ? String(raw) : compact(n);
}

const FILTER_OPTIONS = {
  location: ['Any', 'Global', 'Asia', 'Europe', 'Americas', 'Middle East', 'Africa', 'South Asia'],
  followers: ['Any', '10K+', '100K+', '1M+', '10M+', '100M+'],
  role: ['Any', 'Public Figure', 'Founder', 'Politician', 'Athlete', 'Actor', 'Musician', 'Business'],
  category: ['Any', 'Tech', 'Politics', 'Entertainment', 'Sports', 'Business', 'Media', 'Science'],
  score: ['Any', 'Rising', 'Under Fire', 'Elite'],
} as const;

const FILTER_LABELS: Record<keyof typeof FILTER_OPTIONS, string> = {
  location: 'Location',
  followers: 'Followers',
  role: 'Role',
  category: 'Category',
  score: 'Score',
};

type DeckFilters = {
  location: string;
  followers: string;
  role: string;
  category: string;
  score: string;
};

const DEFAULT_FILTERS: DeckFilters = {
  location: 'Any',
  followers: 'Any',
  role: 'Any',
  category: 'Any',
  score: 'Any',
};

function buildParamsFromFilters(f: DeckFilters): Record<string, string> {
  const p: Record<string, string> = {};

  if (f.location !== 'Any') p.region = f.location;

  const reachMap: Record<string, string> = {
    '10K+': '10K-1M+',
    '100K+': '100K+',
    '1M+': '1M+',
    '10M+': '10M+',
    '100M+': '100M+',
  };
  if (f.followers !== 'Any') p.reach = reachMap[f.followers] ?? f.followers;

  if (f.role !== 'Any') p.role = f.role;

  if (f.category !== 'Any') p.category = f.category;

  if (f.score === 'Rising') p.scoreFilter = 'trending';
  if (f.score === 'Under Fire') p.scoreFilter = 'underfire';
  if (f.score === 'Elite') p.scoreFilter = 'elite';

  return p;
}

function buildDeckUrl(params: Record<string, string>, cursor: number): string {
  const base = `/api/people/deck?cursor=${cursor}`;
  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return qs ? `${base}&${qs}` : base;
}

type SwipeCardProps = {
  item: PeopleDeckItem;
  index: number;
  exitDir: 'align' | 'oppose' | 'skip' | null;
  visibleItems: PeopleDeckItem[];
  handleShare: (card: PeopleDeckItem) => Promise<void>;
  onOpenProfile: () => void;
};

function SwipeCard(props: SwipeCardProps) {
  const {
    item,
    index,
    exitDir,
    visibleItems,
    handleShare,
    onOpenProfile,
  } = props;

  const isCurrent = index === 0;

  const skipProfileTarget = (el: EventTarget | null): boolean =>
    !!(el instanceof Element && el.closest('button, a, input, textarea, select'));

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        x: exitDir === 'align' ? 600 : exitDir === 'oppose' ? -600 : 0,
        opacity: 0,
        scale: 0.85,
        transition: { duration: 0.3 },
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{ zIndex: 30 - index }}
      onClick={(e) => {
        if (!isCurrent) return;
        if (skipProfileTarget(e.target)) return;
        onOpenProfile();
      }}
      className={cn(
        'absolute inset-x-0 top-0 bottom-0 mx-auto w-full select-none overflow-hidden rounded-[32px] border border-white/10 bg-black shadow-2xl',
        'max-w-[400px] lg:max-w-sm',
        isCurrent && 'cursor-pointer',
        index === 1 && 'scale-[0.95] translate-y-3 opacity-70',
        index === 2 && 'scale-[0.90] translate-y-6 opacity-40',
      )}
    >
      <motion.div
        initial={false}
        animate={{ opacity: isCurrent ? 0 : index === 1 ? 0.3 : 0.6 }}
        className="pointer-events-none absolute inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300"
      />

      <img
        src={item.avatar}
        alt={item.name}
        className="absolute inset-0 z-0 h-full w-full object-cover"
        draggable={false}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[8] bg-gradient-to-b from-amber-900/55 via-transparent to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black via-black/35 to-black/25"
        aria-hidden
      />

      <div className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-xl">
            <ShieldCheck size={11} className="text-white/80" />
            {item.role || 'Public Figure'}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void handleShare(item);
            }}
            className="relative z-50 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/70 backdrop-blur-xl transition-colors hover:text-white"
            aria-label={`Share ${item.name}`}
          >
            <Share2 size={13} />
          </button>
        </div>
        <span className="flex items-center gap-1 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-xl">
          <MapPin size={10} />
          {item.region || 'Global'}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30 p-5">
        <div className="mb-1.5 flex items-center gap-2">
          <h2 className="truncate text-[26px] font-black leading-tight text-white drop-shadow-lg sm:text-[28px]">{item.name}</h2>
          {item.verified && <ShieldCheck size={20} className="shrink-0 text-blue-400 drop-shadow" />}
        </div>
        <p className="mb-1.5 text-[13px] font-medium text-white/55">@{item.handle}</p>
        {item.bio && <p className="mb-2 text-[12px] text-white/60">{item.role || 'Public Figure'}</p>}

        <div className="mb-3 flex flex-wrap items-center gap-3 text-[13px] text-white/80">
          <span className="flex items-center gap-1.5">
            <Users size={14} className="text-white/50" />
            <span className="font-black">{compactFollowers(item.followers)}</span>
            <span className="text-white/40">Followers</span>
          </span>
          <span className="text-white/20">|</span>
          <span className="flex flex-wrap items-center gap-1.5">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="font-black">
              Impact Score {item.score != null ? compact(item.score) : '—'}
            </span>
            {item.weekDelta != null && (
              <span
                className={cn(
                  'text-[11px] font-bold',
                  item.weekDelta >= 0 ? 'text-emerald-400' : 'text-red-400',
                )}
              >
                {item.weekDelta >= 0 ? '+' : ''}
                {Math.round(item.weekDelta)} this week
              </span>
            )}
          </span>
        </div>

        {item.categories && item.categories.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {item.categories.slice(0, 3).map((c) => (
              <span
                key={c}
                className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white/90 ring-1 ring-white/10 backdrop-blur-sm"
              >
                {c}
              </span>
            ))}
            {item.categories.length > 3 && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white/50">
                +{item.categories.length - 3}
              </span>
            )}
          </div>
        )}

        {item.bio ? <p className="line-clamp-3 text-[13px] leading-relaxed text-white/65">{item.bio}</p> : null}
        {item.topReports.length > 0 ? (
          <div className={cn('space-y-1.5', item.bio ? 'mt-2' : '')}>
            {item.topReports.slice(0, 2).map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 ring-1 ring-white/5 backdrop-blur-md"
              >
                {r.delta >= 0 ? (
                  <TrendingUp size={11} className="shrink-0 text-emerald-400" />
                ) : (
                  <TrendingDown size={11} className="shrink-0 text-red-400" />
                )}
                <p className="line-clamp-2 flex-1 text-[11px] font-medium text-white/85">{r.title}</p>
                <span
                  className={cn(
                    'shrink-0 text-[11px] font-black',
                    r.delta >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}
                >
                  {r.delta > 0 ? '+' : ''}
                  {Math.round(r.delta)}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex justify-center gap-1.5">
          {visibleItems.slice(0, 5).map((d) => (
            <div
              key={d.id}
              className={cn(
                'h-[6px] rounded-full transition-all duration-300',
                d.id === item.id ? 'w-5 bg-white' : 'w-[6px] bg-white/30'
              )}
            />
          ))}
        </div>
        <p className="mt-2 pb-1 text-center text-[10px] text-white/40">Tap card to view profile</p>
      </div>
    </motion.article>
  );
}

export function PeopleSwipeDeck({ initialItems }: { initialItems: PeopleDeckItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initialItems);
  const [filters, setFilters] = useState<DeckFilters>(DEFAULT_FILTERS);
  const [openDropdown, setOpenDropdown] = useState<keyof typeof FILTER_OPTIONS | null>(null);
  const [dropdownAnchor, setDropdownAnchor] = useState<{ left: number; top: number; minWidth: number } | null>(null);
  const [exitDir, setExitDir] = useState<'align' | 'oppose' | 'skip' | null>(null);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(initialItems.length);
  const [hasMore, setHasMore] = useState(true);
  const [limitReached, setLimitReached] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState<{ count: number; limit: number } | null>(null);
  const [swipeFeedback, setSwipeFeedback] = useState<{
    primary: string;
    secondary: string;
    className: string;
  } | null>(null);
  const fetchState = useRef({ loading: false, hasMore: true });
  const filterBarRef = useRef<HTMLDivElement>(null);

  const showSwipeFeedback = useCallback((dir: 'align' | 'oppose', updatedScore?: number | null) => {
    const secondary =
      updatedScore != null
        ? `Score now ${updatedScore.toLocaleString()} pts`
        : dir === 'align'
          ? 'Reputation increased'
          : 'Reputation decreased';

    setSwipeFeedback({
      primary: dir === 'align' ? '+ Better' : '− Not Better',
      secondary,
      className:
        dir === 'align'
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-red-600 dark:text-red-400',
    });
    window.setTimeout(() => setSwipeFeedback(null), 1800);
  }, []);

  const visibleItems = useMemo(() => items, [items]);
  const current = visibleItems[0];

  const fetchMore = useCallback(async (
    currentCursor: number,
    currentFilters: DeckFilters,
    reset: boolean = false,
  ) => {
    if (fetchState.current.loading || (!fetchState.current.hasMore && !reset)) return;
    fetchState.current.loading = true;
    setLoading(true);
    try {
      const res = await fetch(buildDeckUrl(buildParamsFromFilters(currentFilters), currentCursor));
      const data = await res.json();
      const payload = data.ok ? data.data : undefined;
      if (payload?.items?.length) {
        setItems((p) => (reset ? payload.items : [...p, ...payload.items]));
        setCursor(payload.nextCursor);
        setHasMore(payload.hasMore);
        fetchState.current.hasMore = payload.hasMore;
      } else if (reset) {
        if (data.ok && payload && Array.isArray(payload.items) && payload.items.length === 0) {
          setItems([]);
        }
        setHasMore(false);
        fetchState.current.hasMore = false;
      } else {
        setHasMore(false);
        fetchState.current.hasMore = false;
      }
    } catch {} finally { 
      setLoading(false); 
      fetchState.current.loading = false;
    }
  }, []);

  useEffect(() => {
    setCursor(0);
    setHasMore(true);
    fetchState.current.hasMore = true;
    fetchMore(0, filters, true);
  }, [filters, fetchMore]);

  useEffect(() => { 
    if (items.length <= 3 && hasMore && !loading) {
      void fetchMore(cursor, filters, false); 
    }
  }, [items.length, hasMore, loading, cursor, filters, fetchMore]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current || limitReached) return;
      if (e.key === 'ArrowRight') handleSwipe('align');
      if (e.key === 'ArrowLeft') handleSwipe('oppose');
      if (e.key === 'ArrowUp') router.push(`/account/${current.id}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, limitReached]);

  useEffect(() => {
    if (!openDropdown) return;
    const closeAll = () => {
      setOpenDropdown(null);
      setDropdownAnchor(null);
    };
    const handler = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (filterBarRef.current && target && filterBarRef.current.contains(target)) return;
      // Clicks on the fixed dropdown panel live outside filterBarRef — check via data-attribute.
      if (target instanceof Element && target.closest('[data-deck-dropdown="true"]')) return;
      closeAll();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    // Close on any scroll (including the horizontal filter scroller) so the fixed panel never drifts off its pill.
    window.addEventListener('scroll', closeAll, true);
    window.addEventListener('resize', closeAll);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', closeAll, true);
      window.removeEventListener('resize', closeAll);
    };
  }, [openDropdown]);

  const handleSwipe = useCallback(
    (dir: 'align' | 'oppose') => {
      if (!current || limitReached) return;
      const rated = current;
      const ratedId = rated.id;

      setExitDir(dir);

      setItems((p) => p.filter((item) => item.id !== ratedId));

      void fetch(`/api/accounts/${ratedId}/swipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: dir }),
      })
        .then(async (r) => {
          const data = await r.json();
          if (
            !data.ok &&
            (r.status === 429 || data.error?.code === 'rate_limited')
          ) {
            setLimitReached(true);
            toast.push(
              "You've reached your 25 swipe limit for today. Come back tomorrow!",
            );
            return;
          }
          if (!data.ok) throw new Error(data.error?.message ?? 'Failed');
          const updatedScore = data?.data?.score ?? null;
          showSwipeFeedback(dir, updatedScore);
          if (data?.data?.todaySwipeCount) {
            setSwipeProgress({
              count: data.data.todaySwipeCount,
              limit: data.data.dailyLimit ?? 25,
            });
          }
          if (data?.data?.swiperBonusAwarded) {
            const userScore = data?.data?.userScore;
            toast.push(
              userScore != null
                ? `+5 swipe milestone! Your score is now ${Number(userScore).toLocaleString()} pts`
                : '+5 swipe milestone bonus added to your score!',
            );
            window.dispatchEvent(new CustomEvent('shosha:score-updated'));
          }
        })
        .catch((err) => toast.push(err instanceof Error ? err.message : 'Failed'));
    },
    [current, limitReached, toast, showSwipeFeedback],
  );

  function handleSkip() {
    if (!current) return;
    setExitDir('skip');
    setItems((p) => p.filter((item) => item.id !== current.id));
    if (items.length <= 3 && hasMore && !loading) {
      void fetchMore(cursor, filters, false);
    }
  }

  async function handleShare(card: PeopleDeckItem) {
    const url = `${window.location.origin}/account/${card.id}`;
    const text = `Check out ${card.name}'s reputation on Shosha — score: ${card.score ?? '?'}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: card.name, text, url });
        return;
      } catch (error) {
        // User dismissed the native share sheet — not an error worth surfacing.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Share failed', error);
        // Fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.push('Link copied to clipboard');
    } catch (error) {
      console.error('Clipboard write failed', error);
      toast.push('Could not share link');
    }
  }

  const hasActiveFilter = Object.values(filters).some((v) => v !== 'Any');

  if (!current && !loading && items.length === 0) {
    const emptyTitle = hasActiveFilter ? 'No profiles match these filters' : 'All caught up!';
    const emptyBody = hasActiveFilter
      ? 'Try clearing some filters to see more profiles.'
      : 'New profiles will appear as dossiers are created.';
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="rounded-[32px] border border-border bg-card p-12 shadow-2xl"
        >
          <div className="mb-5 mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted text-4xl">👥</div>
          <h2 className="text-[24px] font-black">{emptyTitle}</h2>
          <p className="text-muted-foreground mt-2 text-center text-sm">{emptyBody}</p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-foreground hover:bg-muted mt-4 rounded-full border border-border px-5 py-2 text-sm font-medium transition-colors"
            >
              Clear all filters
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <main className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-[520px] flex-1 flex-col px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-2 lg:h-full lg:min-h-0 lg:pb-6 lg:pt-4">

        {/* Top chrome above the deck: z-30 + bg so dragged cards (transform y) stay underneath and do not cover filters. */}
        <div ref={filterBarRef} className="relative z-30 w-full shrink-0 bg-background pb-2">
          <div className="flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(Object.keys(FILTER_OPTIONS) as Array<keyof typeof FILTER_OPTIONS>).map((key) => {
              const value = filters[key];
              const isActive = value !== 'Any';
              const isOpenForKey = openDropdown === key;
              return (
                <div key={key} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      if (openDropdown === key) {
                        setOpenDropdown(null);
                        setDropdownAnchor(null);
                        return;
                      }
                      const rect = e.currentTarget.getBoundingClientRect();
                      setDropdownAnchor({
                        left: rect.left,
                        top: rect.bottom + 4,
                        minWidth: Math.max(rect.width, 140),
                      });
                      setOpenDropdown(key);
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap transition-colors',
                      isActive
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {FILTER_LABELS[key]}
                    {isActive && <span className="text-[10px]">· {value}</span>}
                    <ChevronDown
                      size={12}
                      className={cn('transition-transform', isOpenForKey && 'rotate-180')}
                    />
                  </button>

                  {isOpenForKey && dropdownAnchor && (
                    <div
                      data-deck-dropdown="true"
                      style={{
                        position: 'fixed',
                        left: dropdownAnchor.left,
                        top: dropdownAnchor.top,
                        minWidth: dropdownAnchor.minWidth,
                      }}
                      className="z-[60] overflow-hidden rounded-xl border border-border bg-background shadow-lg"
                    >
                      {FILTER_OPTIONS[key].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setFilters((prev) => ({ ...prev, [key]: opt }));
                            setOpenDropdown(null);
                            setDropdownAnchor(null);
                          }}
                          className={cn(
                            'flex w-full items-center px-4 py-2.5 text-left text-[13px]',
                            value === opt
                              ? 'bg-foreground font-bold text-background'
                              : 'text-muted-foreground hover:bg-muted',
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="shrink-0 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Card stack + actions: column flex so buttons never sit below clipped overflow */}
        <div className="relative z-0 flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          {limitReached && (
            <div className="shrink-0 border-b border-border bg-muted/80 px-4 py-2.5 text-center text-sm text-muted-foreground">
              You&apos;ve reached your 25 swipe limit for today. Come back tomorrow!
            </div>
          )}
          {current && (
            <div className="w-full shrink-0 px-2 pb-1 text-center">
              <p className="text-[13px] font-semibold text-muted-foreground">
                Are you better than{' '}
                <span className="font-bold text-foreground">{current.name}</span>?
              </p>
            </div>
          )}
          <div className="flex min-h-0 flex-1 items-center justify-center px-1 py-1 sm:px-2">
            <div
              className="relative mx-auto h-auto w-full max-h-full min-h-0 max-w-[400px] shrink lg:max-w-sm"
              style={{ aspectRatio: '9/14' }}
            >
              <AnimatePresence>
                {visibleItems.slice(0, 3).map((item, index) => (
                  <SwipeCard
                    key={item.id}
                    item={item}
                    index={index}
                    exitDir={exitDir}
                    visibleItems={visibleItems}
                    handleShare={handleShare}
                    onOpenProfile={() => router.push(`/account/${item.id}`)}
                  />
                ))}
              </AnimatePresence>
              {!current && items.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
                  <div className="rounded-3xl border border-border bg-card/80 px-6 py-8">
                    <p className="text-sm font-semibold text-foreground">No matches found.</p>
                    <p className="mt-1 text-xs text-muted-foreground">Try another name or username.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {current && (
            <div className="flex shrink-0 items-center justify-center gap-4 pb-1 pt-2">
              <motion.button
                whileTap={{ scale: limitReached ? 1 : 0.93 }}
                disabled={limitReached}
                onClick={() => {
                  if (limitReached) return;
                  setExitDir('oppose');
                  handleSwipe('oppose');
                }}
                className={cn(
                  'flex flex-col items-center gap-2',
                  limitReached && 'cursor-not-allowed opacity-40',
                )}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-destructive/40 bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20 active:bg-destructive/30">
                  <X size={26} strokeWidth={2.5} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-destructive/70">Not Better</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={handleSkip}
                className="flex flex-col items-center gap-2"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-colors hover:bg-muted/80">
                  <ChevronsRight size={20} strokeWidth={2} />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">Skip</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: limitReached ? 1 : 0.93 }}
                disabled={limitReached}
                onClick={() => {
                  if (limitReached) return;
                  setExitDir('align');
                  handleSwipe('align');
                }}
                className={cn(
                  'flex flex-col items-center gap-2',
                  limitReached && 'cursor-not-allowed opacity-40',
                )}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-400/40 bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 active:bg-emerald-500/30">
                  <Check size={26} strokeWidth={2.5} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600/70">Better</span>
              </motion.button>
            </div>
          )}
          {swipeProgress && (
            <p className="pb-2 text-center text-[11px] text-muted-foreground">
              {swipeProgress.count}/{swipeProgress.limit} swipes today
              {swipeProgress.count % 10 !== 0 && (
                <span> · next bonus in {10 - (swipeProgress.count % 10)}</span>
              )}
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {swipeFeedback && (
          <motion.div
            key="swipe-feedback"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed top-1/3 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-border bg-background px-5 py-2 text-sm font-bold shadow-lg',
              swipeFeedback.className,
            )}
          >
            <div className="flex flex-col items-center text-center">
              <span>{swipeFeedback.primary}</span>
              <span className="text-xs font-medium opacity-90">{swipeFeedback.secondary}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
