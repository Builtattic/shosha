'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, TrendingUp } from 'lucide-react';
import { D3ProfileGauge } from '@/components/viz/D3ProfileGauge';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type ImpactReport = {
  _id: string;
  type: 'positive' | 'negative';
  description: string;
  createdAt?: string;
  publicAnonymous?: boolean;
  anonymousTag?: string;
  media?: { type: 'image' | 'video'; url: string };
  stats?: { aligns: number; opposes: number; comments: number; shares: number };
  account: {
    _id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    platform?: string;
    verified?: boolean;
  };
  reporter?: {
    _id: string;
    username: string;
    name?: string;
    photoUrl?: string;
    role?: string;
  } | null;
};

type RisingMaker = {
  id: string;
  displayName: string;
  avatarUrl: string;
  weeklyDelta: number;
};

type MePayload = {
  user: { score?: number } | null;
  claimedAccounts: Array<{ _id: string; score?: number }>;
  recentEvents: unknown[];
};

type RankInfo = {
  label: string;
  percentile: string | null;
};

const REPORTS_CAP = 50;

function timestamp(value?: string) {
  if (!value) return 'just now';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function reporterLabel(report: ImpactReport) {
  if (report.reporter) {
    return report.reporter.name || report.reporter.username.replace(/^@/, '');
  }
  return report.anonymousTag || 'Anonymous';
}

function computeRank(
  claimedAccountId: string | undefined,
  topAccounts: Array<{ _id: string }>,
  accountsTracked: number,
): RankInfo {
  if (!claimedAccountId || !topAccounts.length) {
    return { label: '#51+', percentile: null };
  }

  const index = topAccounts.findIndex((account) => account._id === claimedAccountId);
  if (index < 0) {
    return { label: '#51+', percentile: null };
  }

  const rank = index + 1;
  const percentile =
    accountsTracked > 0
      ? `Top ${Math.max(1, Math.round((1 - (rank - 1) / accountsTracked) * 100))}%`
      : null;

  return { label: `#${rank}`, percentile };
}

function TypeBadge({ type }: { type: 'positive' | 'negative' }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        type === 'positive' ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-600',
      )}
    >
      {type === 'positive' ? 'Positive' : 'Negative'}
    </span>
  );
}

