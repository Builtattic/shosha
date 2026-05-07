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
  Check,
  ChevronUp,
  Filter,
  Globe2,
  Loader2,
  ShieldCheck,
  X,
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
  topReports: Array<{ title: string; delta: number; type: 'positive' | 'negative' }>;
};

function compact(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

const SWIPE_THRESHOLD = 100;
const FILTERS = ['Global', '18-65+', 'All Roles', '10K-1M+', 'All'] as const;

export function PeopleSwipeDeck({ initialItems }: { initialItems: PeopleDeckItem[] }) {
  const router = useRouter();
  const toast = useToast();

  const [items, setItems] = useState(initialItems);
  const [scope, setScope] = useState('Global');
  const [exitX, setExitX] = useState(0);
  const [exitY, setExitY] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(initialItems.length);
  const [hasMore, setHasMore] = useState(true);
  const [showUpHint, setShowUpHint] = useState(false);
  const [swiping, setSwiping] = useState<'align' | 'oppose' | null>(null);

  const current = items[0];
  const next = items[1];
  const afterNext = items[2];

  // Framer Motion values for the top card
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-250, 0, 250], [-20, 0, 20]);

  // Smooth spring for the action buttons scale
  const springX = useSpring(x, { stiffness: 400, damping: 30 });
  const alignScale = useTransform(springX, [0, 120], [1, 1.3]);
  const opposeScale = useTransform(springX, [-120, 0], [1.3, 1]);
  const alignOpacity = useTransform(x, [0, 50, 140], [0, 0.5, 1]);
  const opposeOpacity = useTransform(x, [-140, -50, 0], [1, 0.5, 0]);
  const upOpacity = useTransform(y, [-140, -50, 0], [1, 0.5, 0]);

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
      // silently fail – existing deck still works
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading]);

  // Prefetch when only 3 cards remain
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
      setSwiping(direction);

      const targetX = direction === 'align' ? 1200 : -1200;
      setExitX(targetX);
      setExitY(0);

      const ratedId = current.id;
      setTimeout(() => {
        setItems((prev) => prev.slice(1));
        setSwiping(null);
        // reset motion values for next card
        x.set(0);
        y.set(0);
      }, 300);

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
              ? '✓ Aligned! Following when claimable.'
              : '✗ Opposed.'
          );
        })
        .catch((err) => {
          toast.push(err instanceof Error ? err.message : 'Could not rate profile.');
        });
    },
    [current, toast, x, y]
  );

  function handleDragEnd(_: unknown, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) {
    const velX = info.velocity.x;
    const velY = info.velocity.y;

    // Swipe up → open profile
    if (info.offset.y < -SWIPE_THRESHOLD || velY < -600) {
      if (current) router.push(`/account/${current.id}`);
      return;
    }

    // Swipe right → align
    if (info.offset.x > SWIPE_THRESHOLD || velX > 600) {
      handleSwipe('align');
      return;
    }

    // Swipe left → oppose
    if (info.offset.x < -SWIPE_THRESHOLD || velX < -600) {
      handleSwipe('oppose');
      return;
    }

    // Snap back
    animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
    animate(y, 0, { type: 'spring', stiffness: 500, damping: 30 });
  }

  function handleDrag(_: unknown, info: { offset: { x: number; y: number } }) {
    setShowUpHint(info.offset.y < -40);
  }

  if (!current && !loading) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[28px] border border-border bg-card p-10 shadow-2xl"
        >
          <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-muted text-3xl">
            👥
          </div>
          <h1 className="text-[22px] font-black text-foreground">All caught up!</h1>
          <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
            New people will appear here as dossiers are created.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background overflow-hidden px-4 py-5 pb-24">
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              Discover &amp; Rate
            </p>
            <h1 className="text-[30px] font-black leading-none text-foreground">People</h1>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all hover:bg-muted active:scale-95"
              aria-label="Filters"
            >
              <Filter size={18} />
            </button>
          </div>
        </header>

        {/* Filter Pills */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setScope(filter)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-[13px] font-bold transition-all duration-200',
                scope === filter
                  ? 'border-foreground bg-foreground text-background shadow-md scale-105'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Card Stack */}
        <section className="relative flex flex-col items-center">
          <div className="relative h-[600px] w-full">
            <AnimatePresence mode="sync">
              {/* Third card (farthest back) */}
              {afterNext && (
                <motion.div
                  key={afterNext.id + '-back2'}
                  initial={{ scale: 0.90, y: 20 }}
                  animate={{ scale: 0.92, y: 8, rotate: -1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 overflow-hidden rounded-[28px] border border-border"
                  style={{ zIndex: 1 }}
                >
                  <img
                    src={afterNext.avatar}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover brightness-50 blur-sm"
                  />
                </motion.div>
              )}

              {/* Second card (peeking behind) */}
              {next && (
                <motion.div
                  key={next.id + '-back1'}
                  initial={{ scale: 0.94, y: 14 }}
                  animate={{ scale: 0.96, y: 4, rotate: 1.5 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 overflow-hidden rounded-[28px] border border-border shadow-lg"
                  style={{ zIndex: 2 }}
                >
                  <img
                    src={next.avatar}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover brightness-60 blur-[1px]"
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
                  dragElastic={0.15}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                  initial={{ scale: 0.96, opacity: 0, y: 16 }}
                  animate={{ scale: 1, opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 28 } }}
                  exit={{ x: exitX, y: exitY, opacity: 0, scale: 0.88, transition: { duration: 0.28, ease: 'easeOut' } }}
                  className="absolute inset-0 cursor-grab overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl select-none active:cursor-grabbing"
                >
                  {/* ALIGN stamp */}
                  <motion.div
                    style={{ opacity: alignOpacity }}
                    className="pointer-events-none absolute left-5 top-10 z-30 -rotate-[18deg] rounded-xl border-[3px] border-green-400 bg-green-400/10 px-4 py-1.5 backdrop-blur"
                  >
                    <span className="text-[28px] font-black tracking-wider text-green-400">ALIGN</span>
                  </motion.div>

                  {/* OPPOSE stamp */}
                  <motion.div
                    style={{ opacity: opposeOpacity }}
                    className="pointer-events-none absolute right-5 top-10 z-30 rotate-[18deg] rounded-xl border-[3px] border-red-400 bg-red-400/10 px-4 py-1.5 backdrop-blur"
                  >
                    <span className="text-[28px] font-black tracking-wider text-red-400">OPPOSE</span>
                  </motion.div>

                  {/* Swipe-up hint */}
                  <AnimatePresence>
                    {showUpHint && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center pt-6"
                      >
                        <motion.div style={{ opacity: upOpacity }} className="rounded-full bg-white/90 px-5 py-2 shadow-lg">
                          <span className="flex items-center gap-1.5 text-[13px] font-black text-black">
                            <ChevronUp size={15} />
                            Open Profile
                          </span>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Avatar */}
                  <img
                    src={current.avatar}
                    alt={current.name}
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable={false}
                  />

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

                  {/* Top badges */}
                  <div className="absolute left-4 right-4 top-4 z-10 flex justify-between gap-2">
                    <span className="max-w-[55%] truncate rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                      {current.role || formatPlatform(current.platform)}
                    </span>
                    <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                      <Globe2 size={11} className="mr-1 inline-block" />
                      {current.region || 'Global'}
                    </span>
                  </div>

                  {/* Bottom content */}
                  <div className="absolute bottom-0 left-0 right-0 z-10 p-5">
                    {/* Name row */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <h2 className="min-w-0 truncate text-[26px] font-black leading-none text-white drop-shadow-md">
                          {current.name}
                        </h2>
                        {current.verified && (
                          <ShieldCheck size={20} className="shrink-0 text-blue-400 drop-shadow" />
                        )}
                      </div>
                      <p className="mt-0.5 text-[13px] font-medium text-white/70">
                        @{current.handle}
                      </p>
                    </div>

                    {/* Stats grid */}
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur-md ring-1 ring-white/10">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/60">
                          Impact Score
                        </p>
                        <p className="mt-0.5 text-[19px] font-black tabular-nums text-white">
                          {compact(current.score)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur-md ring-1 ring-white/10">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/60">
                          Followers
                        </p>
                        <p className="mt-0.5 text-[19px] font-black tabular-nums text-white">
                          {current.followers || '—'}
                        </p>
                      </div>
                    </div>

                    {/* Top reports */}
                    <div className="space-y-1.5">
                      {current.topReports.length > 0 ? (
                        current.topReports.slice(0, 3).map((r, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between gap-3 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-md ring-1 ring-white/5"
                          >
                            <p className="line-clamp-1 text-[12px] font-medium text-white/90">
                              {r.title}
                            </p>
                            <span
                              className={cn(
                                'shrink-0 text-[12px] font-black',
                                r.delta >= 0 ? 'text-emerald-400' : 'text-red-400'
                              )}
                            >
                              {r.delta > 0 ? '+' : ''}
                              {Math.round(r.delta)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-md">
                          <p className="text-center text-[12px] text-white/50">No reports yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.article>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          {current && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 flex w-full items-center justify-center gap-6"
            >
              {/* Oppose */}
              <motion.button
                type="button"
                onClick={() => handleSwipe('oppose')}
                style={{ scale: opposeScale }}
                className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-200 bg-white text-red-500 shadow-xl transition-shadow hover:shadow-red-200/60 dark:bg-card"
                aria-label="Oppose"
              >
                <X size={28} strokeWidth={2.5} />
              </motion.button>

              {/* View Profile */}
              <button
                type="button"
                onClick={() => router.push(`/account/${current.id}`)}
                className="rounded-full border border-border bg-card px-6 py-3.5 text-[13px] font-black shadow-md transition-all hover:bg-muted hover:scale-105 active:scale-95"
              >
                View Profile
              </button>

              {/* Align */}
              <motion.button
                type="button"
                onClick={() => handleSwipe('align')}
                style={{ scale: alignScale }}
                className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-200 bg-white text-emerald-600 shadow-xl transition-shadow hover:shadow-emerald-200/60 dark:bg-card"
                aria-label="Align"
              >
                <Check size={28} strokeWidth={2.5} />
              </motion.button>
            </motion.div>
          )}

          {/* Keyboard hint */}
          <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
            Use ← → arrow keys or swipe to rate · ↑ to open
          </p>
        </section>
      </div>
    </main>
  );
}
