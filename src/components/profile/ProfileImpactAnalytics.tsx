'use client';

import { useMemo, useState } from 'react';
import { D3AreaChart } from '@/components/viz/D3AreaChart';
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
  createdAt?: string;
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

export function ProfileImpactAnalytics({
  history,
  filings,
}: {
  history: HistoryPoint[];
  filings: FilingPoint[];
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

  const topPositive = filings
    .filter((filing) => filing.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);
  const positives = filings.filter((filing) => filing.type === 'positive').length;
  const negatives = filings.filter((filing) => filing.type === 'negative').length;
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
      <section className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
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

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Positive Reports</p>
          <p className="mt-1 text-[24px] font-black text-primary">{positives}</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Negative Reports</p>
          <p className="mt-1 text-[24px] font-black text-destructive">{negatives}</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Daily Deltas</p>
          <p className="mt-1 text-[24px] font-black text-foreground">{dailyDeltas.length}</p>
        </div>
      </section>

      <section className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
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

      <section className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
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

      <section className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
        <h3 className="text-[16px] font-bold text-foreground">Top Positive Scores</h3>
        <div className="mt-3 space-y-2">
          {topPositive.map((filing) => (
            <div key={filing.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3">
              <div className="min-w-0">
                <p className="line-clamp-1 text-[13px] font-bold text-foreground">{filing.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{filing.category}</p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-black text-primary">
                +{compact(filing.delta)}
              </span>
            </div>
          ))}
          {topPositive.length === 0 && <p className="text-[13px] text-muted-foreground">No positive scores recorded.</p>}
        </div>
      </section>
    </div>
  );
}
