'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flame, Minus, Shield, Target, ThumbsDown, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { D3ProfileGauge } from '@/components/viz/D3ProfileGauge';
import { BASE_SCORE } from '@/lib/scoring';
import { cn } from '@/lib/utils';
import {
  ConnectionListModal,
  type ConnectionListModalRef,
} from '@/components/profile/ConnectionListModal';

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

export type LinkedUserConnections = {
  userId: string;
  followingCount: number;
  followersCount: number;
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

function formatFollowers(value?: string) {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  if (!Number.isFinite(parsed)) return value || '-';
  if (parsed >= 1_000_000) return `${(parsed / 1_000_000).toFixed(1)}M`;
  if (parsed >= 1_000) return `${(parsed / 1_000).toFixed(1)}K`;
  return parsed.toLocaleString();
}

function formatNumberShort(num: number) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

export function LiveAccountScorePanel({
  accountId,
  initial,
  linkedUserConnections,
}: {
  accountId: string;
  initial: ScoreSnapshot;
  /** When set (e.g. website dossier with linked Shosha user), match /profile gauge + 5-card stats + connections modal. */
  linkedUserConnections?: LinkedUserConnections;
}) {
  const [snapshot, setSnapshot] = useState<ScoreSnapshot>(initial);
  const connectionListModalRef = useRef<ConnectionListModalRef>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`, { cache: 'no-store' });
      const payload = response.ok ? await response.json() : null;
      if (payload?.ok) {
        const nextScore =
          typeof payload.data?.displayScore === 'number'
            ? payload.data.displayScore
            : typeof payload.data?.score === 'number'
              ? payload.data.score
              : null;
        if (nextScore == null) return;
        setSnapshot({
          score: nextScore,
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
  const credibilityDisplay = Math.round(credibility);
  const score = snapshot.score ?? BASE_SCORE;

  const followersCountStr = linkedUserConnections
    ? formatNumberShort(linkedUserConnections.followersCount)
    : '';

  if (linkedUserConnections) {
    return (
      <>
        <ConnectionListModal
          ref={connectionListModalRef}
          targetUserId={linkedUserConnections.userId}
          followingCount={linkedUserConnections.followingCount}
          followersCount={linkedUserConnections.followersCount}
          showInlineTriggers={false}
        />

        <div className="mt-8 relative flex w-full flex-col items-center">
          <div className="relative w-full max-w-[420px]">
            <D3ProfileGauge score={score} minScore={-99000} maxScore={101000} size={420} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-7 sm:pb-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Shosha Score</p>
              <h2 className="mt-1 text-[40px] font-black leading-none text-foreground tabular-nums sm:text-[46px]">
                {score.toLocaleString()}
              </h2>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold shadow-sm',
                    stats.weeklyDelta > 0
                      ? 'bg-green-50 text-green-600'
                      : stats.weeklyDelta < 0
                        ? 'bg-red-50 text-red-600'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {stats.weeklyDelta > 0 ? (
                    <TrendingUp size={14} strokeWidth={3} />
                  ) : stats.weeklyDelta < 0 ? (
                    <ThumbsDown size={14} strokeWidth={3} />
                  ) : (
                    <Minus size={14} strokeWidth={3} />
                  )}
                  {stats.weeklyDelta > 0
                    ? 'Trending up'
                    : stats.weeklyDelta < 0
                      ? 'Trending down'
                      : 'Neutral'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-1 border-b border-border pb-4" />

        <div className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div className="flex min-w-0 flex-col items-center justify-center rounded-2xl border border-border bg-background px-1 py-3 text-center shadow-sm">
            <div
              className={cn(
                'mx-auto flex items-center justify-center',
                stats.weeklyDelta >= 0 ? 'text-green-500' : 'text-red-500',
              )}
            >
              {stats.weeklyDelta >= 0 ? (
                <TrendingUp size={18} strokeWidth={2.5} />
              ) : (
                <ThumbsDown size={18} strokeWidth={2.5} />
              )}
            </div>
            <p
              className={cn(
                'mt-1.5 text-[15px] font-bold tabular-nums sm:text-[17px]',
                stats.weeklyDelta >= 0 ? 'text-green-500' : 'text-red-500',
              )}
            >
              {stats.weeklyDelta > 0 ? '+' : ''}
              {stats.weeklyDelta}
            </p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
              This Week
            </p>
          </div>

          <div className="flex min-w-0 flex-col items-center justify-center rounded-2xl border border-border bg-background px-1 py-3 text-center shadow-sm">
            <div className="mx-auto flex items-center justify-center text-red-500">
              <Target size={18} strokeWidth={2.5} />
            </div>
            <p className="mt-1.5 text-[15px] font-bold text-foreground tabular-nums sm:text-[17px]">
              {formatNumberShort(stats.totalPositiveImpact)}
            </p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
              Total Impact
            </p>
          </div>

          <button
            type="button"
            onClick={() => connectionListModalRef.current?.open('followers')}
            aria-label="View this user’s followers"
            className="flex min-w-0 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-border bg-background px-1 py-3 text-center shadow-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="mx-auto flex items-center justify-center text-foreground">
              <Users size={18} strokeWidth={2.5} />
            </div>
            <p className="mt-1.5 text-[15px] font-bold text-foreground tabular-nums sm:text-[17px]">{followersCountStr}</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
              Followers
            </p>
          </button>

          <div className="flex min-w-0 flex-col items-center justify-center rounded-2xl border border-border bg-background px-1 py-3 text-center shadow-sm">
            <div className="mx-auto flex items-center justify-center text-foreground">
              <Shield size={18} strokeWidth={2.5} />
            </div>
            <p className="mt-1.5 text-[15px] font-bold text-foreground tabular-nums sm:text-[17px]">{credibilityDisplay}%</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
              Credibility
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mt-8 mb-5 flex justify-center">
        <div className="relative w-full max-w-[420px]">
          <D3ProfileGauge score={score} minScore={-99000} maxScore={101000} size={420} />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">SHOSHA SCORE</p>
            <p className="mt-1 text-5xl font-bold leading-none text-foreground tabular-nums">{score.toLocaleString()}</p>
            <span
              className={cn(
                'mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                stats.weeklyDelta > 0
                  ? 'bg-green-500/10 text-green-500'
                  : stats.weeklyDelta < 0
                    ? 'bg-red-500/10 text-red-500'
                    : 'bg-zinc-500/10 text-zinc-500',
              )}
            >
              {stats.weeklyDelta > 0 ? <TrendingUp size={13} strokeWidth={2.5} /> : stats.weeklyDelta < 0 ? <TrendingDown size={13} strokeWidth={2.5} /> : <Minus size={13} strokeWidth={2.5} />}
              {stats.weeklyDelta > 0 ? 'Trending up' : stats.weeklyDelta < 0 ? 'Trending down' : 'No change'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="group relative overflow-hidden rounded-2xl border border-zinc-100 bg-background p-4 transition-all dark:border-zinc-800">
          <div className="flex flex-col items-center text-center">
            <div
              className={cn(
                'mb-3 flex h-8 w-8 items-center justify-center rounded-full',
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
                'text-xl font-semibold leading-none tracking-tight tabular-nums',
                stats.weeklyDelta > 0 ? 'text-green-600 dark:text-green-400' : stats.weeklyDelta < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground',
              )}
            >
              {stats.weeklyDelta > 0 ? '+' : ''}
              {stats.weeklyDelta.toLocaleString()}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">This Week</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-7 opacity-35 transition-opacity group-hover:opacity-90">
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

        <div className="group relative overflow-hidden rounded-2xl border border-zinc-100 bg-background p-4 transition-all dark:border-zinc-800">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400">
              <Flame size={16} strokeWidth={2.5} />
            </div>
            <p className="text-xl font-semibold leading-none tracking-tight text-foreground tabular-nums">
              {formatImpact(stats.totalPositiveImpact)}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">Total Impact</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-8 opacity-40 transition-opacity group-hover:opacity-100">
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="h-full w-full">
              <path d="M0,20 C20,10 40,18 60,8 C80,-2 90,12 100,5 L100,20 Z" className="fill-red-500/20" />
              <path d="M0,20 C20,10 40,18 60,8 C80,-2 90,12 100,5" fill="none" className="stroke-red-500" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-100 bg-background p-4 transition-all dark:border-zinc-800">
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground">
              <Users size={16} strokeWidth={2.5} />
            </div>
            <p className="text-xl font-semibold leading-none tracking-tight text-foreground tabular-nums">
              {formatFollowers(snapshot.followers)}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">Followers</p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-zinc-100 bg-background p-4 transition-all dark:border-zinc-800">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground">
              <Shield size={16} strokeWidth={2.5} />
            </div>
            <p className="text-xl font-semibold leading-none tracking-tight text-foreground tabular-nums">
              {credibility}%
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">Credibility</p>
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
