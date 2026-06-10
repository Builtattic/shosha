import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ChevronsRight,
  ChevronDown,
  Share2,
  X,
  Check,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { getPeopleDeck, swipePerson } from '@/api/people';
import type { DeckItem } from '@/types/people';

export type { DeckItem };

const PLATFORM_OPTIONS = ['Any', 'X', 'Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Website'] as const;
const SCORE_OPTIONS = [
  { label: 'Any', value: 'Any' },
  { label: 'Rising', value: 'trending' },
  { label: 'Under Fire', value: 'underfire' },
  { label: 'Elite', value: 'elite' },
] as const;

type DeckFilters = {
  platform: string;
  score_filter: string;
};

const DEFAULT_FILTERS: DeckFilters = {
  platform: 'Any',
  score_filter: 'Any',
};

function displayName(item: DeckItem): string {
  return item.display_name ?? item.handle;
}

function avatarLetter(item: DeckItem): string {
  const name = displayName(item);
  return name.charAt(0).toUpperCase() || '?';
}

function compact(v: number) {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString();
}

type SwipeCardProps = {
  item: DeckItem;
  index: number;
  exitDir: 'align' | 'oppose' | 'skip' | null;
  visibleItems: DeckItem[];
  handleShare: (card: DeckItem) => Promise<void>;
  onOpenProfile: () => void;
};

function SwipeCard({
  item,
  index,
  exitDir,
  visibleItems,
  handleShare,
  onOpenProfile,
}: SwipeCardProps) {
  const isCurrent = index === 0;
  const name = displayName(item);

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

      <div className="absolute inset-0 z-0 flex items-center justify-center bg-gradient-to-br from-primary/30 via-muted to-background">
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/20 text-5xl font-black text-white ring-4 ring-white/20">
          {avatarLetter(item)}
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black via-black/35 to-black/25"
        aria-hidden
      />

      <div className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-xl">
            {item.platform}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void handleShare(item);
            }}
            className="relative z-50 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/70 backdrop-blur-xl transition-colors hover:text-white"
            aria-label={`Share ${name}`}
          >
            <Share2 size={13} />
          </button>
        </div>
        <span className="flex items-center gap-1 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-xl">
          <MapPin size={10} />
          Global
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30 p-5">
        <div className="mb-1.5 flex items-center gap-2">
          <h2 className="truncate text-[26px] font-black leading-tight text-white drop-shadow-lg sm:text-[28px]">
            {name}
          </h2>
        </div>
        <p className="mb-1.5 text-[13px] font-medium text-white/55">@{item.handle}</p>

        <div className="mb-3 flex flex-wrap items-center gap-3 text-[13px] text-white/80">
          <span className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="font-black">Impact Score {compact(item.score)}</span>
          </span>
        </div>

        {item.bio ? (
          <p className="line-clamp-3 text-[13px] leading-relaxed text-white/65">{item.bio}</p>
        ) : null}

        <div className="mt-3 flex justify-center gap-1.5">
          {visibleItems.slice(0, 5).map((d) => (
            <div
              key={d.id}
              className={cn(
                'h-[6px] rounded-full transition-all duration-300',
                d.id === item.id ? 'w-5 bg-white' : 'w-[6px] bg-white/30',
              )}
            />
          ))}
        </div>
        <p className="mt-2 pb-1 text-center text-[10px] text-white/40">Tap card to view profile</p>
      </div>
    </motion.article>
  );
}

