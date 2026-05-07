'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
  animate,
} from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Bell,
  ChevronUp,
  Globe,
  SlidersHorizontal,
  Loader2,
  ShieldCheck,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  ArrowRight,
  Lock,
  Link2,
} from 'lucide-react';
import { cn, formatPlatform } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

export type PeopleDeckItem = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  platform: string;
  role: string;
  region: string;
  score: number;
  followers: string;
  verified: boolean;
  profileKind?: string;
  bio?: string;
  categories?: string[];
  topReports: Array<{ title: string; delta: number; type: 'positive' | 'negative' | string }>;
};

function compact(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function compactFollowers(raw: string | number | undefined): string {
  if (!raw) return '—';
  const n = typeof raw === 'string' ? parseFloat(raw.replace(/[^0-9.]/g, '')) : raw;
  if (isNaN(n)) return String(raw);
  return compact(n);
}

const SWIPE_THRESHOLD = 90;

type FilterOption = { label: string; icon?: React.ReactNode };
const FILTER_OPTIONS: FilterOption[] = [
  { label: 'Global', icon: <Globe size={12} className="shrink-0" /> },
  { label: '18-65+' },
  { label: 'All Roles' },
  { label: '10K-1M+' },
  { label: 'All' },
];

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
  const [dragging, setDragging] = useState(false);

  const current = items[0];
  const next = items[1];
  const afterNext = items[2];

  // Framer Motion values for the top card
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-260, 0, 260], [-18, 0, 18]);

  // Derived opacities for stamps
  const alignOpacity = useTransform(x, [20, 100], [0, 1]);
  const opposeOpacity = useTransform(x, [-100, -20], [1, 0]);
  const upOpacity = useTransform(y, [-120, -40], [1, 0]);

  // Button scale on drag
  const springX = useSpring(x, { stiffness: 350, damping: 28 });
  const alignScale = useTransform(springX, [0, 130], [1, 1.25]);
  const opposeScale = useTransform(springX, [-130, 0], [1.25, 1]);

  // Background card x-parallax: the next card shifts slightly opposite
  const nextX = useTransform(x, [-300, 0, 300], [10, 0, -10]);

  const fetchMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/people/deck?cursor=${cursor}`);
      const data = await res.json();
      if (data.ok && data.items?.length) {
        setItems((prev) => [...prev, ...data.items]);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } else {
        setHasMore(false);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading]);

  useEffect(() => {
    if (items.length <= 3 && hasMore && !loading) {
      void fetchMore();
    }
  }, [items.length, hasMore, loading, fetchMore]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return;
      if (e.key === 'ArrowRight') handleSwipe('align');
      if (e.key === 'ArrowLeft') handleSwipe('oppose');
      if (e.key === 'ArrowUp') router.push(`/account/${current.id}`);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const handleSwipe = useCallback(
    (direction: 'align' | 'oppose') => {
      if (!current) return;

      const targetX = direction === 'align' ? 1400 : -1400;
      setExitX(targetX);
      setExitY(-20);

      const ratedId = current.id;
      setTimeout(() => {
        setItems((prev) => prev.slice(1));
        x.set(0);
        y.set(0);
      }, 320);

      fetch(`/api/accounts/${ratedId}/swipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      })
        .then((r) => r.json())
        .then((p) => {
          if (!p.ok) throw new Error(p.error?.message ?? 'Could not rate profile.');
          toast.push(
            direction === 'align'
              ? '✓ Aligned! +5 to their score.'
              : '✗ Opposed. -5 from their score.'
          );
        })
        .catch((err) => {
          toast.push(err instanceof Error ? err.message : 'Could not rate profile.');
        });
    },
    [current, toast, x, y]
  );

  function handleDragEnd(
    _: unknown,
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }
  ) {
    setDragging(false);
    const velX = info.velocity.x;
    const velY = info.velocity.y;

    if (info.offset.y < -SWIPE_THRESHOLD || velY < -700) {
      if (current) router.push(`/account/${current.id}`);
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
      animate(y, 0, { type: 'spring', stiffness: 500, damping: 30 });
      setShowUpHint(false);
      return;
    }

    if (info.offset.x > SWIPE_THRESHOLD || velX > 700) {
      handleSwipe('align');
      return;
    }

    if (info.offset.x < -SWIPE_THRESHOLD || velX < -700) {
      handleSwipe('oppose');
      return;
    }

    animate(x, 0, { type: 'spring', stiffness: 480, damping: 32 });
    animate(y, 0, { type: 'spring', stiffness: 480, damping: 32 });
    setShowUpHint(false);
  }

  function handleDrag(_: unknown, info: { offset: { x: number; y: number } }) {
    setDragging(true);
    setShowUpHint(info.offset.y < -35);
  }

  /* ──────── Empty state ──────── */
  if (!current && !loading) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="rounded-[32px] border border-border bg-card p-12 shadow-2xl"
        >
          <div className="mb-5 flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-muted text-4xl">
            👥
          </div>
          <h2 className="text-[24px] font-black text-foreground">All caught up!</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            New profiles will appear here as dossiers are created.
          </p>
        </motion.div>
      </div>
    );
  }

  /* ──────── Main layout ──────── */
  return (
    <main className="min-h-screen bg-background overflow-hidden">
      <div className="mx-auto max-w-[430px] px-4 pt-5 pb-28">

        {/* ── Header ── */}
        <header className="mb-4 flex items-start justify-between gap-2">
          <div>
            <p className="font-black text-[22px] leading-none tracking-tight text-foreground" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>
              Sho<span className="text-muted-foreground">ша</span>
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground leading-none">
              Discover &amp; Rate
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              Swipe to align or oppose impact.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all hover:bg-muted active:scale-95"
              aria-label="Notifications"
            >
              <Bell size={16} />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white">
                3
              </span>
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all hover:bg-muted active:scale-95"
              aria-label="Filters"
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </header>

        {/* ── Filter Pills ── */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTER_OPTIONS.map(({ label, icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => setActiveFilter(label)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-all duration-200',
                activeFilter === label
                  ? 'border-foreground bg-foreground text-background shadow-sm scale-105'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* ── Card Stack ── */}
        <section className="relative flex flex-col items-center">
          <div className="relative h-[570px] w-full">
            <AnimatePresence mode="sync">

              {/* Third card — farthest back */}
              {afterNext && (
                <motion.div
                  key={afterNext.id + '-c3'}
                  initial={{ scale: 0.88, y: 24 }}
                  animate={{ scale: 0.91, y: 10, rotate: -1.5 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 overflow-hidden rounded-[28px] border border-border"
                  style={{ zIndex: 1 }}
                >
                  <img
                    src={afterNext.avatar}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover brightness-[0.35] blur-sm"
                  />
                </motion.div>
              )}

              {/* Second card — peeking */}
              {next && (
                <motion.div
                  key={next.id + '-c2'}
                  style={{ x: nextX, zIndex: 2 }}
                  initial={{ scale: 0.93, y: 14 }}
                  animate={{ scale: 0.96, y: 5, rotate: 1.2 }}
                  exit={{ opacity: 0, scale: 0.88 }}
                  transition={{ duration: 0.28 }}
                  className="absolute inset-0 overflow-hidden rounded-[28px] border border-border shadow-xl"
                >
                  <img
                    src={next.avatar}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover brightness-50 blur-[1px]"
                  />
                </motion.div>
              )}

              {/* Top / current card */}
              {current && (
                <motion.article
                  key={current.id}
                  style={{ x, y, rotate, zIndex: 10 }}
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0.12}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                  initial={{ scale: 0.94, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 26 } }}
                  exit={{
                    x: exitX,
                    y: exitY,
                    opacity: 0,
                    scale: 0.86,
                    rotate: exitX > 0 ? 18 : -18,
                    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                  }}
                  className="absolute inset-0 cursor-grab overflow-hidden rounded-[28px] border border-border/50 bg-card shadow-2xl select-none active:cursor-grabbing"
                >
                  {/* ALIGN stamp */}
                  <motion.div
                    style={{ opacity: alignOpacity }}
                    className="pointer-events-none absolute left-5 top-10 z-30 -rotate-[20deg] rounded-2xl border-[3px] border-emerald-400 bg-emerald-400/10 px-4 py-1.5 backdrop-blur-sm"
                  >
                    <span className="text-[26px] font-black tracking-widest text-emerald-400 drop-shadow">
                      ALIGN
                    </span>
                  </motion.div>

                  {/* OPPOSE stamp */}
                  <motion.div
                    style={{ opacity: opposeOpacity }}
                    className="pointer-events-none absolute right-5 top-10 z-30 rotate-[20deg] rounded-2xl border-[3px] border-red-400 bg-red-400/10 px-4 py-1.5 backdrop-blur-sm"
                  >
                    <span className="text-[26px] font-black tracking-widest text-red-400 drop-shadow">
                      OPPOSE
                    </span>
                  </motion.div>

                  {/* Swipe-up hint */}
                  <AnimatePresence>
                    {showUpHint && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="pointer-events-none absolute inset-x-0 top-5 z-30 flex items-center justify-center"
                      >
                        <motion.div
                          style={{ opacity: upOpacity }}
                          className="flex items-center gap-1.5 rounded-full bg-white/90 px-5 py-2 shadow-lg backdrop-blur"
                        >
                          <ChevronUp size={14} className="text-black" />
                          <span className="text-[12px] font-black text-black">Open Profile</span>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Full-bleed avatar */}
                  <img
                    src={current.avatar}
                    alt={current.name}
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable={false}
                  />

                  {/* Gradient overlay — heavier at bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/98 via-black/25 to-black/10" />

                  {/* Top badges row */}
                  <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate rounded-full bg-black/55 px-3 py-1 backdrop-blur-md">
                      {current.profileKind === 'public_figure' && (
                        <Lock size={9} className="text-white/80 shrink-0" />
                      )}
                      <Link2 size={9} className="text-white/70 shrink-0" />
                      <span className="max-w-[130px] truncate text-[11px] font-semibold text-white">
                        {current.role || formatPlatform(current.platform) || 'Public Figure'}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                      <Globe size={10} className="shrink-0" />
                      {current.region || 'Global'}
                    </span>
                  </div>

                  {/* Bottom content */}
                  <div className="absolute bottom-0 left-0 right-0 z-10 p-4">

                    {/* Name row */}
                    <div className="mb-2.5 flex items-center gap-2">
                      <h2 className="min-w-0 truncate text-[25px] font-black leading-none text-white drop-shadow-lg">
                        {current.name}
                      </h2>
                      {current.verified && (
                        <ShieldCheck size={18} className="shrink-0 text-blue-400 drop-shadow" />
                      )}
                    </div>

                    {/* Handle */}
                    <p className="mb-2.5 text-[12px] font-medium text-white/65">
                      @{current.handle}
                    </p>

                    {/* Stats row: followers + impact score */}
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur-md ring-1 ring-white/10">
                        <Users size={14} className="text-white/60 shrink-0" />
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-wider text-white/55">
                            Followers
                          </p>
                          <p className="text-[16px] font-black tabular-nums text-white leading-none">
                            {compactFollowers(current.followers)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur-md ring-1 ring-white/10">
                        <TrendingUp size={14} className="text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-wider text-white/55">
                            Impact Score
                          </p>
                          <p className="text-[16px] font-black tabular-nums text-white leading-none">
                            {compact(current.score)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Category tags */}
                    {current.categories && current.categories.length > 0 && (
                      <div className="mb-2.5 flex flex-wrap gap-1.5">
                        {current.categories.slice(0, 3).map((cat) => (
                          <span
                            key={cat}
                            className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white/90 backdrop-blur-sm ring-1 ring-white/10"
                          >
                            {cat}
                          </span>
                        ))}
                        {current.categories.length > 3 && (
                          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/60">
                            +{current.categories.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bio snippet OR top reports */}
                    {current.bio ? (
                      <p className="line-clamp-2 text-[12px] leading-[1.55] text-white/70">
                        {current.bio}
                      </p>
                    ) : current.topReports.length > 0 ? (
                      <div className="space-y-1">
                        {current.topReports.slice(0, 2).map((r, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-md ring-1 ring-white/5"
                          >
                            {r.delta >= 0 ? (
                              <TrendingUp size={11} className="shrink-0 text-emerald-400" />
                            ) : (
                              <TrendingDown size={11} className="shrink-0 text-red-400" />
                            )}
                            <p className="line-clamp-1 flex-1 text-[11px] font-medium text-white/85">
                              {r.title}
                            </p>
                            <span
                              className={cn(
                                'shrink-0 text-[11px] font-black',
                                r.delta >= 0 ? 'text-emerald-400' : 'text-red-400'
                              )}
                            >
                              {r.delta > 0 ? '+' : ''}{Math.round(r.delta)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </motion.article>
              )}
            </AnimatePresence>
          </div>

          {/* ── Action Row ── */}
          {current && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="mt-5 w-full"
            >
              {/* Buttons row */}
              <div className="flex items-center justify-center gap-8">
                {/* Oppose button */}
                <div className="flex flex-col items-center gap-1.5">
                  <motion.button
                    type="button"
                    onClick={() => handleSwipe('oppose')}
                    style={{ scale: opposeScale }}
                    whileTap={{ scale: 0.88 }}
                    className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-red-200 bg-white text-red-500 shadow-xl hover:shadow-red-200/70 dark:bg-card transition-shadow"
                    aria-label="Oppose"
                  >
                    <ArrowLeft size={24} strokeWidth={2.5} />
                  </motion.button>
                  <span className="text-[10px] font-bold text-muted-foreground/70 text-center leading-tight">
                    Left swipe = Oppose<br />
                    <span className="text-red-500/80">-5 Rating</span>
                  </span>
                </div>

                {/* View Profile center */}
                <motion.button
                  type="button"
                  onClick={() => router.push(`/account/${current.id}`)}
                  whileTap={{ scale: 0.93 }}
                  className="rounded-full border border-border bg-card px-5 py-3 text-[12px] font-black shadow-md transition-all hover:bg-muted hover:scale-105 active:scale-95"
                >
                  View Profile
                </motion.button>

                {/* Align button */}
                <div className="flex flex-col items-center gap-1.5">
                  <motion.button
                    type="button"
                    onClick={() => handleSwipe('align')}
                    style={{ scale: alignScale }}
                    whileTap={{ scale: 0.88 }}
                    className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-emerald-200 bg-white text-emerald-600 shadow-xl hover:shadow-emerald-200/70 dark:bg-card transition-shadow"
                    aria-label="Align"
                  >
                    <ArrowRight size={24} strokeWidth={2.5} />
                  </motion.button>
                  <span className="text-[10px] font-bold text-muted-foreground/70 text-center leading-tight">
                    Right swipe = Align<br />
                    <span className="text-emerald-600/80">+5 Rating &amp; Follow</span>
                  </span>
                </div>
              </div>

              {/* Privacy disclaimer — matches design spec */}
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/55">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                This action is public and the user will be notified.
              </p>
            </motion.div>
          )}

          {/* Keyboard hint */}
          <p className="mt-3 text-center text-[10px] text-muted-foreground/40">
            ← → arrow keys to rate · ↑ open profile
          </p>
        </section>
      </div>
    </main>
  );
}
