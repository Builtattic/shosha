'use client';

import { useMemo, useState } from 'react';
import { D3AreaChart } from '@/components/viz/D3AreaChart';
import { D3ActivityBar } from '@/components/viz/D3ActivityBar';
import { SwipeScoreBreakdownCard, type SwipeAggregate } from '@/components/profile/SwipeScoreBreakdownCard';
import { Briefcase, Globe2, Info, Minus, ShieldAlert, ThumbsDown, ThumbsUp, TrendingUp, UsersRound } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

type HistoryPoint = {
  t?: string;
  s?: number;
  delta?: number;
  category?: string;
  deed?: string;
};

type FilingPoint = {
  id: string;
  title: string;
  category: string;
  delta: number;
  type: 'positive' | 'negative';
  status?: string;
  createdAt?: string;
  mediaUrl?: string;
  thumbUrl?: string;
  evidenceSourceUrl?: string;
};

type Range = '1D' | '1W' | '1M';

function rangeMs(range: Range) {
  if (range === '1D') return 24 * 60 * 60 * 1000;
  if (range === '1W') return 7 * 24 * 60 * 60 * 1000;
  return 30 * 24 * 60 * 60 * 1000;
}

function dayKey(value?: string) {
  const d = value ? new Date(value) : new Date();
  if (!Number.isFinite(d.getTime())) return 'Unknown date';
  return d.toISOString().slice(0, 10);
}

function compact(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString();
}

