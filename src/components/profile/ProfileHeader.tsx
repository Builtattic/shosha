'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Globe, Bell, Share2, MoreHorizontal } from 'lucide-react';
import { ScoreGauge } from '@/components/viz/ScoreGauge';
import { StatCard } from '@/components/profile/StatCard';
import { cn } from '@/lib/utils';

interface ProfileHeaderProps {
  user: {
    name: string;
    handle: string;
    avatar: string;
    isVerified: boolean;
    role: string;
    location: string;
  };
  score: number;
  stats: {
    thisWeek: string;
    totalImpact: string;
    followers: string;
    credibility: string;
  };
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function ProfileHeader({ user, score, stats, activeTab, onTabChange }: ProfileHeaderProps) {
  const tabs = ['Overview', 'Activity', 'Impact', 'About'];

  return (
    <div className="bg-background">
      {/* Top Actions */}
      <div className="flex items-center justify-between px-4 mb-4">
        <button className="rounded-full bg-card p-2 border border-border transition-all hover:bg-muted">
          <Share2 size={20} />
        </button>
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[14px] font-bold transition-all hover:bg-muted active:scale-95">
             Following <Bell size={16} />
           </button>
           <button className="rounded-full bg-card p-2 border border-border transition-all hover:bg-muted">
             <MoreHorizontal size={20} />
           </button>
        </div>
      </div>

      {/* User Info */}
      <div className="flex flex-col items-center px-4 text-center">
        <div className="relative mb-3">
          <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-border p-1 bg-card">
            <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" />
          </div>
          {user.isVerified && (
            <div className="absolute bottom-0 right-0 rounded-full bg-background p-1 border border-border">
              <CheckCircle2 size={20} className="text-primary fill-primary/10" />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <h1 className="text-[24px] font-bold text-foreground">{user.name}</h1>
          {user.isVerified && <CheckCircle2 size={18} className="text-primary fill-primary/10" />}
        </div>
        
        <p className="text-[14px] text-muted-foreground">@{user.handle}</p>
        <p className="mt-1 text-[14px] font-medium text-muted-foreground/80">{user.role}</p>
        
        <div className="mt-2 flex items-center gap-1 text-[12px] text-muted-foreground">
          <Globe size={14} />
          {user.location}
        </div>
      </div>

      {/* Hero Gauge */}
      <div className="mt-6 flex justify-center">
        <ScoreGauge 
          score={score} 
          min={0} 
          max={100000} 
          className="w-full max-w-[400px]" 
        />
      </div>

      {/* Quick Stats Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 px-4 md:grid-cols-4">
        <StatCard label="This Week" value={stats.thisWeek} change="+12.4%" trend="up" />
        <StatCard label="Total Impact" value={stats.totalImpact} trend="up" />
        <StatCard label="Followers" value={stats.followers} trend="up" />
        <StatCard label="Credibility" value={stats.credibility} trend="up" sparklineData={[90, 92, 91, 94, 95, 96, 96]} />
      </div>

      {/* Navigation Tabs */}
      <div className="mt-8 flex border-b border-border overflow-x-auto no-scrollbar scroll-smooth">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange?.(tab)}
            className={cn(
              "relative flex-1 px-6 py-4 text-[14px] font-bold transition-all whitespace-nowrap",
              activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
            {activeTab === tab && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" 
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
