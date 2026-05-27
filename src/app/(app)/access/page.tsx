'use client';


import { useState } from 'react';
import { Lock } from 'lucide-react';
import { MobileAppHeader } from '@/components/nav/MobileAppHeader';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type AccessItem = {
  score: number;
  title: string;
  description: string | string[];
  note?: string | string[];
  icon: string;
};

// ── Data ──────────────────────────────────────────────────────────────────────

const REWARDS: AccessItem[] = [
  {
    score: 5_000,
    title: 'Blue Tick Rental Starter Pack',
    description: 'Free 1-month premium plan for a performative professional networking platform.',
    icon: 'linkedin',
  },
  {
    score: 10_000,
    title: 'Validation Bundle',
    description: '1 month premium subscription to a social media platform where strangers finally admire your breakfast.',
    icon: 'heart',
  },
  {
    score: 15_000,
    title: 'Social Recovery Pack',
    description: 'Premium dating or matrimony subscription of your choice.',
    note: 'Because apparently society outsourced human connection to algorithms.',
    icon: 'users',
  },
  {
    score: 20_000,
    title: 'Capitalist Starter Device',
    description: 'A flagship smartphone with a suspiciously good camera and terrible labor ethics.',
    icon: 'device-mobile',
  },
  {
    score: 25_000,
    title: 'Bali Founder Retreat',
    description: '3-day trip to Bali surrounded by:',
    note: ['startup founders', 'crypto evangelists', 'productivity addicts', 'one guy building "Uber for breathing"'],
    icon: 'beach',
  },
  {
    score: 30_000,
    title: 'Rodent Kingdom Access Pass',
    description: "2 tickets to a globally beloved animated mouse's hyper-commercialized dystopian theme park.",
    icon: 'ticket',
  },
  {
    score: 40_000,
    title: 'Climate Guilt Cleanse',
    description: 'Plant enough trees online to emotionally offset one private jet influencer.',
    icon: 'trees',
  },
  {
    score: 50_000,
    title: 'Public Figure Starter Kit',
    description: ['podcast microphone', 'beige hoodie', 'fake humility', '"building in public" template pack'],
    icon: 'microphone',
  },
  {
    score: 75_000,
    title: 'Legacy Mode',
    description: 'Sponsor a real-world community project in your name through Shosha™.',
    note: 'actual meaningful reward',
    icon: 'building-community',
  },
  {
    score: 100_000,
    title: 'Humanity DLC',
    description: 'Invitation to annual Shosha Impact Summit featuring activists, creators, researchers & verified changemakers.',
    icon: 'users-group',
  },
];

const CONSEQUENCES: AccessItem[] = [
  {
    score: -5_000,
    title: 'Basic Human Decency Course',
    description: 'Interactive lessons covering:',
    note: ['empathy', 'not screaming online', 'returning shopping carts'],
    icon: 'book',
  },
  {
    score: -10_000,
    title: 'Counselling Session',
    description: 'One deeply disappointed conversation with a school teacher.',
    icon: 'user',
  },
  {
    score: -15_000,
    title: 'Psychiatric Combo Pack',
    description: '3 therapy sessions and a complimentary "please reflect" email.',
    icon: 'brain',
  },
  {
    score: -20_000,
    title: 'Spiritual Debugging',
    description: 'One exorcism. To be safe',
    icon: 'sparkles',
  },
  {
    score: -25_000,
    title: 'Internet Timeout',
    description: 'Forced digital detox and temporary confiscation of opinion privileges.',
    icon: 'wifi-off',
  },
  {
    score: -30_000,
    title: 'NPC Rehabilitation Program',
    description: 'Learn:',
    note: ['critical thinking', 'media literacy', 'indoor voice management'],
    icon: 'school',
  },
  {
    score: -40_000,
    title: 'PR Apology Workshop',
    description: 'Includes:',
    note: ['ukulele optional', 'tears mandatory', 'notes app template included'],
    icon: 'microphone-2',
  },
  {
    score: -50_000,
    title: 'Twitter/X Survival Kit',
    description: ['anger management PDFs', 'grass-touching schedule', 'sunlight exposure reminders'],
    icon: 'brand-x',
  },
  {
    score: -75_000,
    title: 'Reputation Witness Protection',
    description: 'Suggested:',
    note: ['move cities', 'change username', 'discover humility'],
    icon: 'shield',
  },
  {
    score: -100_000,
    title: 'Final Boss Package',
    description: 'Congratulations.\nYou are now a case study in ethics presentations.',
    icon: 'alert-triangle',
  },
];

