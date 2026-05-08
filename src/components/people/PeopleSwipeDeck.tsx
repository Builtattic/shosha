'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, animate } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ChevronUp, Globe, Loader2, ShieldCheck, Users, TrendingUp, TrendingDown, Share2, MapPin, X, Check, Lock } from 'lucide-react';
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

const SWIPE_THRESHOLD = 90;
const FILTERS = [
  { label: 'Global', icon: <Globe size={12} /> }, { label: '18-65+' },
  { label: 'All Roles' }, { label: '10K-1M+' }, { label: 'All' },
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

  const current = items[0], next = items[1], afterNext = items[2];
  const x = useMotionValue(0), y = useMotionValue(0);
  const rotate = useTransform(x, [-260, 0, 260], [-18, 0, 18]);
  const alignOp = useTransform(x, [20, 100], [0, 1]);
  const opposeOp = useTransform(x, [-100, -20], [1, 0]);
  const upOp = useTransform(y, [-120, -40], [1, 0]);
  const sx = useSpring(x, { stiffness: 350, damping: 28 });
  const alignSc = useTransform(sx, [0, 130], [1, 1.3]);
  const opposeSc = useTransform(sx, [-130, 0], [1.3, 1]);
  const nextX = useTransform(x, [-300, 0, 300], [10, 0, -10]);

  const fetchMore = useCallback(async (currentCursor: number, reset: boolean = false) => {
    if (loading || (!hasMore && !reset)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/people/deck?cursor=${currentCursor}&filter=${encodeURIComponent(activeFilter)}`);
      const data = await res.json();
      if (data.ok && data.items?.length) { 
        setItems(p => reset ? data.items : [...p, ...data.items]); 
        setCursor(data.nextCursor); 
        setHasMore(data.hasMore); 
      }
      else {
        if (reset) setItems([]);
        setHasMore(false);
      }
    } catch {} finally { setLoading(false); }
  }, [activeFilter, hasMore, loading]);

  useEffect(() => {
    // When filter changes, reset the deck and fetch
    setCursor(0);
    setHasMore(true);
    fetchMore(0, true);
  }, [activeFilter, fetchMore]);

  useEffect(() => { if (items.length <= 3 && hasMore && !loading) void fetchMore(cursor, false); }, [items.length, hasMore, loading, cursor, fetchMore]);

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

  const handleSwipe = useCallback((dir: 'align' | 'oppose') => {
    if (!current) return;
    setExitX(dir === 'align' ? 1400 : -1400); setExitY(-20);
    const ratedId = current.id;
    setTimeout(() => { setItems(p => p.slice(1)); x.set(0); y.set(0); }, 320);
    fetch(`/api/accounts/${ratedId}/swipe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ direction: dir }) })
      .then(r => r.json()).then(p => { if (!p.ok) throw new Error(p.error?.message ?? 'Failed'); toast.push(dir === 'align' ? '✓ Aligned! +5 to their score.' : '✗ Opposed. -5 from their score.'); })
      .catch(err => toast.push(err instanceof Error ? err.message : 'Failed'));
  }, [current, toast, x, y]);

  function handleDragEnd(_: unknown, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) {
    setShowUpHint(false);
    if (info.offset.y < -SWIPE_THRESHOLD || info.velocity.y < -700) { if (current) router.push(`/account/${current.id}`); animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 }); animate(y, 0, { type: 'spring', stiffness: 500, damping: 30 }); return; }
    if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 700) { handleSwipe('align'); return; }
    if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -700) { handleSwipe('oppose'); return; }
    animate(x, 0, { type: 'spring', stiffness: 480, damping: 32 }); animate(y, 0, { type: 'spring', stiffness: 480, damping: 32 });
  }

  if (!current && !loading) return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[32px] border border-border bg-card p-12 shadow-2xl">
        <div className="mb-5 flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-muted text-4xl">👥</div>
        <h2 className="text-[24px] font-black">All caught up!</h2>
        <p className="mt-2 text-[13px] text-muted-foreground">New profiles will appear here as dossiers are created.</p>
      </motion.div>
    </div>
  );

  return (
    <main className="min-h-screen bg-background overflow-hidden">
      <div className="mx-auto flex flex-col items-center px-4 pt-6 pb-32 lg:pt-10 lg:pb-12" style={{ maxWidth: 520 }}>

        {/* Header */}
        <header className="mb-5 flex w-full items-start justify-between">
          <div>
            <h1 className="text-[24px] lg:text-[28px] font-black tracking-tight" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>
              Sho<span className="text-muted-foreground">sha</span>
            </h1>
            <p className="text-[13px] font-bold text-foreground">Discover &amp; Rate</p>
            <p className="text-[10px] text-muted-foreground/70">Swipe to align or oppose impact.</p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
          </div>
        </header>

        {/* Filters */}
        <div className="mb-6 flex w-full gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTERS.map(({ label, icon }) => (
            <button key={label} onClick={() => setActiveFilter(label)} className={cn(
              'shrink-0 flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] font-bold transition-all',
              activeFilter === label ? 'border-foreground bg-foreground text-background scale-[1.04]' : 'border-border bg-card text-muted-foreground hover:bg-muted'
            )}>{icon}{label}</button>
          ))}
        </div>

        {/* Card + buttons wrapper */}
        <div className="relative w-full flex items-center justify-center">

          {/* Oppose button — outside card on left */}
          {current && (
            <motion.div style={{ scale: opposeSc }} className="hidden md:flex flex-col items-center gap-2 mr-6 lg:mr-8">
              <motion.button onClick={() => handleSwipe('oppose')} whileTap={{ scale: 0.85 }}
                className="flex h-16 w-16 lg:h-[72px] lg:w-[72px] items-center justify-center rounded-full border-[3px] border-red-200 bg-white text-red-500 shadow-2xl shadow-red-100/40 hover:shadow-red-200/60 dark:bg-card transition-all hover:scale-105" aria-label="Oppose">
                <X size={28} strokeWidth={2.5} />
              </motion.button>
              <span className="text-[11px] font-black uppercase text-red-500 tracking-wider">Oppose</span>
              <span className="text-[12px] font-black text-red-400/80">-5</span>
            </motion.div>
          )}

          {/* Card stack */}
          <div className="relative w-full max-w-[400px] lg:max-w-[420px]" style={{ aspectRatio: '9/14' }}>
            <AnimatePresence mode="sync">
              {afterNext && (
                <motion.div key={afterNext.id+'-3'} initial={{ scale: 0.88, y: 24 }} animate={{ scale: 0.91, y: 10, rotate: -1.5 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                  className="absolute inset-0 overflow-hidden rounded-[32px] border border-border" style={{ zIndex: 1 }}>
                  <img src={afterNext.avatar} alt="" className="absolute inset-0 h-full w-full object-cover brightness-[0.3] blur-sm" draggable={false} />
                </motion.div>
              )}
              {next && (
                <motion.div key={next.id+'-2'} style={{ x: nextX, zIndex: 2 }} initial={{ scale: 0.93, y: 14 }} animate={{ scale: 0.96, y: 5, rotate: 1.2 }} exit={{ opacity: 0, scale: 0.88 }} transition={{ duration: 0.28 }}
                  className="absolute inset-0 overflow-hidden rounded-[32px] border border-border shadow-xl">
                  <img src={next.avatar} alt="" className="absolute inset-0 h-full w-full object-cover brightness-[0.4] blur-[2px]" draggable={false} />
                </motion.div>
              )}
              {current && (
                <motion.article key={current.id} style={{ x, y, rotate, zIndex: 10 }} drag dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} dragElastic={0.12}
                  onDrag={(_, info) => setShowUpHint(info.offset.y < -35)} onDragEnd={handleDragEnd}
                  initial={{ scale: 0.94, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 26 } }}
                  exit={{ x: exitX, y: exitY, opacity: 0, scale: 0.86, rotate: exitX > 0 ? 18 : -18, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } }}
                  className="absolute inset-0 cursor-grab overflow-hidden rounded-[32px] border border-white/10 bg-card shadow-2xl select-none active:cursor-grabbing">

                  {/* Stamps */}
                  <motion.div style={{ opacity: alignOp }} className="pointer-events-none absolute left-5 top-12 z-30 -rotate-[20deg] rounded-2xl border-[3px] border-emerald-400 bg-emerald-400/10 px-5 py-2 backdrop-blur-sm">
                    <span className="text-[28px] font-black tracking-widest text-emerald-400 drop-shadow">ALIGN</span>
                  </motion.div>
                  <motion.div style={{ opacity: opposeOp }} className="pointer-events-none absolute right-5 top-12 z-30 rotate-[20deg] rounded-2xl border-[3px] border-red-400 bg-red-400/10 px-5 py-2 backdrop-blur-sm">
                    <span className="text-[28px] font-black tracking-widest text-red-400 drop-shadow">OPPOSE</span>
                  </motion.div>

                  {/* Up hint */}
                  <AnimatePresence>
                    {showUpHint && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-x-0 top-6 z-30 flex justify-center">
                        <motion.div style={{ opacity: upOp }} className="flex items-center gap-1.5 rounded-full bg-white/90 px-5 py-2 shadow-lg backdrop-blur">
                          <ChevronUp size={14} className="text-black" /><span className="text-[12px] font-black text-black">Open Profile</span>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Avatar */}
                  <img src={current.avatar} alt={current.name} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" style={{ '--tw-gradient-from-position': '0%', '--tw-gradient-via-position': '50%' } as React.CSSProperties} />

                  {/* Top badges */}
                  <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-xl border border-white/10 text-[11px] font-bold text-white">
                        <ShieldCheck size={11} className="text-white/80" />{current.role || 'Public Figure'}
                      </span>
                      <button className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-xl border border-white/10 text-white/70 hover:text-white transition-colors">
                        <Share2 size={13} />
                      </button>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-xl border border-white/10">
                      <MapPin size={10} />{current.region || 'Global'}
                    </span>
                  </div>

                  {/* Mobile-only side buttons */}
                  <div className="md:hidden absolute left-3 top-1/2 -translate-y-1/2 z-20">
                    <motion.button onClick={() => handleSwipe('oppose')} whileTap={{ scale: 0.85 }} style={{ scale: opposeSc }}
                      className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-red-200/60 bg-white/90 text-red-500 shadow-xl backdrop-blur-sm" aria-label="Oppose">
                      <X size={22} strokeWidth={2.5} />
                    </motion.button>
                    <p className="mt-1 text-center text-[9px] font-black text-red-500 uppercase">Oppose<br/><span className="text-red-400">-5</span></p>
                  </div>
                  <div className="md:hidden absolute right-3 top-1/2 -translate-y-1/2 z-20">
                    <motion.button onClick={() => handleSwipe('align')} whileTap={{ scale: 0.85 }} style={{ scale: alignSc }}
                      className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-emerald-200/60 bg-white/90 text-emerald-600 shadow-xl backdrop-blur-sm" aria-label="Align">
                      <Check size={22} strokeWidth={2.5} />
                    </motion.button>
                    <p className="mt-1 text-center text-[9px] font-black text-emerald-600 uppercase">Align<br/><span className="text-emerald-500">+5</span></p>
                  </div>

                  {/* Bottom content */}
                  <div className="absolute bottom-0 left-0 right-0 z-10 p-5">
                    <div className="mb-1.5 flex items-center gap-2">
                      <h2 className="truncate text-[28px] font-black leading-tight text-white drop-shadow-lg">{current.name}</h2>
                      {current.verified && <ShieldCheck size={20} className="shrink-0 text-blue-400 drop-shadow" />}
                    </div>
                    <p className="mb-1.5 text-[13px] font-medium text-white/55">@{current.handle}</p>
                    {current.bio && <p className="mb-2 text-[12px] text-white/60">{current.role || 'Public Figure'}</p>}

                    <div className="mb-3 flex items-center gap-3 text-[13px] text-white/80">
                      <span className="flex items-center gap-1.5"><Users size={14} className="text-white/50" /><span className="font-black">{compactFollowers(current.followers)}</span><span className="text-white/40">Followers</span></span>
                      <span className="text-white/20">|</span>
                      <span className="flex items-center gap-1.5"><TrendingUp size={14} className="text-emerald-400" /><span className="font-black">Impact Score {compact(current.score)}</span></span>
                    </div>

                    {current.categories && current.categories.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {current.categories.slice(0, 3).map(c => <span key={c} className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white/90 backdrop-blur-sm ring-1 ring-white/10">{c}</span>)}
                        {current.categories.length > 3 && <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white/50">+{current.categories.length - 3}</span>}
                      </div>
                    )}

                    {current.bio ? (
                      <p className="line-clamp-2 text-[13px] leading-relaxed text-white/65">{current.bio}</p>
                    ) : current.topReports.length > 0 ? (
                      <div className="space-y-1.5">
                        {current.topReports.slice(0, 2).map((r, i) => (
                          <div key={i} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-md ring-1 ring-white/5">
                            {r.delta >= 0 ? <TrendingUp size={11} className="shrink-0 text-emerald-400" /> : <TrendingDown size={11} className="shrink-0 text-red-400" />}
                            <p className="line-clamp-1 flex-1 text-[11px] font-medium text-white/85">{r.title}</p>
                            <span className={cn('shrink-0 text-[11px] font-black', r.delta >= 0 ? 'text-emerald-400' : 'text-red-400')}>{r.delta > 0 ? '+' : ''}{Math.round(r.delta)}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-3 flex justify-center gap-1.5">
                      {items.slice(0, 5).map((item, i) => <div key={item.id} className={cn('h-[6px] rounded-full transition-all', i === 0 ? 'w-5 bg-white' : 'w-[6px] bg-white/30')} />)}
                    </div>
                  </div>
                </motion.article>
              )}
            </AnimatePresence>
          </div>

          {/* Align button — outside card on right (desktop) */}
          {current && (
            <motion.div style={{ scale: alignSc }} className="hidden md:flex flex-col items-center gap-2 ml-6 lg:ml-8">
              <motion.button onClick={() => handleSwipe('align')} whileTap={{ scale: 0.85 }}
                className="flex h-16 w-16 lg:h-[72px] lg:w-[72px] items-center justify-center rounded-full border-[3px] border-emerald-200 bg-white text-emerald-600 shadow-2xl shadow-emerald-100/40 hover:shadow-emerald-200/60 dark:bg-card transition-all hover:scale-105" aria-label="Align">
                <Check size={28} strokeWidth={2.5} />
              </motion.button>
              <span className="text-[11px] font-black uppercase text-emerald-600 tracking-wider">Align</span>
              <span className="text-[12px] font-black text-emerald-500/80">+5</span>
            </motion.div>
          )}
        </div>

        {/* Bottom bar */}
        {current && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="mt-6 w-full max-w-[420px]">
            <div className="flex items-stretch rounded-2xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden">
              <div className="flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4 border-r border-border">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-red-300 text-red-500"><X size={14} strokeWidth={2.5} /></span>
                <div><p className="text-[11px] font-bold text-foreground">Left swipe = Oppose</p><p className="text-[10px] font-bold text-red-500">-5 Rating</p></div>
              </div>
              <div className="flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-300 text-emerald-600"><Check size={14} strokeWidth={2.5} /></span>
                <div><p className="text-[11px] font-bold text-foreground">Right swipe = Align</p><p className="text-[10px] font-bold text-emerald-600">+5 Rating &amp; Follow</p></div>
              </div>
            </div>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/55"><Lock size={11} />This action is public and the user will be notified.</p>
          </motion.div>
        )}
        <p className="mt-3 text-center text-[10px] text-muted-foreground/40 hidden lg:block">← → arrow keys to rate · ↑ open profile</p>
      </div>
    </main>
  );
}
