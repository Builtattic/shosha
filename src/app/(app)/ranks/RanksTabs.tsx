'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Flame, CloudLightning, Archive, ChevronDown, CheckCircle2, TrendingUp, TrendingDown, Globe } from 'lucide-react';
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

function RankItem({ row, rank, isNegative = false }: { row: RankRow; rank: number; isNegative?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between border-b border-border/50 py-4"
    >
      <Link href={`/account/${row.id}`} className="flex items-center gap-4 flex-1 min-w-0">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md text-[14px] font-bold shrink-0',
            isNegative ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          )}
        >
          {rank}
        </div>

        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-12 w-12 overflow-hidden rounded-full border border-border shrink-0">
            <img src={row.avatar} alt={row.name} className="h-full w-full object-cover" />
            {row.isVerified && (
              <div className="absolute bottom-0 right-0 rounded-full bg-background p-0.5">
                <CheckCircle2 size={12} className="text-foreground fill-foreground/10" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[15px] font-bold text-foreground truncate">{row.name}</span>
              {row.isVerified && <CheckCircle2 size={14} className="text-foreground shrink-0" />}
            </div>
            <p className="text-[12px] text-muted-foreground truncate">@{row.handle}</p>
            <p className="text-[11px] text-muted-foreground/60 capitalize">{row.platform}</p>
          </div>
        </div>
      </Link>

      <div className="text-right shrink-0 pl-3">
        <div className="text-[18px] font-bold text-foreground">{row.score.toLocaleString()}</div>
        <div className="text-[11px] text-muted-foreground">Shosha Score</div>
        <div
          className={cn(
            'flex items-center justify-end gap-1 text-[11px] font-bold',
            row.change < 0 ? 'text-destructive' : row.change > 0 ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {row.change < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
          {row.change > 0 ? '+' : ''}
          {row.change.toLocaleString()} (This Week)
        </div>
      </div>
    </motion.div>
  );
}

export function RanksTabs({ topGainers, underFire }: { topGainers: RankRow[]; underFire: RankRow[] }) {
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers' | 'archived'>('gainers');

  return (
    <>
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab('gainers')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-[16px] border py-3 transition-all',
            activeTab === 'gainers'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-card text-muted-foreground'
          )}
        >
          <Flame size={18} />
          <div className="text-left">
            <div className="text-[13px] font-bold">On Fire</div>
            <div className="text-[10px] opacity-70">Top Gainers</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('losers')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-[16px] border py-3 transition-all',
            activeTab === 'losers'
              ? 'border-destructive bg-destructive/10 text-destructive'
              : 'border-border bg-card text-muted-foreground'
          )}
        >
          <CloudLightning size={18} />
          <div className="text-left">
            <div className="text-[13px] font-bold">Under Fire</div>
            <div className="text-[10px] opacity-70">Taking Hits</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('archived')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-[16px] border py-3 transition-all',
            activeTab === 'archived'
              ? 'border-foreground bg-muted text-foreground'
              : 'border-border bg-card text-muted-foreground'
          )}
        >
          <Archive size={18} />
          <div className="text-left">
            <div className="text-[13px] font-bold">Archived</div>
            <div className="text-[10px] opacity-70">Legends</div>
          </div>
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-[12px] text-muted-foreground">Real time ranking of public figures based on Shosha Score.</p>
        <button className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-[12px] font-bold">
          <Globe size={14} /> Global <ChevronDown size={14} />
        </button>
      </div>

      {activeTab === 'gainers' &&
        (topGainers.length ? (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[12px] font-bold uppercase tracking-widest text-primary">TOP GAINERS</h2>
            </div>
            <div className="flex flex-col">
              {topGainers.map((row, i) => (
                <RankItem key={row.id} row={row} rank={i + 1} />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState
              title="No accounts yet."
              body="Once dossiers are opened, the top-ranked accounts will appear here in real time."
            />
          </div>
        ))}

      {activeTab === 'losers' &&
        (underFire.length ? (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[12px] font-bold uppercase tracking-widest text-destructive">UNDER FIRE</h2>
            </div>
            <div className="flex flex-col">
              {underFire.map((row, i) => (
                <RankItem key={row.id} row={row} rank={i + 1} isNegative />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState
              title="No accounts under fire."
              body="Negative reports lower scores below the baseline; none are flagged yet."
            />
          </div>
        ))}

      {activeTab === 'archived' && (
        <div className="mt-8">
          <EmptyState
            title="No archived legends yet."
            body="Once an account is archived, it will appear here for posterity."
          />
        </div>
      )}

      <div className="mt-12 rounded-[16px] border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Archive size={24} className="text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold">Archived Legends</h3>
              <p className="text-[12px] text-muted-foreground">See best & worst of all time. (Documented only)</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
