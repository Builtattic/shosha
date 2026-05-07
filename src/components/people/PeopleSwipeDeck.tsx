'use client';

import { useMemo, useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Check, Filter, Globe2, ShieldCheck, X } from 'lucide-react';
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

export function PeopleSwipeDeck({ initialItems }: { initialItems: PeopleDeckItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState('Global');
  const current = initialItems[index];
  const next = initialItems[index + 1];

  const filters = useMemo(() => ['Global', '18-65+', 'All Roles', '10K-1M+', 'All'], []);

  async function rate(direction: 'align' | 'oppose') {
    if (!current || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/accounts/${current.id}/swipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Could not rate profile.');
      toast.push(direction === 'align' ? '+5 rating recorded. Following when claimable.' : '-5 rating recorded.');
      setIndex((value) => value + 1);
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not rate profile.');
    } finally {
      setBusy(false);
    }
  }

  function onDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (!current || busy) return;
    if (info.offset.y < -120) {
      router.push(`/account/${current.id}`);
      return;
    }
    if (info.offset.x > 120) void rate('align');
    if (info.offset.x < -120) void rate('oppose');
  }

  if (!current) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="text-[22px] font-black text-foreground">No more profiles.</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">New people will appear here as dossiers are created.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background safe-bottom px-4 py-5">
      <div className="mx-auto max-w-5xl">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-black uppercase tracking-widest text-muted-foreground">Discover & Rate</p>
            <h1 className="text-[28px] font-black text-foreground">People</h1>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground"
            aria-label="Filters"
          >
            <Filter size={18} />
          </button>
        </header>

        <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setScope(filter)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-2 text-[12px] font-bold transition-colors',
                scope === filter ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-muted-foreground'
              )}
            >
              {filter}
            </button>
          ))}
        </div>

        <section className="relative mx-auto grid min-h-[640px] max-w-4xl place-items-center overflow-hidden">
          {next && (
            <div className="absolute h-[560px] w-full max-w-[430px] rotate-3 rounded-[28px] bg-primary/5" />
          )}
          <motion.article
            key={current.id}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            onDragEnd={onDragEnd}
            whileDrag={{ scale: 0.98 }}
            className="relative h-[580px] w-full max-w-[430px] cursor-grab overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl active:cursor-grabbing"
          >
            <img src={current.avatar} alt={current.name} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10" />

            <div className="absolute left-4 right-4 top-4 flex justify-between gap-3">
              <span className="rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">
                {current.role || formatPlatform(current.platform)}
              </span>
              <span className="rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">
                <Globe2 size={12} className="mr-1 inline" />
                {current.region || 'Global'}
              </span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="min-w-0 truncate text-[26px] font-black leading-tight">{current.name}</h2>
                  {current.verified && <ShieldCheck size={18} className="shrink-0" />}
                </div>
                <p className="text-[13px] font-semibold text-white/75">@{current.handle}</p>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Impact Score</p>
                  <p className="mt-1 text-[18px] font-black tabular-nums">{compact(current.score)}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Followers</p>
                  <p className="mt-1 text-[18px] font-black tabular-nums">{current.followers || '0'}</p>
                </div>
              </div>

              <div className="space-y-2">
                {current.topReports.slice(0, 3).map((report, i) => (
                  <div key={`${report.title}-${i}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-3 py-2 backdrop-blur">
                    <p className="line-clamp-1 text-[12px] font-semibold text-white/90">{report.title}</p>
                    <span className={cn('shrink-0 text-[12px] font-black', report.delta >= 0 ? 'text-green-300' : 'text-red-300')}>
                      {report.delta > 0 ? '+' : ''}{Math.round(report.delta)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.article>

          <div className="absolute bottom-4 left-1/2 flex w-full max-w-[430px] -translate-x-1/2 items-center justify-between px-4">
            <button
              type="button"
              onClick={() => rate('oppose')}
              disabled={busy}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-red-300 bg-red-50 text-red-500 shadow-lg disabled:opacity-60"
              aria-label="Oppose"
            >
              <X size={24} />
            </button>
            <button
              type="button"
              onClick={() => router.push(`/account/${current.id}`)}
              className="rounded-full border border-white/20 bg-black/70 px-4 py-2 text-[12px] font-black text-white backdrop-blur"
            >
              Open Profile
            </button>
            <button
              type="button"
              onClick={() => rate('align')}
              disabled={busy}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-green-300 bg-green-50 text-green-600 shadow-lg disabled:opacity-60"
              aria-label="Align"
            >
              <Check size={24} />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
