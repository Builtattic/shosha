'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Flame, Minus, Shield, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { D3ProfileGauge } from '@/components/viz/D3ProfileGauge';
import { BASE_SCORE } from '@/lib/scoring';
import { cn } from '@/lib/utils';

type ScorePoint = {
  t?: string;
  s?: number;
  score?: number;
  delta?: number;
};

type ScoreSnapshot = {
  score: number;
  scoreHistory?: ScorePoint[];
  followers?: string;
  credibility?: number;
  createdAt?: string;
};

function normalizeHistory(snapshot: ScoreSnapshot) {
  const history = Array.isArray(snapshot.scoreHistory) && snapshot.scoreHistory.length
    ? snapshot.scoreHistory.map((point) => ({
        ...point,
        s: typeof point.s === 'number' ? point.s : typeof point.score === 'number' ? point.score : snapshot.score,
      }))
    : [{ t: snapshot.createdAt ?? new Date().toISOString(), s: snapshot.score, delta: 0 }];
  return history;
}

function formatImpact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export function LiveAccountScorePanel({
  accountId,
  initial
}: {
  accountId: string;
  initial: ScoreSnapshot;
}) {
  const [snapshot, setSnapshot] = useState<ScoreSnapshot>(initial);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`, { cache: 'no-store' });
      const payload = response.ok ? await response.json() : null;
      if (payload?.ok && typeof payload.data?.score === 'number') {
        setSnapshot({
          score: payload.data.score,
          scoreHistory: payload.data.scoreHistory,
          followers: payload.data.followers,
          credibility: payload.data.credibility,
          createdAt: payload.data.createdAt,
        });
      }
    } catch {
      // Keep the current score snapshot.
    }
  }, [accountId]);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 10_000);
    const onFocus = () => refresh();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refresh]);

  const stats = useMemo(() => {
    const history = normalizeHistory(snapshot);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weeklyDeltaRaw = history
      .filter((point) => point.t && new Date(point.t).getTime() >= weekAgo)
      .reduce((sum, point) => sum + (point.delta ?? 0), 0);
    const totalPositiveImpact = history.reduce(
      (sum, point) => sum + (point.delta && point.delta > 0 ? point.delta : 0),
      0,
    );
    return {
      weeklyDelta: Number(weeklyDeltaRaw.toFixed(2)),
      totalPositiveImpact,
    };
  }, [snapshot]);

  const credibility = snapshot.credibility ?? 80;

  return (
    <>
      <div className="mt-10 mb-6 flex justify-center">
        <D3ProfileGauge score={snapshot.score ?? BASE_SCORE} minScore={-99000} maxScore={101000} size={340} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="group relative overflow-hidden rounded-[24px] border border-border bg-background p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex flex-col items-center text-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full mb-3',
                stats.weeklyDelta > 0
                  ? 'bg-green-500/10 text-green-500 dark:bg-green-500/20 dark:text-green-400'
                  : stats.weeklyDelta < 0
                    ? 'bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {stats.weeklyDelta > 0 ? (
                <TrendingUp size={16} strokeWidth={2.5} />
              ) : stats.weeklyDelta < 0 ? (
                <TrendingDown size={16} strokeWidth={2.5} />
              ) : (
                <Minus size={16} strokeWidth={2.5} />
              )}
            </div>
            <p
              className={cn(
                'text-[22px] font-black tabular-nums tracking-tight leading-none',
                stats.weeklyDelta > 0 ? 'text-green-600 dark:text-green-400' : stats.weeklyDelta < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground',
              )}
            >
              {stats.weeklyDelta > 0 ? '+' : ''}
              {stats.weeklyDelta.toLocaleString()}
            </p>
            <p className="mt-1 text-[12px] font-bold text-muted-foreground">This Week</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-8 opacity-40 transition-opacity group-hover:opacity-100">
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="h-full w-full">
              <path
                d="M0,20 C20,15 30,5 50,10 C70,15 80,5 100,2 L100,20 Z"
                className={stats.weeklyDelta >= 0 ? 'fill-green-500/20' : 'fill-red-500/20'}
              />
              <path
                d="M0,20 C20,15 30,5 50,10 C70,15 80,5 100,2"
                fill="none"
                className={stats.weeklyDelta >= 0 ? 'stroke-green-500' : 'stroke-red-500'}
                strokeWidth="1.5"
              />
            </svg>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-[24px] border border-border bg-background p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full mb-3 bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400">
              <Flame size={16} strokeWidth={2.5} />
            </div>
            <p className="text-[22px] font-black tabular-nums tracking-tight leading-none text-foreground">
              {formatImpact(stats.totalPositiveImpact)}
            </p>
            <p className="mt-1 text-[12px] font-bold text-muted-foreground">Total Impact</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-8 opacity-40 transition-opacity group-hover:opacity-100">
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="h-full w-full">
              <path d="M0,20 C20,10 40,18 60,8 C80,-2 90,12 100,5 L100,20 Z" className="fill-red-500/20" />
              <path d="M0,20 C20,10 40,18 60,8 C80,-2 90,12 100,5" fill="none" className="stroke-red-500" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        <div className="rounded-[24px] border border-border bg-background p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex flex-col items-center text-center h-full justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full mb-3 bg-muted text-foreground">
              <Users size={16} strokeWidth={2.5} />
            </div>
            <p className="text-[22px] font-black tabular-nums tracking-tight leading-none text-foreground">
              {snapshot.followers || '-'}
            </p>
            <p className="mt-1 text-[12px] font-bold text-muted-foreground">Followers</p>
          </div>
        </div>

        <div className="rounded-[24px] border border-border bg-background p-4 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full mb-3 bg-muted text-foreground">
              <Shield size={16} strokeWidth={2.5} />
            </div>
            <p className="text-[22px] font-black tabular-nums tracking-tight leading-none text-foreground">
              {credibility}%
            </p>
            <p className="mt-1 text-[12px] font-bold text-muted-foreground">Credibility</p>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-all duration-1000 ease-out"
              style={{ width: `${credibility}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
