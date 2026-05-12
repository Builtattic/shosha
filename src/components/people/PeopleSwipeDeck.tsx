'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
  animate,
  useIsPresent,
  type PanInfo,
  type MotionValue,
} from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ChevronUp,
  Globe,
  Loader2,
  Users,
  Share2,
  X,
  Check,
  Search,
  ShieldCheck,
  MapPin,
  TrendingUp,
  TrendingDown,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

export type PeopleDeckItem = {
  id: string; name: string; handle: string; avatar: string; platform: string;
  role: string; region: string; score: number; followers: string; verified: boolean;
  profileKind?: string; bio?: string; categories?: string[];
  topReports: Array<{ title: string; delta: number; type: string }>;
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

const SWIPE_DISTANCE = 118;
/** px — minimum horizontal travel before a velocity-only flick counts */
const FLICK_MIN_OFFSET = 42;
/** Framer reports velocity in px/s for drag end; keep high to avoid touch noise */
const FLICK_VELOCITY = 620;
const FILTERS = [
  { label: 'Global', icon: <Globe size={12} /> }, { label: '18-65+' },
  { label: 'All Roles' }, { label: '10K-1M+' }, { label: 'All' },
];

type SwipeCardProps = {
  item: PeopleDeckItem;
  index: number;
  exitX: number;
  exitY: number;
  visibleItems: PeopleDeckItem[];
  x: MotionValue<number>;
  y: MotionValue<number>;
  rotate: MotionValue<number>;
  nextX: MotionValue<number>;
  alignOp: MotionValue<number>;
  opposeOp: MotionValue<number>;
  opposeSc: MotionValue<number>;
  alignSc: MotionValue<number>;
  upOp: MotionValue<number>;
  showUpHint: boolean;
  setShowUpHint: (v: boolean) => void;
  handleDragEnd: (e: PointerEvent, info: PanInfo) => void;
  handleSwipe: (dir: 'align' | 'oppose') => void;
  handleShare: (card: PeopleDeckItem) => Promise<void>;
  onOpenProfile: () => void;
};

function SwipeCard(props: SwipeCardProps) {
  const isPresent = useIsPresent();
  const {
    item,
    index,
    exitX,
    exitY,
    visibleItems,
    x,
    y,
    rotate,
    nextX,
    alignOp,
    opposeOp,
    opposeSc,
    alignSc,
    upOp,
    showUpHint,
    setShowUpHint,
    handleDragEnd,
    handleSwipe,
    handleShare,
    onOpenProfile,
  } = props;

  const isCurrent = index === 0;
  /** Exit must not read shared x/y — that was freezing the next card after 1–2 swipes */
  const bindInteractive = isCurrent && isPresent;
  const showParallax = index === 1 && isPresent;

  /**
   * Pure taps never call Framer onDragEnd (drag starts only after ~3px move).
   * Open profile from pointer up when no drag session started; onDragStart marks real drags.
   */
  const tapBlockedRef = useRef(false);
  const dragEverStartedRef = useRef(false);

  const skipProfileTarget = (el: EventTarget | null): boolean =>
    !!(el instanceof Element && el.closest('button, a, input, textarea, select'));

  return (
    <motion.article
      initial={{ scale: 0.8, opacity: 0, y: 40 }}
      animate={
        isPresent
          ? {
              scale: isCurrent ? 1 : index === 1 ? 0.95 : 0.9,
              opacity: 1,
              y: isCurrent ? 0 : index === 1 ? 16 : 32,
              ...(isCurrent ? {} : { rotate: index === 1 ? 2 : -2 }),
            }
          : false
      }
      exit={{
        x: exitX,
        y: exitY,
        opacity: 0,
        scale: 0.9,
        rotate: exitX > 0 ? 15 : -15,
        transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] },
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        zIndex: 30 - index,
        ...(bindInteractive ? { x, y, rotate } : showParallax ? { x: nextX } : {}),
      }}
      {...(bindInteractive
        ? {
            drag: true,
            dragConstraints: { left: 0, right: 0, top: 0, bottom: 0 },
            dragElastic: 0.52,
            onPointerDown: (e: React.PointerEvent) => {
              if (e.pointerType === 'mouse' && e.button !== 0) return;
              tapBlockedRef.current = skipProfileTarget(e.target);
              dragEverStartedRef.current = false;
            },
            onDragStart: () => {
              dragEverStartedRef.current = true;
            },
            onPointerUp: (e: React.PointerEvent) => {
              if (e.pointerType === 'mouse' && e.button !== 0) return;
              const blocked = tapBlockedRef.current;
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  if (blocked) return;
                  if (dragEverStartedRef.current) return;
                  onOpenProfile();
                });
              });
            },
            onPointerCancel: () => {
              tapBlockedRef.current = false;
              dragEverStartedRef.current = false;
              setShowUpHint(false);
              animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 });
              animate(y, 0, { type: 'spring', stiffness: 500, damping: 35 });
            },
            onDrag: (_: PointerEvent, info: PanInfo) => setShowUpHint(info.offset.y < -35),
            onDragEnd: (e: PointerEvent, info: PanInfo) => {
              setShowUpHint(false);
              handleDragEnd(e, info);
            },
          }
        : {})}
      className="absolute inset-x-0 top-0 bottom-0 mx-auto w-full max-w-[400px] select-none overflow-hidden rounded-[32px] border border-white/10 bg-black shadow-2xl lg:max-w-[420px]"
    >
      <motion.div
        initial={false}
        animate={{ opacity: isCurrent ? 0 : index === 1 ? 0.3 : 0.6 }}
        className="pointer-events-none absolute inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300"
      />

      <motion.div
        style={{ opacity: bindInteractive ? alignOp : 0 }}
        className="pointer-events-none absolute left-5 top-12 z-50 -rotate-[20deg] rounded-2xl border-[3px] border-emerald-400 bg-emerald-400/10 px-5 py-2 backdrop-blur-sm"
        aria-hidden
      >
        <span className="text-[26px] font-black tracking-widest text-emerald-400 drop-shadow sm:text-[28px]">ALIGN</span>
      </motion.div>
      <motion.div
        style={{ opacity: bindInteractive ? opposeOp : 0 }}
        className="pointer-events-none absolute right-5 top-12 z-50 rotate-[20deg] rounded-2xl border-[3px] border-red-400 bg-red-400/10 px-5 py-2 backdrop-blur-sm"
        aria-hidden
      >
        <span className="text-[26px] font-black tracking-widest text-red-400 drop-shadow sm:text-[28px]">OPPOSE</span>
      </motion.div>

      <AnimatePresence>
        {bindInteractive && showUpHint && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-0 top-6 z-50 flex justify-center"
          >
            <motion.div
              style={{ opacity: upOp }}
              className="flex items-center gap-1.5 rounded-full bg-white/90 px-5 py-2 shadow-lg backdrop-blur"
            >
              <ChevronUp size={14} className="text-black" />
              <span className="text-[12px] font-black text-black">Open Profile</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      <div
        className={cn(
          'md:hidden absolute left-3 top-1/2 z-50 flex -translate-y-1/2 flex-col items-center transition-opacity duration-200',
          !isCurrent && 'pointer-events-none opacity-0'
        )}
      >
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSwipe('oppose');
          }}
          whileTap={{ scale: 0.85 }}
          style={{ scale: opposeSc }}
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 border-red-200/60 bg-white/90 text-red-500 shadow-xl backdrop-blur-sm pointer-events-auto"
          aria-label="Oppose"
        >
          <X size={22} strokeWidth={2.5} />
        </motion.button>
        <p className="mt-1 text-center text-[9px] font-black uppercase text-red-500 drop-shadow-md">
          Oppose
          <br />
          <span className="text-red-400">−5</span>
        </p>
      </div>
      <div
        className={cn(
          'md:hidden absolute right-3 top-1/2 z-50 flex -translate-y-1/2 flex-col items-center transition-opacity duration-200',
          !isCurrent && 'pointer-events-none opacity-0'
        )}
      >
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSwipe('align');
          }}
          whileTap={{ scale: 0.85 }}
          style={{ scale: alignSc }}
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 border-emerald-200/60 bg-white/90 text-emerald-600 shadow-xl backdrop-blur-sm pointer-events-auto"
          aria-label="Align"
        >
          <Check size={22} strokeWidth={2.5} />
        </motion.button>
        <p className="mt-1 text-center text-[9px] font-black uppercase text-emerald-600 drop-shadow-md">
          Align
          <br />
          <span className="text-emerald-500">+5</span>
        </p>
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
          <span className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="font-black">
              Impact Score {item.score != null ? compact(item.score) : '—'}
            </span>
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

        {item.bio ? (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-white/65">{item.bio}</p>
        ) : item.topReports.length > 0 ? (
          <div className="space-y-1.5">
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
                <p className="line-clamp-1 flex-1 text-[11px] font-medium text-white/85">{r.title}</p>
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
      </div>
    </motion.article>
  );
}