export default function PeopleSwipeDeck({ initialItems }: { initialItems: DeckItem[] }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState(initialItems);
  const [filters, setFilters] = useState<DeckFilters>(DEFAULT_FILTERS);
  const [openDropdown, setOpenDropdown] = useState<'platform' | 'score' | null>(null);
  const [exitDir, setExitDir] = useState<'align' | 'oppose' | 'skip' | null>(null);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(initialItems.length);
  const [hasMore, setHasMore] = useState(true);
  const [limitReached, setLimitReached] = useState(false);
  const [swipeFeedback, setSwipeFeedback] = useState<{
    primary: string;
    secondary: string;
    className: string;
  } | null>(null);
  const fetchState = useRef({ loading: false, hasMore: true });

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

  const buildApiFilters = useCallback((f: DeckFilters) => {
    const apiFilters: { platform?: string; score_filter?: string; limit?: number } = { limit: 8 };
    if (f.platform !== 'Any') apiFilters.platform = f.platform;
    if (f.score_filter !== 'Any') apiFilters.score_filter = f.score_filter;
    return apiFilters;
  }, []);

  const fetchMore = useCallback(
    async (currentCursor: number, currentFilters: DeckFilters, reset = false) => {
      if (fetchState.current.loading || (!fetchState.current.hasMore && !reset)) return;
      fetchState.current.loading = true;
      setLoading(true);
      try {
        const payload = await getPeopleDeck(currentCursor, buildApiFilters(currentFilters));
        if (payload.items?.length) {
          setItems((p) => (reset ? payload.items : [...p, ...payload.items]));
          setCursor(payload.next_cursor);
          setHasMore(payload.has_more);
          fetchState.current.hasMore = payload.has_more;
        } else if (reset) {
          setItems([]);
          setHasMore(false);
          fetchState.current.hasMore = false;
        } else {
          setHasMore(false);
          fetchState.current.hasMore = false;
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
        fetchState.current.loading = false;
      }
    },
    [buildApiFilters],
  );

  useEffect(() => {
    setCursor(0);
    setHasMore(true);
    fetchState.current.hasMore = true;
    void fetchMore(0, filters, true);
  }, [filters, fetchMore]);

  useEffect(() => {
    if (items.length <= 3 && hasMore && !loading) {
      void fetchMore(cursor, filters, false);
    }
  }, [items.length, hasMore, loading, cursor, filters, fetchMore]);

  const handleSwipe = useCallback(
    (dir: 'align' | 'oppose') => {
      if (!current || limitReached) return;
      const rated = current;
      const ratedId = rated.id;
      const apiDir = dir === 'align' ? 'ALIGN' : 'OPPOSE';

      setExitDir(dir);
      setItems((p) => p.filter((item) => item.id !== ratedId));

      void swipePerson(ratedId, apiDir)
        .then((data) => {
          showSwipeFeedback(dir, data.new_account_score);
        })
        .catch((err) => {
          if (axios.isAxiosError(err) && err.response?.status === 429) {
            setLimitReached(true);
            toast.push("You've reached your swipe limit for today. Come back tomorrow!");
            return;
          }
          const message = err instanceof Error ? err.message : 'Failed';
          toast.push(message);
        });
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current || limitReached) return;
      if (e.key === 'ArrowRight') handleSwipe('align');
      if (e.key === 'ArrowLeft') handleSwipe('oppose');
      if (e.key === 'ArrowUp') navigate(`/accounts/${current.id}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, limitReached, handleSwipe, navigate]);

  async function handleShare(card: DeckItem) {
    const name = displayName(card);
    const url = `${window.location.origin}/accounts/${card.id}`;
    const text = `Check out ${name}'s reputation on Shosha — score: ${card.score ?? '?'}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: name, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.push('Link copied to clipboard');
    } catch {
      toast.push('Could not share link');
    }
  }

  const hasActiveFilter = filters.platform !== 'Any' || filters.score_filter !== 'Any';

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
          <div className="mb-5 mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted text-4xl">
            👥
          </div>
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
      <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-[520px] flex-1 flex-col px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-2 lg:h-full lg:max-h-full lg:min-h-0 lg:pb-2 lg:pt-2">
        <div className="relative z-30 w-full shrink-0 bg-background pb-2 lg:pb-1">
          <div className="flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(['platform', 'score'] as const).map((key) => {
              const isPlatform = key === 'platform';
              const value = isPlatform ? filters.platform : filters.score_filter;
              const label = isPlatform ? 'Platform' : 'Score';
              const isActive = value !== 'Any';
              const isOpen = openDropdown === key;
              const options = isPlatform
                ? PLATFORM_OPTIONS
                : SCORE_OPTIONS.map((o) => o.label);
              const optionValues = isPlatform
                ? PLATFORM_OPTIONS
                : SCORE_OPTIONS.map((o) => o.value);

              return (
                <div key={key} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(isOpen ? null : key)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap transition-colors',
                      isActive
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {label}
                    {isActive && (
                      <span className="text-[10px]">
                        · {isPlatform ? value : SCORE_OPTIONS.find((o) => o.value === value)?.label ?? value}
                      </span>
                    )}
                    <ChevronDown
                      size={12}
                      className={cn('transition-transform', isOpen && 'rotate-180')}
                    />
                  </button>
                  {isOpen && (
                    <div className="absolute left-0 top-full z-[60] mt-1 min-w-[140px] overflow-hidden rounded-xl border border-border bg-background shadow-lg">
                      {options.map((opt, i) => {
                        const optVal = optionValues[i];
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setFilters((prev) =>
                                isPlatform
                                  ? { ...prev, platform: optVal }
                                  : { ...prev, score_filter: optVal },
                              );
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              'flex w-full items-center px-4 py-2.5 text-left text-[13px]',
                              value === optVal
                                ? 'bg-foreground font-bold text-background'
                                : 'text-muted-foreground hover:bg-muted',
                            )}
                          >
                            {opt}
                          </button>
                        );
                      })}
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

        <div className="relative z-0 flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          {limitReached && (
            <div className="shrink-0 border-b border-border bg-muted/80 px-4 py-2.5 text-center text-sm text-muted-foreground">
              You&apos;ve reached your swipe limit for today. Come back tomorrow!
            </div>
          )}
          {current && (
            <div className="w-full shrink-0 px-2 pb-0.5 text-center lg:pb-0">
              <p className="text-[13px] font-semibold leading-tight text-muted-foreground lg:text-[12px]">
                Is <span className="font-bold text-foreground">{displayName(current)}</span> better
                than you?
              </p>
            </div>
          )}
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-1 py-0 sm:px-2">
            <div className="relative mx-auto h-full max-h-full min-h-0 w-auto max-w-[400px] shrink-0 aspect-[9/14] lg:max-w-sm">
              <AnimatePresence>
                {visibleItems.slice(0, 3).map((item, index) => (
                  <SwipeCard
                    key={item.id}
                    item={item}
                    index={index}
                    exitDir={exitDir}
                    visibleItems={visibleItems}
                    handleShare={handleShare}
                    onOpenProfile={() => navigate(`/accounts/${item.id}`)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {current && (
            <div className="flex shrink-0 items-center justify-center gap-4 pb-0 pt-1 lg:gap-3 lg:pt-0.5">
              <motion.button
                type="button"
                whileTap={{ scale: limitReached ? 1 : 0.93 }}
                disabled={limitReached}
                onClick={() => {
                  if (limitReached) return;
                  setExitDir('oppose');
                  handleSwipe('oppose');
                }}
                className={cn(
                  'flex flex-col items-center gap-1.5 lg:gap-1',
                  limitReached && 'cursor-not-allowed opacity-40',
                )}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-destructive/40 bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20 active:bg-destructive/30 lg:h-14 lg:w-14">
                  <X size={26} strokeWidth={2.5} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-destructive/70 lg:text-[10px]">
                  Not Better
                </span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.93 }}
                onClick={handleSkip}
                className="flex flex-col items-center gap-1.5 lg:gap-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-colors hover:bg-muted/80 lg:h-10 lg:w-10">
                  <ChevronsRight size={20} strokeWidth={2} />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
                  Skip
                </span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: limitReached ? 1 : 0.93 }}
                disabled={limitReached}
                onClick={() => {
                  if (limitReached) return;
                  setExitDir('align');
                  handleSwipe('align');
                }}
                className={cn(
                  'flex flex-col items-center gap-1.5 lg:gap-1',
                  limitReached && 'cursor-not-allowed opacity-40',
                )}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-400/40 bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 active:bg-emerald-500/30 lg:h-14 lg:w-14">
                  <Check size={26} strokeWidth={2.5} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600/70 lg:text-[10px]">
                  Better
                </span>
              </motion.button>
            </div>
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
