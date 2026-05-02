'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, CloudLightning, Archive, ChevronDown, CheckCircle2, TrendingUp, TrendingDown, Globe, Flag, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';

export type RankRow = {
  id: string;
  name: string;
  handle: string;
  platform: string;
  avatar: string;
  score: number;
  change: number;
  isVerified: boolean;
};

type ScopeOption = { value: string; label: string; Icon: typeof Globe };
const SCOPES: ScopeOption[] = [
  { value: 'global', label: 'Global', Icon: Globe },
  { value: 'regional', label: 'Regional', Icon: Globe },
  { value: 'national', label: 'National', Icon: Flag },
  { value: 'local', label: 'Local', Icon: MapPin },
];

function RankItem({ row, rank, isNegative = false, index = 0 }: { row: RankRow; rank: number; isNegative?: boolean; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="group flex items-center justify-between border-b border-border/50 py-4 last:border-0"
    >
      <Link href={`/account/${row.id}`} className="flex items-center gap-4 flex-1 min-w-0 transition-transform group-hover:translate-x-0.5">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg text-[14px] font-black shrink-0 tabular-nums',
            isNegative ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          )}
        >
          {rank}
        </div>

        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-12 w-12 overflow-hidden rounded-full border border-border shrink-0 bg-muted">
            {row.avatar ? (
              <img src={row.avatar} alt={row.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[14px] font-black text-muted-foreground">
                {row.name[0]?.toUpperCase()}
              </div>
            )}
            {row.isVerified && (
              <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5">
                <CheckCircle2 size={12} className="text-foreground fill-foreground/10" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[15px] font-bold text-foreground truncate">{row.name}</span>
              {row.isVerified && <CheckCircle2 size={14} className="text-foreground shrink-0" />}
            </div>
            <p className="text-[11px] text-muted-foreground/60 capitalize">{row.platform}</p>
          </div>
        </div>
      </Link>

      <div className="text-right shrink-0 pl-3">
        <div className="text-[18px] font-black text-foreground tabular-nums leading-none">{row.score.toLocaleString()}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Shosha Score</div>
        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-1 text-[11px] font-bold tabular-nums',
            row.change < 0 ? 'text-destructive' : row.change > 0 ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {row.change < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
          {row.change > 0 ? '+' : ''}
          {row.change.toLocaleString()}
          <span className="text-muted-foreground/60 font-medium">(wk)</span>
        </div>
      </div>
    </motion.div>
  );
}

const TABS = [
  { id: 'gainers' as const, label: 'On Fire', subtitle: 'Top Gainers', Icon: Flame, accent: 'text-primary' },
  { id: 'losers' as const, label: 'Under Fire', subtitle: 'Taking Hits', Icon: CloudLightning, accent: 'text-destructive' },
  { id: 'archived' as const, label: 'Archived', subtitle: 'Legends', Icon: Archive, accent: 'text-foreground' },
];

export function RanksTabs({ topGainers, underFire }: { topGainers: RankRow[]; underFire: RankRow[] }) {
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers' | 'archived'>('gainers');
  const [scope, setScope] = useState<ScopeOption>(SCOPES[0]);
  const [scopeOpen, setScopeOpen] = useState(false);
  const scopeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scopeOpen) return;
    function onClick(e: MouseEvent) {
      if (scopeRef.current && !scopeRef.current.contains(e.target as Node)) setScopeOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [scopeOpen]);

  return (
    <>
      {/* Segmented control — single rounded card with sliding pill */}
      <div className="mb-5 rounded-2xl border border-border bg-card p-1.5 shadow-sm">
        <div className="relative flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.Icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'group relative flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-3 text-left transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="rankActiveTab"
                    className="absolute inset-0 rounded-xl bg-background shadow-sm border border-border/60"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <Icon size={16} strokeWidth={isActive ? 2.4 : 2} className={cn('shrink-0', isActive && tab.accent)} />
                  <span className="leading-tight">
                    <span className="block text-[12px] font-black sm:text-[13px]">{tab.label}</span>
                    <span className="block text-[10px] font-medium opacity-60">{tab.subtitle}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[12px] text-muted-foreground leading-snug">Real-time ranking of public figures by Shosha Score.</p>
        <div ref={scopeRef} className="relative shrink-0">
          <button
            onClick={() => setScopeOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-bold transition-all hover:bg-muted active:scale-95"
          >
            <scope.Icon size={14} /> {scope.label}
            <ChevronDown size={14} className={cn('transition-transform', scopeOpen && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {scopeOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 z-20 w-44 rounded-2xl border border-border bg-card p-1.5 shadow-xl"
              >
                {SCOPES.map((opt) => {
                  const Icon = opt.Icon;
                  const isSel = opt.value === scope.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setScope(opt);
                        setScopeOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[12px] font-semibold transition-colors',
                        isSel ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <Icon size={14} /> {opt.label}
                      {isSel && <CheckCircle2 size={13} className="ml-auto text-foreground" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'gainers' &&
            (topGainers.length ? (
              <div className="rounded-2xl border border-border bg-card px-4 py-1 shadow-sm">
                <div className="flex items-center justify-between py-3">
                  <h2 className="text-[11px] font-black uppercase tracking-widest text-primary">Top Gainers</h2>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">This Week</span>
                </div>
                <div className="border-t border-border/50">
                  {topGainers.map((row, i) => (
                    <RankItem key={row.id} row={row} rank={i + 1} index={i} />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="No accounts yet." body="Once dossiers are opened, the top-ranked accounts will appear here in real time." />
            ))}

          {activeTab === 'losers' &&
            (underFire.length ? (
              <div className="rounded-2xl border border-border bg-card px-4 py-1 shadow-sm">
                <div className="flex items-center justify-between py-3">
                  <h2 className="text-[11px] font-black uppercase tracking-widest text-destructive">Under Fire</h2>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">This Week</span>
                </div>
                <div className="border-t border-border/50">
                  {underFire.map((row, i) => (
                    <RankItem key={row.id} row={row} rank={i + 1} index={i} isNegative />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="No accounts under fire." body="Negative reports lower scores below the baseline; none are flagged yet." />
            ))}

          {activeTab === 'archived' && (
            <EmptyState title="No archived legends yet." body="Once an account is archived, it will appear here for posterity." />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Archive size={22} className="text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-[15px] font-black">Archived Legends</h3>
            <p className="text-[11px] text-muted-foreground">See best & worst of all time. (Documented only)</p>
          </div>
        </div>
        <button
          onClick={() => setActiveTab('archived')}
          className="rounded-full border border-border bg-background px-4 py-2 text-[12px] font-bold transition-all hover:bg-muted active:scale-95"
        >
          View
        </button>
      </div>
    </>
  );
}
