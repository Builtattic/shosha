import { useMemo } from 'react';
import { Info } from 'lucide-react';
import D3AreaChart from '@/components/viz/D3AreaChart';
import D3ActivityBar from '@/components/viz/D3ActivityBar';
import SwipeScoreBreakdownCard from '@/components/profile/SwipeScoreBreakdownCard';
import { cn, formatDate } from '@/lib/utils';

export interface HistoryPoint {
  t?: string;
  s?: number;
  delta?: number;
  category?: string;
  deed?: string;
}

export interface FilingPoint {
  id: string;
  title: string;
  category: string;
  delta: number;
  type: 'positive' | 'negative';
  status?: string;
  created_at?: string;
}

interface ProfileImpactAnalyticsProps {
  history?: HistoryPoint[];
  filings?: FilingPoint[];
  showGraph?: boolean;
  showImpactDetails?: boolean;
  swipeAggregate?: { score: number; aligns: number; opposes: number } | null;
  totalScore?: number;
}

function compact(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString();
}

export default function ProfileImpactAnalytics({
  history = [],
  filings = [],
  showGraph = true,
  showImpactDetails = true,
  swipeAggregate,
  totalScore,
}: ProfileImpactAnalyticsProps) {
  const chartData = useMemo(
    () =>
      history
        .filter((p) => p.t && typeof p.s === 'number')
        .map((p) => ({ date: new Date(p.t!), value: p.s! }))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [history],
  );

  const positives = filings.filter((f) => f.type === 'positive').length;
  const negatives = filings.filter((f) => f.type === 'negative').length;
  const neutral = Math.max(0, filings.length - positives - negatives);

  const categoryBreakdown = useMemo(() => {
    const positive = filings.filter((f) => f.delta > 0);
    const total = positive.reduce((sum, f) => sum + f.delta, 0) || 1;
    const map = new Map<string, number>();
    for (const f of positive) {
      const cat = f.category || 'Uncategorized';
      map.set(cat, (map.get(cat) ?? 0) + f.delta);
    }
    return Array.from(map.entries())
      .map(([category, value]) => ({
        category,
        value,
        pct: Math.round((value / total) * 100),
      }))
      .sort((a, b) => b.value - a.value);
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
    { offset: 0, parts: [] as string[] },
  ).parts.join(', ');

  const dailyDeltas = useMemo(() => {
    const map = new Map<string, number>();
    for (const point of history) {
      if (typeof point.delta !== 'number') continue;
      const key = point.t ? new Date(point.t).toISOString().slice(0, 10) : 'Unknown';
      map.set(key, (map.get(key) ?? 0) + point.delta);
    }
    return Array.from(map.entries())
      .map(([date, delta]) => ({ date, delta }))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 10);
  }, [history]);

  const topActions = filings
    .filter((f) => !f.status || f.status === 'approved' || f.status === 'APPROVED')
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  const avgDelta =
    filings.length > 0
      ? filings.reduce((s, f) => s + f.delta, 0) / filings.length
      : 0;

  return (
    <div className="space-y-5">
      {showGraph && (
        <section className="rounded-2xl border border-zinc-100 bg-background p-5 dark:border-zinc-800">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[16px] font-bold text-foreground">Score History</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {/* TODO: add range selector (1D / 1W / 1M) */}
                Score movement over time
              </p>
            </div>
          </div>
          {chartData.length >= 2 ? (
            <D3AreaChart data={chartData} height={220} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-[13px] text-muted-foreground">
              No score movement recorded.
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
        <section className="rounded-2xl border border-zinc-100 bg-background p-5 dark:border-zinc-800">
          <div className="mb-4 flex items-center gap-2">
            <h3 className="text-[16px] font-bold text-foreground">Activity Breakdown</h3>
            <Info size={14} className="text-muted-foreground" />
          </div>
          <D3ActivityBar positive={positives} negative={negatives} neutral={neutral} height={10} />
        </section>
      )}

      {showImpactDetails && (
        <>
          <section className="rounded-2xl border border-zinc-100 bg-background p-5 dark:border-zinc-800">
            <h3 className="mb-4 text-[16px] font-bold text-foreground">Impact Overview</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Total</p>
                <p className="text-2xl font-black">{filings.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Positive</p>
                <p className="text-2xl font-black text-green-600">{positives}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Negative</p>
                <p className="text-2xl font-black text-red-500">{negatives}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Avg delta</p>
                <p className="text-2xl font-black">{compact(avgDelta)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-100 bg-background p-5 dark:border-zinc-800">
            <h3 className="text-[16px] font-bold text-foreground">Top Impact Categories</h3>
            <div className="mt-5 grid gap-5 sm:grid-cols-[160px_1fr] sm:items-center">
              <div
                className="mx-auto h-36 w-36 rounded-full border border-border"
                style={{ background: conic ? `conic-gradient(${conic})` : 'var(--muted)' }}
                aria-label="Category breakdown"
              />
              <div className="space-y-2">
                {categoryBreakdown.slice(0, 5).map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-card px-3 py-2"
                  >
                    <span className="line-clamp-1 text-[12px] font-bold">{item.category}</span>
                    <span className="text-[12px] font-black text-primary">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-100 bg-background p-5 dark:border-zinc-800">
            <h3 className="text-[16px] font-bold text-foreground">Daily Delta</h3>
            <div className="mt-3 space-y-2">
              {dailyDeltas.map((item) => (
                <div
                  key={item.date}
                  className="flex w-full items-center justify-between rounded-2xl border border-border px-3 py-2.5"
                >
                  <span className="text-[13px] font-bold">{formatDate(item.date)}</span>
                  <span
                    className={cn(
                      'text-[13px] font-black tabular-nums',
                      item.delta >= 0 ? 'text-primary' : 'text-destructive',
                    )}
                  >
                    {item.delta > 0 ? '+' : ''}
                    {compact(item.delta)}
                  </span>
                </div>
              ))}
              {dailyDeltas.length === 0 && (
                <p className="text-[13px] text-muted-foreground">No daily deltas recorded.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-100 bg-background p-5 dark:border-zinc-800">
            <h3 className="mb-3 text-[16px] font-bold text-foreground">Top Impactful Actions</h3>
            <div className="space-y-2">
              {topActions.map((filing) => (
                <div
                  key={filing.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[14px] font-semibold">{filing.title}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {filing.created_at ? formatDate(filing.created_at) : 'Recent'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-xl px-3 py-2 text-[15px] font-black',
                      filing.delta >= 0
                        ? 'bg-green-500/15 text-green-500'
                        : 'bg-red-500/15 text-red-500',
                    )}
                  >
                    {filing.delta > 0 ? '+' : ''}
                    {compact(filing.delta)}
                  </span>
                </div>
              ))}
              {topActions.length === 0 && (
                <p className="text-[13px] text-muted-foreground">No impactful actions recorded.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
