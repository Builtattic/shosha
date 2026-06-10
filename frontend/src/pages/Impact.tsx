import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import {
  getImpact,
  getRisingMakers,
  getPublicStats,
  type ImpactReport,
  type RisingMaker,
} from '@/api/impact';
import { cn } from '@/lib/utils';

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function ReportCard({
  report,
  onClick,
}: {
  report: ImpactReport;
  onClick?: () => void;
}) {
  const label = report.deed ?? report.description;
  const score = report.base_score ?? 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'w-full rounded-[18px] border border-border bg-card p-4 text-left transition-colors',
        onClick ? 'hover:border-primary/30 hover:bg-muted/20 cursor-pointer' : 'cursor-default',
      )}
    >
      <p className="text-[14px] font-semibold text-foreground leading-snug">
        {truncate(label, 80)}
      </p>
      {report.account && (
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          @{report.account.handle} · {report.account.platform}
        </p>
      )}
      <span
        className={cn(
          'mt-2 inline-block text-[13px] font-bold tabular-nums',
          score >= 0 ? 'text-emerald-600' : 'text-destructive',
        )}
      >
        {score >= 0 ? '+' : ''}
        {score}
      </span>
    </button>
  );
}

export default function Impact() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    accounts_tracked: number;
    events_total: number;
    events_last_7: number;
  } | null>(null);
  const [topStories, setTopStories] = useState<ImpactReport[]>([]);
  const [risingMakers, setRisingMakers] = useState<RisingMaker[]>([]);
  const [recentReports, setRecentReports] = useState<ImpactReport[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    Promise.allSettled([getImpact(), getRisingMakers(), getPublicStats()])
      .then(([impactResult, makersResult, statsResult]) => {
        if (!alive) return;

        if (impactResult.status === 'fulfilled') {
          setTopStories(impactResult.value.top_stories.slice(0, 10));
          setRecentReports(impactResult.value.recent_reports.slice(0, 20));
        }

        if (makersResult.status === 'fulfilled') {
          setRisingMakers(makersResult.value.slice(0, 8));
        }

        if (statsResult.status === 'fulfilled') {
          const s = statsResult.value;
          setStats({
            accounts_tracked: s.accounts_tracked,
            events_total: s.events_total,
            events_last_7: s.events_last_7,
          });
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const goToAccount = (accountId: string | undefined) => {
    if (accountId) navigate(`/accounts/${accountId}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background safe-bottom pb-20 md:pb-8 px-4 pt-4">
        <div className="mx-auto max-w-2xl space-y-6 animate-pulse">
          <div className="h-10 w-48 bg-muted rounded" />
          <div className="h-16 bg-card rounded-2xl border border-border" />
          <div className="h-32 bg-card rounded-2xl border border-border" />
          <div className="h-32 bg-card rounded-2xl border border-border" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background safe-bottom pb-20 md:pb-8 px-4 lg:px-12">
      <div className="mx-auto max-w-2xl space-y-10 pt-4">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-primary">
            <TrendingUp size={14} /> Trending Explore
          </div>
          <h1 className="font-serif text-[32px] font-black leading-tight text-foreground">
            What&apos;s moving civil impact
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Top stories, rising profiles, and the latest filings across ShoSha.
          </p>
        </header>

        {stats && (
          <section className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-border bg-card px-4 py-3 min-w-[120px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Accounts tracked
              </p>
              <p className="text-[20px] font-black tabular-nums">{stats.accounts_tracked.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3 min-w-[120px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total filings
              </p>
              <p className="text-[20px] font-black tabular-nums">{stats.events_total.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3 min-w-[120px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                This week
              </p>
              <p className="text-[20px] font-black tabular-nums">{stats.events_last_7.toLocaleString()}</p>
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-[18px] font-bold text-foreground">Top Impact Stories</h2>
          {topStories.length === 0 ? (
            <p className="rounded-[20px] border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
              No stories yet. Check back soon.
            </p>
          ) : (
            <ul className="space-y-3">
              {topStories.map((report) => (
                <li key={report.id}>
                  <ReportCard
                    report={report}
                    onClick={
                      report.account?.id
                        ? () => goToAccount(report.account!.id)
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-[18px] font-bold text-foreground">Rising This Week</h2>
          {risingMakers.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No rising profiles this week.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {risingMakers.map((maker) => (
                <button
                  key={maker.id}
                  type="button"
                  onClick={() => goToAccount(maker.id)}
                  className="w-[140px] shrink-0 rounded-[20px] border border-border bg-card p-4 text-center transition-all hover:bg-muted"
                >
                  <h3 className="truncate text-[13px] font-bold text-foreground">
                    {maker.display_name ?? maker.handle}
                  </h3>
                  <p className="mt-1 text-[11px] text-muted-foreground capitalize">{maker.platform}</p>
                  <p className="mt-2 text-[12px] font-bold tabular-nums">{maker.score.toLocaleString()}</p>
                  <p className="mt-1 text-[11px] font-bold text-emerald-600 tabular-nums">
                    +{maker.weekly_delta.toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-[18px] font-bold text-foreground">Recent Filings</h2>
          {recentReports.length === 0 ? (
            <p className="rounded-[20px] border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
              No recent reports.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentReports.map((report) => (
                <li key={report.id}>
                  <ReportCard
                    report={report}
                    onClick={
                      report.account?.id
                        ? () => goToAccount(report.account!.id)
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
