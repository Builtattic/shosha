import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Database, Globe, TrendingUp, Users } from 'lucide-react';
import AdminDashboardChart from '@/components/admin/AdminDashboardChart';
import { getAdminStats, getModerationQueue, type AdminStats } from '@/api/admin';
import type { ReportOut } from '@/types/report';
import { cn, formatDate } from '@/lib/utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [queuePreview, setQueuePreview] = useState<ReportOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsData, queue] = await Promise.all([getAdminStats(), getModerationQueue(5)]);
        if (!mounted) return;
        setStats(statsData);
        setQueuePreview(queue);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const mainStats = [
    {
      label: 'Active Dossiers',
      value: stats?.accounts.total ?? 0,
      icon: Database,
      color: 'text-blue-400',
      bg: 'bg-blue-500/20',
    },
    {
      label: 'Citizen Registry',
      value: stats?.users.total ?? 0,
      icon: Users,
      color: 'text-purple-400',
      bg: 'bg-purple-500/20',
    },
    {
      label: 'Network Velocity',
      value: 0, // TODO: wire filingsLast7 when backend exposes it
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/20',
    },
    {
      label: 'Global Filings',
      value: stats?.reports.total ?? 0,
      icon: Globe,
      color: 'text-primary',
      bg: 'bg-primary/20',
    },
  ];

  const queueDepth = stats?.reports.pending_count ?? queuePreview.length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-3xl bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl font-black tracking-tight">Executive Summary</h1>
        <p className="mt-1 text-sm text-muted-foreground">Operational overview for tribunal staff.</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Queue depth: {queueDepth} · AI agreement: 0% {/* TODO: aiAgreementRate when backend exposes it */}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mainStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6"
            >
              <div className={cn('mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl', stat.bg)}>
                <Icon size={18} className={stat.color} />
              </div>
              <p className="text-3xl font-mono font-black">{stat.value.toLocaleString()}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* TODO: wire real time-series data when backend exposes it */}
      <AdminDashboardChart />

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">Active Operation Queue</h2>
          <Link
            to="/admin/queue"
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary"
          >
            View full queue <ArrowRight size={14} />
          </Link>
        </div>

        {queuePreview.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Backlog cleared — no pending reports.
          </div>
        ) : (
          <div className="space-y-3">
            {queuePreview.map((report) => (
              <div
                key={report.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{report.title || report.description.slice(0, 80)}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    @{report.account?.handle ?? 'unknown'} · {report.account?.platform ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(report.created_at)}</p>
                </div>
                <Link
                  to={`/admin/review/${report.id}`}
                  className="shrink-0 rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase tracking-wider text-primary-foreground"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
