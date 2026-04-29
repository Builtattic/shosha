'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type ImpactSummary = {
  totalReports: number;
  positiveReports: number;
  negativeReports: number;
  flaggedReports: number;
  categories: Array<{ label: string; value: number; percentage: number; color: string }>;
};

const CATEGORY_COLORS: Record<string, string> = {
  authenticity: '#7eb89a',
  engagement: '#60a5fa',
  community: '#a78bfa',
  content: '#fb923c',
  impact: '#f472b6',
  harassment: '#f87171',
  misinformation: '#facc15',
  philanthropy: '#34d399',
  professionalism: '#38bdf8',
  controversy: '#fb7185'
};

function colorFor(label: string) {
  return CATEGORY_COLORS[label] ?? '#94a3b8';
}

export function ImpactOverview() {
  const [summary, setSummary] = useState<ImpactSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/impact', { cache: 'no-store' });
        const payload = await res.json();
        if (!cancelled && payload.ok) {
          setSummary(payload.data as ImpactSummary);
        }
      } catch {
        if (!cancelled) {
          setSummary({
            totalReports: 0,
            positiveReports: 0,
            negativeReports: 0,
            flaggedReports: 0,
            categories: []
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(
    () => [
      {
        label: 'Total Filings',
        value: summary?.totalReports ?? 0,
        icon: Activity,
        color: 'text-primary'
      },
      {
        label: 'Positive Filings',
        value: summary?.positiveReports ?? 0,
        icon: ThumbsUp,
        color: 'text-blue-400'
      },
      {
        label: 'Negative Filings',
        value: summary?.negativeReports ?? 0,
        icon: ThumbsDown,
        color: 'text-orange-400'
      },
      {
        label: 'Flagged for Review',
        value: summary?.flaggedReports ?? 0,
        icon: Sparkles,
        color: 'text-purple-400'
      }
    ],
    [summary]
  );

  return (
    <div className="space-y-8 py-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-[18px] font-bold">Impact Overview</h3>
        </div>
        <p className="text-[13px] text-muted-foreground mb-4">
          Aggregated from every filing on the public ledger.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-[20px] border border-border bg-card p-4"
            >
              <div className={cn('mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-muted/50', stat.color)}>
                <stat.icon size={18} />
              </div>
              <h4 className="text-[18px] font-bold">{summary ? stat.value.toLocaleString() : '—'}</h4>
              <p className="text-[11px] text-muted-foreground mb-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-[18px] font-bold">Impact Categories</h3>
        </div>

        <div className="rounded-[24px] border border-border bg-card p-6">
          {summary && summary.categories.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative h-40 w-40">
                <svg viewBox="0 0 100 100" className="h-full w-full transform -rotate-90">
                  {(() => {
                    let offset = 0;
                    return summary.categories.map((cat) => {
                      const node = (
                        <circle
                          key={cat.label}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke={cat.color}
                          strokeWidth="12"
                          strokeDasharray={`${cat.percentage} ${100 - cat.percentage}`}
                          strokeDashoffset={-offset}
                          className="transition-all duration-1000"
                        />
                      );
                      offset += cat.percentage;
                      return node;
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[18px] font-bold">{summary.totalReports.toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Filings</span>
                </div>
              </div>

              <div className="flex-1 space-y-3 w-full">
                {summary.categories.map((cat) => (
                  <div key={cat.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-[13px] font-medium text-muted-foreground capitalize">{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[13px] font-bold">{cat.value.toLocaleString()}</span>
                      <span className="text-[13px] text-muted-foreground w-8 text-right">{cat.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground text-center py-6">
              {summary ? 'No filings have been categorized yet.' : 'Loading…'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export { colorFor };