export function PeopleSwipeDeck({ initialItems }: { initialItems: PeopleDeckItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initialItems);
  const [activeFilter, setActiveFilter] = useState('Global');
  const [exitX, setExitX] = useState(0);
  const [exitY, setExitY] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(initialItems.length);
  const [hasMore, setHasMore] = useState(true);
  const [showUpHint, setShowUpHint] = useState(false);
  const [query, setQuery] = useState('');
  const fetchState = useRef({ loading: false, hasMore: true });

  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = normalizedQuery
    ? items.filter((item) => item.name.toLowerCase().includes(normalizedQuery) || item.handle.toLowerCase().includes(normalizedQuery))
    : items;
  const current = visibleItems[0];
  const x = useMotionValue(0), y = useMotionValue(0);
  const rotate = useTransform(x, [-260, 0, 260], [-8, 0, 8]);
  const upOp = useTransform(y, [-120, -40], [1, 0]);
  /** Stamp overlays (matches main: ramp in over drag distance) */
  const alignOp = useTransform(x, [18, 96], [0, 1]);
  const opposeOp = useTransform(x, [-96, -18], [1, 0]);
  const sx = useSpring(x, { stiffness: 400, damping: 30 });
  const alignSc = useTransform(sx, [0, 130], [1, 1.25]);
  const opposeSc = useTransform(sx, [-130, 0], [1.25, 1]);
  const nextX = useTransform(x, [-300, 0, 300], [10, 0, -10]);

  const fetchMore = useCallback(async (currentCursor: number, filterVal: string, reset: boolean = false) => {
    if (fetchState.current.loading || (!fetchState.current.hasMore && !reset)) return;
    fetchState.current.loading = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/people/deck?cursor=${currentCursor}&filter=${encodeURIComponent(filterVal)}`);
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
    fetchMore(0, activeFilter, true);
  }, [activeFilter, fetchMore]);

  useEffect(() => { 
    if (items.length <= 3 && hasMore && !loading) {
      void fetchMore(cursor, activeFilter, false); 
    }
  }, [items.length, hasMore, loading, cursor, activeFilter, fetchMore]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return;
      if (e.key === 'ArrowRight') handleSwipe('align');
      if (e.key === 'ArrowLeft') handleSwipe('oppose');
      if (e.key === 'ArrowUp') router.push(`/account/${current.id}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  /** Shared drag MVs must match the new top card — layout+animate.rotate used to fight style.rotate and leave cards stuck */
  useEffect(() => {
    x.set(0);
    y.set(0);
  }, [current?.id, x, y]);

  const handleSwipe = useCallback((dir: 'align' | 'oppose') => {
    if (!current) return;
    setExitX(dir === 'align' ? 800 : -800); 
    setExitY(-50);
    const ratedId = current.id;
    
    // Update items immediately to let AnimatePresence handle the unmount animation smoothly
    setItems((p) => p.filter((item) => item.id !== ratedId));
    x.set(0); 
    y.set(0);

    fetch(`/api/accounts/${ratedId}/swipe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ direction: dir }) })
      .then(r => r.json()).then(p => { 
        if (!p.ok) throw new Error(p.error?.message ?? 'Failed'); 
        toast.push(dir === 'align' ? '✓ Aligned! +5 to their score.' : '✗ Opposed. -5 from their score.'); 
      })
      .catch(err => toast.push(err instanceof Error ? err.message : 'Failed'));
  }, [current, toast, x, y]);

  async function handleShare(card: PeopleDeckItem) {
    const url = `${window.location.origin}/account/${card.id}`;
    const text = `Check out ${card.name}'s reputation on Shosha — score: ${card.score ?? '?'}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: card.name, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.push('Link copied to clipboard');
    } catch (error) {
      console.log('Share failed', error);
    }
  }

  function handleDragEnd(_: PointerEvent, info: PanInfo): void {
    const { offset, velocity } = info;
    const dx = offset.x;
    const dy = offset.y;
    const vx = velocity.x;
    const vy = velocity.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Prefer the axis the user actually moved on (reduces accidental swipes while scrolling / tapping)
    const horizontalDominant = absX >= absY * 0.88;
    const verticalDominant = absY > absX * 1.12;

    const committedRight =
      dx > SWIPE_DISTANCE || (dx > FLICK_MIN_OFFSET && vx > FLICK_VELOCITY);
    const committedLeft =
      dx < -SWIPE_DISTANCE || (dx < -FLICK_MIN_OFFSET && vx < -FLICK_VELOCITY);
    const committedUp =
      dy < -SWIPE_DISTANCE || (dy < -48 && vy < -FLICK_VELOCITY);

    if (horizontalDominant && committedRight) {
      handleSwipe('align');
      return;
    }
    if (horizontalDominant && committedLeft) {
      handleSwipe('oppose');
      return;
    }
    if (verticalDominant && committedUp) {
      if (current) router.push(`/account/${current.id}`);
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
      animate(y, 0, { type: 'spring', stiffness: 500, damping: 30 });
      return;
    }

    animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 });
  }

  if (!current && !loading && items.length === 0) return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="rounded-[32px] border border-border bg-card p-12 shadow-2xl">
        <div className="mb-5 flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-muted text-4xl">👥</div>
        <h2 className="text-[24px] font-black">All caught up!</h2>
        <p className="mt-2 text-[13px] text-muted-foreground">New profiles will appear here as dossiers are created.</p>
      </motion.div>
    </div>
  );

  return (
    <main className="flex h-[100dvh] min-h-0 flex-col overflow-x-hidden overflow-y-hidden bg-background lg:h-screen lg:overflow-visible">
      <div className="mx-auto flex min-h-0 w-full max-w-[520px] flex-1 flex-col items-center px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 lg:h-full lg:min-h-0 lg:pb-8 lg:pt-8">

        {/* Header */}
        <header className="mb-4 shrink-0 flex w-full items-start justify-between">
          <div>
            <h1 className="text-[24px] lg:text-[28px] font-black tracking-tight" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>
              Sho<span className="text-muted-foreground">शा</span>
            </h1>
            <p className="text-[13px] font-bold text-foreground">Discover &amp; Rate</p>
            <p className="text-[10px] text-muted-foreground/70">Swipe to align or oppose impact.</p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
          </div>
        </header>

        {/* Filters */}
        <div className="mb-4 shrink-0 flex w-full gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTERS.map(({ label, icon }) => (
            <button key={label} onClick={() => setActiveFilter(label)} className={cn(
              'shrink-0 flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] font-bold transition-all duration-300',
              activeFilter === label ? 'border-foreground bg-foreground text-background scale-[1.04] shadow-md' : 'border-border bg-card text-muted-foreground hover:bg-muted'
            )}>{icon}{label}</button>
          ))}
        </div>

        <div className="w-full max-w-sm shrink-0 px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search people..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-full border border-border bg-muted/50 py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Card stack + desktop flank CTAs (main layout) */}
        <div className="relative min-h-0 w-full flex-1 overflow-visible pb-3">
          <div className="relative flex h-full min-h-0 w-full items-center justify-center gap-0 px-1 py-2 sm:px-2 lg:gap-4">
            {current && (
              <motion.div
                style={{ scale: opposeSc }}
                className="z-10 mr-1 hidden shrink-0 flex-col items-center gap-2 md:flex lg:mr-2"
              >
                <motion.button
                  type="button"
                  onClick={() => handleSwipe('oppose')}
                  whileTap={{ scale: 0.85 }}
                  className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border-[3px] border-red-200 bg-white text-red-500 shadow-2xl shadow-red-100/40 transition-all hover:scale-105 hover:shadow-red-200/60 dark:bg-card lg:h-[72px] lg:w-[72px]"
                  aria-label="Oppose"
                >
                  <X size={28} strokeWidth={2.5} />
                </motion.button>
                <span className="text-[11px] font-black uppercase tracking-wider text-red-500">Oppose</span>
                <span className="text-[12px] font-black text-red-400/80">−5</span>
              </motion.div>
            )}

            <div
              className="relative h-full min-h-0 w-full max-w-[400px] shrink-0 lg:max-w-[420px]"
              style={{ aspectRatio: '9/14', maxHeight: 'min(62dvh, 650px)' }}
            >
            <AnimatePresence>
              {visibleItems.slice(0, 3).map((item, index) => (
                <SwipeCard
                  key={item.id}
                  item={item}
                  index={index}
                  exitX={exitX}
                  exitY={exitY}
                  visibleItems={visibleItems}
                  x={x}
                  y={y}
                  rotate={rotate}
                  nextX={nextX}
                  alignOp={alignOp}
                  opposeOp={opposeOp}
                  opposeSc={opposeSc}
                  alignSc={alignSc}
                  upOp={upOp}
                  showUpHint={showUpHint}
                  setShowUpHint={setShowUpHint}
                  handleDragEnd={handleDragEnd}
                  handleSwipe={handleSwipe}
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

            {current && (
              <motion.div
                style={{ scale: alignSc }}
                className="z-10 ml-1 hidden shrink-0 flex-col items-center gap-2 md:flex lg:ml-2"
              >
                <motion.button
                  type="button"
                  onClick={() => handleSwipe('align')}
                  whileTap={{ scale: 0.85 }}
                  className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border-[3px] border-emerald-200 bg-white text-emerald-600 shadow-2xl shadow-emerald-100/40 transition-all hover:scale-105 hover:shadow-emerald-200/60 dark:bg-card lg:h-[72px] lg:w-[72px]"
                  aria-label="Align"
                >
                  <Check size={28} strokeWidth={2.5} />
                </motion.button>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600">Align</span>
                <span className="text-[12px] font-black text-emerald-500/80">+5</span>
              </motion.div>
            )}
          </div>

          {current && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="mx-auto mt-3 w-full max-w-[420px] shrink-0 px-1"
            >
              <div className="flex items-stretch overflow-hidden rounded-2xl border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <div className="flex flex-1 items-center justify-center gap-2.5 border-r border-border px-4 py-3.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-red-300 text-red-500">
                    <X size={14} strokeWidth={2.5} />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-foreground">Left swipe = Oppose</p>
                    <p className="text-[10px] font-bold text-red-500">−5 Rating</p>
                  </div>
                </div>
                <div className="flex flex-1 items-center justify-center gap-2.5 px-4 py-3.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-300 text-emerald-600">
                    <Check size={14} strokeWidth={2.5} />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-foreground">Right swipe = Align</p>
                    <p className="text-[10px] font-bold text-emerald-600">+5 Rating &amp; Follow</p>
                  </div>
                </div>
              </div>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/55">
                <Lock size={11} />
                This action is public and the user will be notified.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}
