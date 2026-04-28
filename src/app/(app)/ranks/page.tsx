'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, CloudLightning, Archive, ChevronDown, CheckCircle2, TrendingUp, TrendingDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

type LeaderRow = {
  id: string;
  name: string;
  handle: string;
  role: string;
  avatar: string;
  score: number;
  change: number;
  isVerified: boolean;
};

const topGainers: LeaderRow[] = [
  { id: '1', name: 'MrBeast', handle: 'mrbeast', role: 'Public Figure', avatar: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?w=100&h=100&fit=crop', score: 18420, change: 1842, isVerified: true },
  { id: '2', name: 'Elon Musk', handle: 'elonmusk', role: 'Entrepreneur', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop', score: 14732, change: 1256, isVerified: true },
  { id: '3', name: 'Mark Rober', handle: 'markrober', role: 'Engineer / Creator', avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop', score: 12890, change: 980, isVerified: true },
  { id: '4', name: 'Emma Watson', handle: 'emmawatson', role: 'Actor / Activist', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop', score: 11203, change: 842, isVerified: true },
  { id: '5', name: 'Cristiano Ronaldo', handle: 'cristiano', role: 'Athlete', avatar: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=100&h=100&fit=crop', score: 9876, change: 512, isVerified: true },
];

const underFire: LeaderRow[] = [
  { id: '6', name: 'Andrew Tate', handle: 'cobratate', role: 'Influencer', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', score: -6212, change: -842, isVerified: true },
  { id: '7', name: 'Logan Paul', handle: 'loganpaul', role: 'Influencer / Wrestler', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', score: -4985, change: -612, isVerified: true },
  { id: '8', name: 'Jake Paul', handle: 'jakepaul', role: 'Influencer / Boxer', avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop', score: -4210, change: -505, isVerified: true },
];

function RankItem({ row, rank, isNegative = false }: { row: LeaderRow; rank: number; isNegative?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between border-b border-border/50 py-4"
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md text-[14px] font-bold",
          isNegative ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
        )}>
          {rank}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-full border border-border">
            <img src={row.avatar} alt={row.name} className="h-full w-full object-cover" />
            {row.isVerified && (
              <div className="absolute bottom-0 right-0 rounded-full bg-background p-0.5">
                <CheckCircle2 size={12} className="text-foreground fill-foreground/10" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[15px] font-bold text-foreground">{row.name}</span>
              {row.isVerified && <CheckCircle2 size={14} className="text-foreground" />}
            </div>
            <p className="text-[12px] text-muted-foreground">@{row.handle}</p>
            <p className="text-[11px] text-muted-foreground/60">{row.role}</p>
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="text-[18px] font-bold text-foreground">{row.score.toLocaleString()}</div>
        <div className="text-[11px] text-muted-foreground">Shosha Score</div>
        <div className={cn(
          "flex items-center justify-end gap-1 text-[11px] font-bold",
          isNegative ? "text-destructive" : "text-primary"
        )}>
          {isNegative ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
          {isNegative ? '' : '+'}{row.change.toLocaleString()} (This Week)
        </div>
      </div>
    </motion.div>
  );
}

export default function RanksPage() {
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers' | 'archived'>('gainers');

  return (
    <main className="min-h-screen bg-background p-4 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">Ranks</h1>
        <div className="flex gap-2">
          {/* Action icons could go here */}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab('gainers')}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-[16px] border py-3 transition-all",
            activeTab === 'gainers'
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground"
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
            "flex flex-1 items-center justify-center gap-2 rounded-[16px] border py-3 transition-all",
            activeTab === 'losers'
              ? "border-destructive bg-destructive/10 text-destructive"
              : "border-border bg-card text-muted-foreground"
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
            "flex flex-1 items-center justify-center gap-2 rounded-[16px] border py-3 transition-all",
            activeTab === 'archived'
              ? "border-foreground bg-muted text-foreground"
              : "border-border bg-card text-muted-foreground"
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

      {activeTab === 'gainers' && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[12px] font-bold uppercase tracking-widest text-primary">TOP GAINERS</h2>
          </div>
          <div className="flex flex-col">
            {topGainers.map((row, i) => (
              <RankItem key={row.id} row={row} rank={i + 1} />
            ))}
          </div>
          <button className="mt-6 w-full text-center text-[14px] font-bold text-primary">View All On Fire →</button>
        </div>
      )}

      {activeTab === 'losers' && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[12px] font-bold uppercase tracking-widest text-destructive">UNDER FIRE</h2>
          </div>
          <div className="flex flex-col">
            {underFire.map((row, i) => (
              <RankItem key={row.id} row={row} rank={i + 1} isNegative />
            ))}
          </div>
          <button className="mt-6 w-full text-center text-[14px] font-bold text-destructive">View All Under Fire →</button>
        </div>
      )}

      {/* Archived Legends Section */}
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
          <button className="text-[14px] font-bold text-muted-foreground">View Archived →</button>
        </div>
      </div>
    </main>
  );
}
