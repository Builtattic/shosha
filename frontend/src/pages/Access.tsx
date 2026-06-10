import { useState } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Note: V1 has more milestone levels — these are representative; expand when design is finalized

const REWARDS = [
  {
    score: 5000,
    title: 'Certified Dossier Creator',
    description: 'Your reports carry extra weight in the algorithm.',
    icon: '🏆',
  },
  {
    score: 20000,
    title: 'Verified Impact Maker',
    description: 'Your profile gets a verified badge.',
    icon: '✅',
  },
  {
    score: 50000,
    title: 'Community Pillar',
    description: 'Unlock advanced dispute resolution tools.',
    icon: '🏛️',
  },
  {
    score: 100000,
    title: 'Shosha Legend',
    description: 'Lifetime recognition on the leaderboard.',
    icon: '⭐',
  },
];

const CONSEQUENCES = [
  {
    score: -5000,
    title: 'Credibility Warning',
    description: 'Your reports are flagged for extra review.',
    icon: '⚠️',
  },
  {
    score: -20000,
    title: 'Restricted Creator',
    description: 'Report creation rate limited.',
    icon: '🚫',
  },
  {
    score: -50000,
    title: 'Community Watch',
    description: 'Your account is under active moderation.',
    icon: '👁️',
  },
  {
    score: -100000,
    title: 'Platform Exclusion',
    description: 'Account may be removed.',
    icon: '❌',
  },
];

type Milestone = (typeof REWARDS)[number];

function MilestoneRow({ item, variant }: { item: Milestone; variant: 'reward' | 'consequence' }) {
  const isReward = variant === 'reward';
  const abs = Math.abs(item.score);
  const scoreStr = `${isReward ? '+' : '−'}${abs.toLocaleString()} pts`;

  return (
    <div className="flex items-center gap-4 border-b border-border/50 px-4 py-4 last:border-0">
      <span className="text-2xl shrink-0" aria-hidden>
        {item.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold text-foreground">{item.title}</p>
        <p className="text-[12px] text-muted-foreground mt-0.5">{item.description}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span
          className={cn(
            'text-[18px] font-black tabular-nums leading-none',
            isReward ? 'text-emerald-600' : 'text-destructive',
          )}
        >
          {scoreStr}
        </span>
        <span className="flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
          <Lock size={9} />
          Reach threshold to unlock
        </span>
      </div>
    </div>
  );
}

export default function Access() {
  const [activeTab, setActiveTab] = useState<'rewards' | 'consequences'>('rewards');
  const items = activeTab === 'rewards' ? REWARDS : CONSEQUENCES;

  return (
    <main className="min-h-screen bg-background safe-bottom pb-20 md:pb-8">
      <div className="mx-auto max-w-2xl px-4 pt-5">
        <div className="mb-6">
          <h1 className="font-serif text-[28px] font-black leading-none tracking-tight text-foreground">
            ACCESS
          </h1>
          <p className="mt-1 text-[13px] font-semibold text-foreground">
            First to these milestones can redeem.
          </p>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Your score unlocks rewards, experiences, consequences &amp; coping mechanisms.
          </p>
        </div>

        <div className="mb-5 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('rewards')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-2xl border py-3 text-[13px] font-black transition-all',
              activeTab === 'rewards'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-border bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            Rewards
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('consequences')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-2xl border py-3 text-[13px] font-black transition-all',
              activeTab === 'consequences'
                ? 'border-red-200 bg-red-50 text-red-600'
                : 'border-border bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            Consequences
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div
            className={cn(
              'border-b px-4 py-3 rounded-t-2xl',
              activeTab === 'rewards'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-600',
            )}
          >
            <p className="text-[11px] font-black uppercase tracking-widest">
              {activeTab === 'rewards' ? 'Rewards (+)' : 'Consequences (−)'}
            </p>
          </div>
          {items.map((item) => (
            <MilestoneRow
              key={item.title}
              item={item}
              variant={activeTab === 'rewards' ? 'reward' : 'consequence'}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