function compactSigned(value: number) {
  const abs = Math.abs(value);
  const sign = value >= 0 ? '+' : '-';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${abs.toLocaleString()}`;
}

function actionThumb(filing: FilingPoint) {
  return filing.thumbUrl || filing.mediaUrl || filing.evidenceSourceUrl || '';
}

type BucketKey = 'extreme' | 'systemic' | 'professional' | 'community';

const BUCKETS: Record<BucketKey, {
  label: string;
  icon: any;
  categories: string[];
  colors: { iconBg: string; iconText: string; deltaBg: string; deltaText: string };
}> = {
  extreme: {
    label: 'Extreme impact',
    icon: ShieldAlert,
    categories: ['Extreme Impact', 'Legal | Criminal', 'Health | Safety'],
    colors: {
      iconBg: 'bg-violet-100 dark:bg-violet-900/30',
      iconText: 'text-violet-600 dark:text-violet-400',
      deltaBg: 'bg-violet-100 dark:bg-violet-900/30',
      deltaText: 'text-violet-700 dark:text-violet-300',
    },
  },
  systemic: {
    label: 'Large scale / systemic',
    icon: Globe2,
    categories: ['Large Scale | Systemic', 'Online Behavior'],
    colors: {
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconText: 'text-blue-600 dark:text-blue-400',
      deltaBg: 'bg-blue-100 dark:bg-blue-900/30',
      deltaText: 'text-blue-700 dark:text-blue-300',
    },
  },
  professional: {
    label: 'Professional / power use',
    icon: Briefcase,
    categories: ['Professional | Power Use', 'Financial | Transactional'],
    colors: {
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconText: 'text-green-600 dark:text-green-400',
      deltaBg: 'bg-green-100 dark:bg-green-900/30',
      deltaText: 'text-green-700 dark:text-green-300',
    },
  },
  community: {
    label: 'Community / public impact',
    icon: UsersRound,
    categories: ['Community | Public Impact', 'Social | Interpersonal', 'Micro | Everyday Actions'],
    colors: {
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconText: 'text-amber-600 dark:text-amber-400',
      deltaBg: 'bg-amber-100 dark:bg-amber-900/30',
      deltaText: 'text-amber-700 dark:text-amber-300',
    },
  },
};

const CATEGORY_TO_BUCKET = new Map<string, BucketKey>(
  Object.entries(BUCKETS).flatMap(([bucket, cfg]) =>
    cfg.categories.map((category) => [category.toLowerCase(), bucket as BucketKey])
  )
);

export function ProfileImpactAnalytics({
  history,
  filings,
  showGraph = true,
  showImpactDetails = true,
  swipeAggregate,
  totalScore,
}: {
  history: HistoryPoint[];
  filings: FilingPoint[];
  showGraph?: boolean;
  showImpactDetails?: boolean;
  swipeAggregate?: SwipeAggregate;
  totalScore?: number;
}) {
  const [range, setRange] = useState<Range>('1W');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const rangedHistory = useMemo(() => {
    const cutoff = Date.now() - rangeMs(range);
    const points = history
      .filter((point) => point.t && typeof point.s === 'number' && new Date(point.t).getTime() >= cutoff)
      .map((point) => ({ date: new Date(point.t!), value: point.s! }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    if (points.length >= 2) return points;
    return history
      .filter((point) => point.t && typeof point.s === 'number')
      .slice(-2)
      .map((point) => ({ date: new Date(point.t!), value: point.s! }));
  }, [history, range]);

  const dailyDeltas = useMemo(() => {
    const map = new Map<string, number>();
    for (const point of history) {
      if (typeof point.delta !== 'number') continue;
      const key = dayKey(point.t);
      map.set(key, (map.get(key) ?? 0) + point.delta);
    }
    return Array.from(map.entries())
      .map(([date, delta]) => ({ date, delta }))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 10);
  }, [history]);

  const categoryBreakdown = useMemo(() => {
    const positive = filings.filter((filing) => filing.delta > 0);
    const total = positive.reduce((sum, filing) => sum + filing.delta, 0) || 1;
    const map = new Map<string, number>();
    for (const filing of positive) {
      map.set(filing.category || 'Uncategorized', (map.get(filing.category || 'Uncategorized') ?? 0) + filing.delta);
    }
    return Array.from(map.entries())
      .map(([category, value]) => ({ category, value, pct: Math.round((value / total) * 100) }))
      .sort((a, b) => b.value - a.value);
  }, [filings]);

  const topActions = filings
    .filter((filing) => {
      // Keep filtering strict to avoid hiding legitimate approved reports.
      if (filing.status && filing.status !== 'approved') return false;
      if ((filing.title || '').trim().toLowerCase() === 'seed') return false;
      return true;
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);
  const positives = filings.filter((filing) => filing.type === 'positive').length;
  const negatives = filings.filter((filing) => filing.type === 'negative').length;
  const neutral = Math.max(0, filings.length - positives - negatives);
  const bucketKpis = useMemo(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const valueByBucket = new Map<BucketKey, number>([
      ['extreme', 0],
      ['systemic', 0],
      ['professional', 0],
      ['community', 0],
    ]);
    const deltaByBucket = new Map<BucketKey, number>([
      ['extreme', 0],
      ['systemic', 0],
      ['professional', 0],
      ['community', 0],
    ]);

    filings.forEach((filing) => {
      const categoryKey = String(filing.category ?? '').trim().toLowerCase();
      const bucket = CATEGORY_TO_BUCKET.get(categoryKey);
      if (!bucket) return;
      valueByBucket.set(bucket, (valueByBucket.get(bucket) ?? 0) + Math.abs(filing.delta));
      const t = filing.createdAt ? new Date(filing.createdAt).getTime() : Number.NaN;
      if (Number.isFinite(t) && t >= monthStart) {
        deltaByBucket.set(bucket, (deltaByBucket.get(bucket) ?? 0) + 1);
      }
    });

    return (Object.keys(BUCKETS) as BucketKey[]).map((key) => ({
      key,
      value: valueByBucket.get(key) ?? 0,
      monthDelta: deltaByBucket.get(key) ?? 0,
    }));
  }, [filings]);
  const conic = categoryBreakdown.slice(0, 5).reduce(
    (acc, item, index) => {
      const colors = ['#22c55e', '#1a1a1a', '#60a5fa', '#a855f7', '#f59e0b'];
      const start = acc.offset;
      const end = start + item.pct;
      acc.parts.push(`${colors[index]} ${start}% ${end}%`);
      acc.offset = end;
      return acc;
    },
    { offset: 0, parts: [] as string[] }
  ).parts.join(', ');

  return (
    <div className="space-y-5">
      {showGraph && (
      <section className="rounded-2xl bg-background p-5 border border-zinc-100 dark:border-zinc-800">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[16px] font-bold text-foreground">Score History</h3>
            <p className="mt-1 text-[12px] text-muted-foreground">Tap the chart or daily rows to inspect deltas.</p>
          </div>
          <div className="flex rounded-full border border-border bg-card p-1">
            {(['1D', '1W', '1M'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRange(option)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[11px] font-black transition-colors',
                  range === option ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        {rangedHistory.length >= 2 ? (
          <D3AreaChart data={rangedHistory} height={220} rangeMode={range === '1W' ? 'weekly' : 'max'} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-[13px] text-muted-foreground">
            No score movement in this range.
          </div>
        )}
      </section>
      )}

      {showGraph &&
        swipeAggregate &&
        (swipeAggregate.aligns > 0 || swipeAggregate.opposes > 0) &&
        typeof totalScore === 'number' && (
          <SwipeScoreBreakdownCard swipeAggregate={swipeAggregate} totalScore={totalScore} />
        )}

      {showGraph && (
      <section className="rounded-2xl bg-background p-5 border border-zinc-100 dark:border-zinc-800">
        <div className="mb-4 flex items-center gap-2">
          <h3 className="text-[16px] font-bold text-foreground">Activity Breakdown</h3>
          <Info size={14} className="text-muted-foreground" />
        </div>
        <D3ActivityBar positive={positives} negative={negatives} neutral={neutral} height={10} />
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-500/15 text-green-500">
              <ThumbsUp size={14} />
            </span>
            <div>
              <p className="text-[20px] font-semibold leading-none text-foreground tabular-nums">{positives}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Positive</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500/15 text-red-500">
              <ThumbsDown size={14} />
            </span>
            <div>
              <p className="text-[20px] font-semibold leading-none text-foreground tabular-nums">{negatives}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Negative</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-500/15 text-zinc-500">
              <Minus size={14} />
            </span>
            <div>
              <p className="text-[20px] font-semibold leading-none text-foreground tabular-nums">{neutral}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Neutral</p>
            </div>
          </div>
        </div>
      </section>
      )}

      {showImpactDetails && (
        <section className="rounded-2xl bg-background p-5 border border-zinc-100 dark:border-zinc-800">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-[16px] font-bold text-foreground">Impact Overview</h3>
            <Info size={14} className="text-muted-foreground" />
          </div>
          <p className="mb-4 text-[12px] text-muted-foreground">The real world impact created through actions</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {bucketKpis.map((kpi) => {
              const cfg = BUCKETS[kpi.key];
              const Icon = cfg.icon;
              return (
                <div key={kpi.key} className="rounded-xl border border-zinc-100 bg-card p-3 dark:border-zinc-800">
                  <span className={cn('mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full', cfg.colors.iconBg, cfg.colors.iconText)}>
                    <Icon size={18} />
                  </span>
                  <p className="text-[29px] font-black leading-none text-foreground">{compact(kpi.value)}</p>
                  <p className="mt-1 text-[11px] font-medium text-muted-foreground">{cfg.label}</p>
                  <span className={cn('mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold', cfg.colors.deltaBg, cfg.colors.deltaText)}>
                    <TrendingUp size={12} />
                    {compactSigned(kpi.monthDelta)} this month
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {showImpactDetails && (
      <section className="rounded-2xl bg-background p-5 border border-zinc-100 dark:border-zinc-800">
        <h3 className="text-[16px] font-bold text-foreground">Top Impact Categories</h3>
        <div className="mt-5 grid gap-5 sm:grid-cols-[160px_1fr] sm:items-center">
          <div
            className="mx-auto h-36 w-36 rounded-full border border-border"
            style={{ background: conic ? `conic-gradient(${conic})` : 'var(--muted)' }}
            aria-label="Positive impact category pie chart"
          />
          <div className="space-y-2">
            {categoryBreakdown.slice(0, 4).map((item) => (
              <div key={item.category} className="flex items-center justify-between gap-3 rounded-2xl bg-card px-3 py-2">
                <span className="line-clamp-1 text-[12px] font-bold text-foreground">{item.category}</span>
                <span className="text-[12px] font-black text-primary">{item.pct}%</span>
              </div>
            ))}
            {categoryBreakdown.slice(4).map((item) => (
              <div key={item.category} className="flex items-center justify-between gap-3 px-3 py-1 text-[12px] text-muted-foreground">
                <span className="line-clamp-1">{item.category}</span>
                <span>{item.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {showImpactDetails && (
      <section className="rounded-2xl bg-background p-5 border border-zinc-100 dark:border-zinc-800">
        <h3 className="text-[16px] font-bold text-foreground">Daily Delta</h3>
        <div className="mt-3 space-y-2">
          {dailyDeltas.map((item) => (
            <button
              key={item.date}
              type="button"
              onClick={() => setSelectedDay(item.date)}
              className={cn(
                'flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-colors',
                selectedDay === item.date ? 'border-foreground bg-muted' : 'border-border bg-background hover:bg-muted/60'
              )}
            >
              <span className="text-[13px] font-bold text-foreground">{formatDate(item.date)}</span>
              <span className={cn('text-[13px] font-black tabular-nums', item.delta >= 0 ? 'text-primary' : 'text-destructive')}>
                {item.delta > 0 ? '+' : ''}{compact(item.delta)}
              </span>
            </button>
          ))}
          {dailyDeltas.length === 0 && <p className="text-[13px] text-muted-foreground">No daily deltas recorded.</p>}
        </div>
      </section>
      )}

      {showImpactDetails && (
      <section className="rounded-2xl bg-background p-5 border border-zinc-100 dark:border-zinc-800">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[16px] font-bold text-foreground">Top Impactful Actions</h3>
          <span className="text-[12px] font-semibold text-muted-foreground">View all</span>
        </div>
        <div className="mt-3 space-y-2">
          {topActions.map((filing) => (
            <div key={filing.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {actionThumb(filing) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={actionThumb(filing)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">
                    No media
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-[14px] font-semibold text-foreground">{filing.title}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {filing.createdAt ? formatDate(filing.createdAt) : 'Recent'}
                </p>
              </div>
              <span className={cn(
                'shrink-0 rounded-xl px-3 py-2 text-right',
                filing.delta >= 0 ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'
              )}>
                <span className="block text-[15px] font-black leading-none">
                  {filing.delta > 0 ? '+' : ''}{compact(filing.delta)}
                </span>
                <span className="mt-1 block text-[10px] font-semibold leading-none opacity-90">
                  Impact
                </span>
              </span>
            </div>
          ))}
          {topActions.length === 0 && <p className="text-[13px] text-muted-foreground">No impactful actions recorded.</p>}
        </div>
      </section>
      )}
    </div>
  );
}
