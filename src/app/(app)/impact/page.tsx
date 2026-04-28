'use client';

import { motion } from 'framer-motion';
import { Target, TrendingUp, Users, Activity, ExternalLink } from 'lucide-react';
import { ImpactOverview } from '@/components/profile/ImpactOverview';
import { CivilImpactDrivers } from '@/components/profile/CivilImpactDrivers';
import Link from 'next/link';

export default function ImpactPage() {
  return (
    <main className="min-h-screen bg-background pb-24 pt-8 px-4 lg:px-12">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[12px] font-bold uppercase tracking-wider">
            <Target size={14} /> Global Impact
          </div>
          <h1 className="text-[32px] md:text-[48px] font-serif font-black text-foreground leading-tight">
            The sum of all actions.
          </h1>
          <p className="text-[15px] text-muted-foreground max-w-2xl leading-relaxed">
            This is the aggregated impact of every event, report, and decision made on the platform. It represents the collective state of civil behavior.
          </p>
        </header>

        {/* Aggregated Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Activity size={20} />
              </div>
              <h3 className="font-bold text-[14px]">Total Events</h3>
            </div>
            <div className="text-[36px] font-black font-serif text-foreground">84,210</div>
            <p className="text-[12px] text-primary font-bold mt-1">+1,204 this week</p>
          </div>

          <div className="rounded-[24px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <TrendingUp size={20} />
              </div>
              <h3 className="font-bold text-[14px]">Net Momentum</h3>
            </div>
            <div className="text-[36px] font-black font-serif text-foreground">+12.4%</div>
            <p className="text-[12px] text-blue-500 font-bold mt-1">Growth factor applied</p>
          </div>

          <div className="rounded-[24px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Users size={20} />
              </div>
              <h3 className="font-bold text-[14px]">Active Profiles</h3>
            </div>
            <div className="text-[36px] font-black font-serif text-foreground">1,402</div>
            <p className="text-[12px] text-purple-500 font-bold mt-1">Under public ledger</p>
          </div>
        </div>

        {/* Global Impact Charts */}
        <section className="rounded-[32px] border border-border bg-card p-6 md:p-10 shadow-sm">
          <h2 className="text-[20px] font-bold mb-6">Global Impact Categories</h2>
          <ImpactOverview />
        </section>

        {/* Philosophy / Drivers */}
        <section className="rounded-[32px] border border-border bg-card p-6 md:p-10 shadow-sm">
          <h2 className="text-[20px] font-bold mb-2">The Framework</h2>
          <p className="text-[14px] text-muted-foreground mb-8">The drivers that define the multipliers across all profiles.</p>
          <CivilImpactDrivers />
        </section>
      </div>
    </main>
  );
}