// ── Icon SVGs (Tabler-style) ───────────────────────────────────────────────────

function ItemIcon({ icon, variant }: { icon: string; variant: 'reward' | 'consequence' }) {
  return (
    <div
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
        variant === 'reward'
          ? 'bg-emerald-50 text-emerald-600'
          : 'bg-red-50 text-red-500',
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {getIconPath(icon)}
      </svg>
    </div>
  );
}

function getIconPath(icon: string): React.ReactNode {
  switch (icon) {
    case 'linkedin':      return (<><path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path d="M8 11l0 5" /><path d="M8 8l0 .01" /><path d="M12 16l0 -5" /><path d="M16 16v-3a2 2 0 0 0 -4 0" /></>);
    case 'heart':         return <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />;
    case 'users':         return (<><path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0 -3 -3.85" /></>);
    case 'device-mobile': return (<><path d="M6 5a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-14z" /><path d="M11 17h2" /></>);
    case 'beach':         return (<><path d="M17.553 16.75a7.5 7.5 0 0 0 -10.606 0" /><path d="M18 3.804a6 6 0 0 0 -8.196 2.196l10.392 6a6 6 0 0 0 -2.196 -8.196z" /><path d="M16.732 10c1.658 -2.87 2.268 -5.769 1.268 -6.732c-1 -1 -3.942 -.268 -6.732 1.268" /><path d="M15 9l-3 5.196" /><path d="M3 19.25a2.4 2.4 0 0 1 1 -.25a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 1 .25" /></>);
    case 'ticket':        return (<><path d="M15 5l0 2" /><path d="M15 11l0 2" /><path d="M15 17l0 2" /><path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-3a2 2 0 0 0 0 -4v-3a2 2 0 0 1 2 -2" /></>);
    case 'trees':         return (<><path d="M16 5l3 3l-2 1l4 4l-3 1l4 4h-9" /><path d="M15 21l0 -3" /><path d="M8 13l-2 -2" /><path d="M8 12l2 -2" /><path d="M8 21v-13" /><path d="M5.824 15.995a3 3 0 0 1 -2.743 -3.69a2.998 2.998 0 0 1 .304 -4.833a3 3 0 0 1 4.615 -3.707a3 3 0 0 1 4.614 3.707a2.997 2.997 0 0 1 .305 4.833a3 3 0 0 1 -2.919 3.695h-4.176z" /></>);
    case 'microphone':    return (<><path d="M9 2m0 3a3 3 0 0 1 6 0v5a3 3 0 0 1 -6 0z" /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M8 21l8 0" /><path d="M12 17l0 4" /></>);
    case 'building-community': return (<><path d="M8 9l5 5v7h-5v-4m0 4h-5v-7l5 -5" /><path d="M3 13l4 -4l4 4" /><path d="M18 9l-5 5" /><path d="M15 6m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M21 6m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M18 3m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M15 6l3 -3l3 3" /></>);
    case 'users-group':   return (<><path d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1" /><path d="M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M17 10h2a2 2 0 0 1 2 2v1" /><path d="M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M3 13v-1a2 2 0 0 1 2 -2h2" /></>);
    case 'book':          return (<><path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6l0 13" /><path d="M12 6l0 13" /><path d="M21 6l0 13" /></>);
    case 'user':          return (<><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /></>);
    case 'brain':         return <path d="M15.5 13a3.5 3.5 0 0 0 -3.5 3.5v1a3.5 3.5 0 0 0 7 0v-1.8M8.5 13a3.5 3.5 0 0 1 3.5 3.5v1a3.5 3.5 0 0 1 -7 0v-2.2M7 6.5a3.5 3.5 0 0 1 7 0v5.5a3.5 3.5 0 0 1 -7 0v-.5M12 6.5a3.5 3.5 0 0 1 7 0v5.5a3.5 3.5 0 0 1 -7 0" />;
    case 'sparkles':      return (<><path d="M16 18a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2a2 2 0 0 1 2 2" /><path d="M6 12a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2a2 2 0 0 1 2 2" /><path d="M12 2a2.4 2.4 0 0 1 2 2.4a2.4 2.4 0 0 1 2 -2.4a2.4 2.4 0 0 1 -2 -2.4a2.4 2.4 0 0 1 -2 2.4z" /></>);
    case 'wifi-off':      return (<><path d="M12 18l.01 0" /><path d="M9.172 15.172a4 4 0 0 1 5.656 0" /><path d="M6.343 12.343a7.963 7.963 0 0 1 3.864 -2.14m4.163 .155a7.965 7.965 0 0 1 3.287 2" /><path d="M3.515 9.515a12 12 0 0 1 3.544 -2.455m3.182 -.933a12 12 0 0 1 10.898 3.388" /><path d="M3 3l18 18" /></>);
    case 'school':        return (<><path d="M22 9l-10 -4l-10 4l10 4l10 -4v6" /><path d="M6 10.6v5.4a6 6 0 0 0 12 0v-5.4" /></>);
    case 'microphone-2':  return (<><path d="M9 2m0 3a3 3 0 0 1 6 0v5a3 3 0 0 1 -6 0z" /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M8 21l8 0" /><path d="M12 17l0 4" /><path d="M9 10l6 0" /></>);
    case 'brand-x':       return (<><path d="M4 4l11.733 16h4.267l-11.733 -16z" /><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" /></>);
    case 'shield':        return <path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" />;
    case 'alert-triangle': return (<><path d="M12 9v4" /><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.871l-8.106 -13.534a1.914 1.914 0 0 0 -3.274 0z" /><path d="M12 16h.01" /></>);
    default:              return <circle cx="12" cy="12" r="4" />;
  }
}

// ── Description block ─────────────────────────────────────────────────────────

function DescriptionBlock({
  description,
  note,
  bulletColor,
}: {
  description: string | string[];
  note?: string | string[];
  bulletColor: string;
}) {
  return (
    <div className="space-y-1">
      {/* Main description */}
      {Array.isArray(description) ? (
        <ul className="space-y-0.5">
          {description.map((item) => (
            <li key={item} className="flex items-start gap-1.5 text-[12px] leading-snug text-muted-foreground">
              <span className={cn('mt-[4px] shrink-0 text-[7px]', bulletColor)}>●</span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        description.split('\n').map((line, i) => (
          <p key={i} className="text-[12px] leading-snug text-muted-foreground">{line}</p>
        ))
      )}

      {/* Note: italic string OR bullet array */}
      {Array.isArray(note) ? (
        <ul className="space-y-0.5">
          {note.map((item) => (
            <li key={item} className="flex items-start gap-1.5 text-[12px] leading-snug text-muted-foreground">
              <span className={cn('mt-[4px] shrink-0 text-[7px]', bulletColor)}>●</span>
              {item}
            </li>
          ))}
        </ul>
      ) : note ? (
        <p className="text-[11px] italic text-muted-foreground/60">{note}</p>
      ) : null}
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function AccessRow({ item, variant }: { item: AccessItem; variant: 'reward' | 'consequence' }) {
  const isReward = variant === 'reward';
  const abs = Math.abs(item.score);
  const scoreStr = `${isReward ? '+' : '−'}${abs.toLocaleString()}`;
  const bulletColor = isReward ? 'text-emerald-500' : 'text-red-400';

  return (
    <div className="flex items-center gap-4 border-b border-border/50 px-4 py-4 last:border-0">
      {/* Icon */}
      <ItemIcon icon={item.icon} variant={variant} />

      {/* Middle: title + description */}
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[14px] font-bold leading-tight text-foreground">
          {item.title}
        </p>
        <DescriptionBlock
          description={item.description}
          note={item.note}
          bulletColor={bulletColor}
        />
      </div>

      {/* Right: score + lock button — vertically centred by parent items-center */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span
          className={cn(
            'text-[22px] font-black leading-none tabular-nums',
            isReward ? 'text-emerald-600' : 'text-red-500',
          )}
        >
          {scoreStr}
        </span>
        <span className={cn('text-[10px] font-bold tabular-nums', isReward ? 'text-emerald-600/60' : 'text-red-500/60')}>pts
        </span>
        <button
          type="button"
          disabled
          aria-label="Locked"
          className="flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground/70"
        >
          <Lock size={9} strokeWidth={2.5} />
          Reach pts to unlock
        </button>
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  label,
  variant,
  rounded,
}: {
  label: string;
  variant: 'reward' | 'consequence';
  rounded: 'top' | 'none';
}) {
  const isReward = variant === 'reward';
  return (
    <div
      className={cn(
        'border-b px-4 py-3',
        isReward
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-red-200 bg-red-50',
        rounded === 'top' && 'rounded-t-2xl',
      )}
    >
      <p
        className={cn(
          'text-[11px] font-black uppercase tracking-widest',
          isReward ? 'text-emerald-700' : 'text-red-600',
        )}
      >
        {label}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccessPage() {
  const [tab, setTab] = useState<'rewards' | 'consequences'>('rewards');
  return (
    <main className="min-h-screen bg-background">
      <MobileAppHeader />

      <div className="mx-auto max-w-2xl px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-serif text-[28px] font-black leading-none tracking-tight text-foreground">
            ACCESS
          </h1>
          <p className="mt-1 text-[13px] font-semibold text-foreground">
            First to these milestones can redeem.
          </p>
      
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Your score unlocks rewards, experiences, consequences & coping mechanisms.
          </p>
        </div>

        {/* ── Tab toggle ── */}
        <div className="mb-5 flex gap-2">
          <button
            id="access-tab-rewards"
            type="button"
            onClick={() => setTab('rewards')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-2xl border py-3 text-[13px] font-black transition-all',
              tab === 'rewards'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            <span className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] font-black leading-none',
              tab === 'rewards' ? 'bg-emerald-600 text-white' : 'bg-border text-muted-foreground',
            )}>+</span>
            Rewards
          </button>
          <button
            id="access-tab-consequences"
            type="button"
            onClick={() => setTab('consequences')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-2xl border py-3 text-[13px] font-black transition-all',
              tab === 'consequences'
                ? 'border-red-200 bg-red-50 text-red-600 shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            <span className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] font-black leading-none',
              tab === 'consequences' ? 'bg-red-500 text-white' : 'bg-border text-muted-foreground',
            )}>−</span>
            Consequences
          </button>
        </div>

        {/* ── Active list ── */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <SectionHeader
            label={tab === 'rewards' ? '✦ Rewards (+)' : '✦ Consequences (−)'}
            variant={tab === 'rewards' ? 'reward' : 'consequence'}
            rounded="top"
          />
          {(tab === 'rewards' ? REWARDS : CONSEQUENCES).map((item) => (
            <AccessRow
              key={item.title}
              item={item}
              variant={tab === 'rewards' ? 'reward' : 'consequence'}
            />
          ))}
        </div>

      </div>
    </main>
  );
}