function StoryRow({ report, compact: compactRow }: { report: ImpactReport; compact?: boolean }) {
  const stats = report.stats ?? { aligns: 0, opposes: 0, comments: 0, shares: 0 };

  return (
    <article
      className={cn(
        'flex gap-3 rounded-[20px] border border-border bg-card p-4 transition-colors hover:border-primary/30',
        compactRow && 'p-3',
      )}
    >
      {report.media?.url && report.media.type === 'image' ? (
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
          <img src={report.media.url} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <TypeBadge type={report.type} />
          <span className="text-[11px] text-muted-foreground">{timestamp(report.createdAt)}</span>
        </div>
        <p
          className={cn(
            'font-semibold leading-snug text-foreground',
            compactRow ? 'line-clamp-2 text-[13px]' : 'line-clamp-3 text-[14px]',
          )}
        >
          {report.description}
        </p>
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          {reporterLabel(report)}
          {!compactRow ? (
            <span className="text-muted-foreground/70">
              {' '}
              · {report.account.displayName.replace(/^@/, '')}
            </span>
          ) : null}
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-bold text-muted-foreground">
          <span className="text-green-600">+{compact(stats.aligns)} aligns</span>
          <span className="text-red-500">−{compact(stats.opposes)} opposes</span>
          <span>{compact(stats.shares)} shares</span>
        </div>
      </div>
    </article>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-[18px] font-bold text-foreground">{title}</h2>
      <Link href={href} className="flex items-center gap-0.5 text-[13px] font-bold text-primary hover:underline">
        View all <ChevronRight size={14} />
      </Link>
    </div>
  );
}

export default function ImpactPage() {
  const { user: firebaseUser } = useAuth();
  const [meData, setMeData] = useState<MePayload | null>(null);
  const [topAccounts, setTopAccounts] = useState<Array<{ _id: string }>>([]);
  const [accountsTracked, setAccountsTracked] = useState(0);
  const [topStories, setTopStories] = useState<ImpactReport[]>([]);
  const [recentReports, setRecentReports] = useState<ImpactReport[]>([]);
  const [risingMakers, setRisingMakers] = useState<RisingMaker[]>([]);
  const [loadingExplore, setLoadingExplore] = useState(true);
  const [loadingMe, setLoadingMe] = useState(false);

  const loadMe = useCallback(async () => {
    if (!firebaseUser) {
      setMeData(null);
      return;
    }
    setLoadingMe(true);
    try {
      const [meRes, accountsRes, statsRes] = await Promise.all([
        fetch('/api/me', { cache: 'no-store' }),
        fetch('/api/accounts'),
        fetch('/api/stats'),
      ]);
      const mePayload = meRes.ok ? await meRes.json() : null;
      const accountsPayload = accountsRes.ok ? await accountsRes.json() : null;
      const statsPayload = statsRes.ok ? await statsRes.json() : null;

      if (mePayload?.ok) {
        setMeData({
          user: mePayload.data.user,
          claimedAccounts: mePayload.data.claimedAccounts ?? [],
          recentEvents: mePayload.data.recentEvents ?? [],
        });
      }
      if (accountsPayload?.ok && Array.isArray(accountsPayload.data)) {
        const sorted = [...accountsPayload.data].sort(
          (a: { score?: number }, b: { score?: number }) => (b.score ?? 0) - (a.score ?? 0),
        );
        setTopAccounts(sorted.map((a: { _id: string }) => ({ _id: a._id })));
      }
      if (statsPayload?.ok) {
        setAccountsTracked(Number(statsPayload.data?.accountsTracked ?? 0));
      }
    } catch {
      // keep prior snapshot
    } finally {
      setLoadingMe(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    let active = true;
    setLoadingExplore(true);

    Promise.all([
      fetch('/api/impact', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/impact/rising-makers', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([impactPayload, makersPayload]) => {
        if (!active) return;
        if (impactPayload?.ok) {
          setTopStories(impactPayload.data.topStories ?? []);
          setRecentReports(impactPayload.data.recentReports ?? []);
        }
        if (makersPayload?.ok && Array.isArray(makersPayload.data)) {
          setRisingMakers(makersPayload.data);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoadingExplore(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const ledgerScore = meData?.user?.score ?? 1000;
  const primaryAccountId = meData?.claimedAccounts?.[0]?._id;
  const rankInfo = useMemo(
    () => computeRank(primaryAccountId, topAccounts, accountsTracked),
    [primaryAccountId, topAccounts, accountsTracked],
  );

  const reportsFiledCount = meData?.recentEvents?.length ?? 0;
  const reportsFiledLabel =
    reportsFiledCount >= REPORTS_CAP ? `${REPORTS_CAP}+` : String(reportsFiledCount);

  return (
    <main className="min-h-screen bg-background safe-bottom pt-8 px-4 lg:px-12 pb-12">
      <div className="mx-auto max-w-2xl space-y-10">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-primary">
            <TrendingUp size={14} /> Trending Explore
          </div>
          <h1 className="font-serif text-[32px] font-black leading-tight text-foreground md:text-[40px]">
            What&apos;s moving civil impact
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Top stories, rising profiles, and the latest filings across ShoSha.
          </p>
        </header>

        {/* Section A — Civil Impact Score Card */}
        {firebaseUser ? (
          <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
            {loadingMe && !meData ? (
              <p className="text-[13px] text-muted-foreground">Loading your score…</p>
            ) : (
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 space-y-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Your civil impact score
                  </p>
                  <div className="text-[48px] font-black tabular-nums leading-none text-foreground">
                    {ledgerScore.toLocaleString()}
                  </div>
                  <div className="flex flex-wrap gap-6 text-[13px]">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Global rank
                      </p>
                      <p className="mt-0.5 text-[17px] font-black text-foreground">{rankInfo.label}</p>
                      {rankInfo.percentile ? (
                        <p className="text-[12px] font-semibold text-primary">{rankInfo.percentile}</p>
                      ) : rankInfo.label === '#51+' ? (
                        <p className="text-[12px] text-muted-foreground">Outside top 50</p>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Reports filed
                      </p>
                      <p className="mt-0.5 text-[17px] font-black text-foreground tabular-nums">
                        {reportsFiledLabel}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    className="inline-flex items-center gap-1 text-[13px] font-bold text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground"
                  >
                    View Full Report <ChevronRight size={14} />
                  </Link>
                </div>
                <div className="flex shrink-0 justify-center sm:justify-end">
                  <D3ProfileGauge score={ledgerScore} size={200} minScore={-99000} maxScore={101000} />
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-[28px] border border-border bg-card p-6 text-center shadow-sm">
            <p className="text-[15px] font-semibold text-foreground">Sign in to see your civil impact score</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Track your rank, reports filed, and score on your profile.
            </p>
            <Link
              href="/sign-in?redirect=/impact"
              className="mt-4 inline-flex rounded-full border border-foreground bg-foreground px-6 py-2.5 text-[13px] font-bold text-background"
            >
              Sign in
            </Link>
          </section>
        )}

        {/* Section B — Top Impact Stories */}
        <section>
          <SectionHeader title="Top impact stories" href="/feed" />
          {loadingExplore ? (
            <p className="text-[13px] text-muted-foreground">Loading stories…</p>
          ) : topStories.length === 0 ? (
            <p className="rounded-[20px] border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
              No stories yet. Check back soon.
            </p>
          ) : (
            <ul className="space-y-3">
              {topStories.map((report) => (
                <li key={report._id}>
                  <StoryRow report={report} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Section C — Rising Impact Makers */}
        <section>
          <h2 className="mb-4 text-[18px] font-bold text-foreground">Rising impact makers</h2>
          {loadingExplore ? (
            <p className="text-[13px] text-muted-foreground">Loading profiles…</p>
          ) : risingMakers.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No rising profiles this week.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {risingMakers.map((maker) => (
                <Link
                  key={maker.id}
                  href={`/account/${maker.id}`}
                  className="w-[140px] shrink-0 rounded-[20px] border border-border bg-card p-4 text-center transition-all hover:bg-muted"
                >
                  <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full border border-border bg-muted">
                    <img src={maker.avatarUrl} alt={maker.displayName} className="h-full w-full object-cover" />
                  </div>
                  <h3 className="truncate text-[13px] font-bold text-foreground">{maker.displayName}</h3>
                  <p
                    className={cn(
                      'mt-2 text-[11px] font-bold tabular-nums',
                      maker.weeklyDelta >= 0 ? 'text-green-600' : 'text-red-500',
                    )}
                  >
                    {maker.weeklyDelta >= 0 ? '+' : ''}
                    {maker.weeklyDelta.toLocaleString()} this week
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Section D — Recent Reports */}
        <section>
          <SectionHeader title="Recent reports" href="/feed" />
          {loadingExplore ? (
            <p className="text-[13px] text-muted-foreground">Loading reports…</p>
          ) : recentReports.length === 0 ? (
            <p className="rounded-[20px] border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
              No recent reports.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentReports.map((report) => (
                <li key={report._id}>
                  <StoryRow report={report} compact />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

