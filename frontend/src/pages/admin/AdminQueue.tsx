import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, CheckCircle, ChevronRight, Layers } from 'lucide-react';
import { getModerationQueue } from '@/api/admin';
import type { ReportOut } from '@/types/report';
import { cn, formatDate } from '@/lib/utils';

function readAiVerdict(report: ReportOut) {
  const v = report.ai_verdict as Record<string, unknown> | null | undefined;
  const proposedImpact =
    typeof v?.proposedImpact === 'number' ? v.proposedImpact : null;
  const confidence =
    typeof v?.confidence === 'number' ? Math.round(v.confidence * 100) : null;
  return { proposedImpact, confidence };
}

export default function AdminQueue() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ReportOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const queue = await getModerationQueue(100);
        if (mounted) setItems(queue);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load queue');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    [items],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
        ))}
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
    <div className="space-y-8">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <Layers size={14} className="text-primary" />
          <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Operations Queue
          </h2>
        </div>
        <h1 className="font-serif text-3xl font-black tracking-tight italic">Pending Adjudication</h1>
        <p className="mt-2 text-sm text-muted-foreground">{sorted.length} items in queue</p>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-[2rem] border border-border bg-card p-16 text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
          <h3 className="text-2xl font-black">Queue is clear ✓</h3>
          <p className="mt-2 text-muted-foreground">All pending filings have been adjudicated.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((report) => {
            const { proposedImpact, confidence } = readAiVerdict(report);
            const isPositive = report.type === 'positive';
            return (
              <div
                key={report.id}
                className="rounded-2xl border border-border bg-card p-4 sm:p-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-black">{report.account?.display_name ?? report.account?.handle}</span>
                      <span
                        className={cn(
                          'rounded px-2 py-0.5 text-[10px] font-black uppercase',
                          isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500',
                        )}
                      >
                        {report.type ?? 'unknown'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      @{report.account?.handle} · {report.account?.platform}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm">{report.description.slice(0, 100)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(report.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    {confidence != null && (
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-[10px] font-black uppercase text-muted-foreground">
                          <Brain size={12} /> Confidence
                        </div>
                        <p className="font-mono text-lg font-black">{confidence}%</p>
                      </div>
                    )}
                    {proposedImpact != null && (
                      <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-muted-foreground">Impact</p>
                        <p
                          className={cn(
                            'font-mono text-lg font-black',
                            proposedImpact > 0 ? 'text-emerald-500' : proposedImpact < 0 ? 'text-red-500' : '',
                          )}
                        >
                          {proposedImpact > 0 ? '+' : ''}
                          {proposedImpact}
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/review/${report.id}`)}
                      className="flex h-10 items-center gap-1 rounded-xl bg-primary px-4 text-xs font-black uppercase text-primary-foreground"
                    >
                      Review <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
