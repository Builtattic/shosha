import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dismissAbuse, listAbuseFlaggedReports } from '@/api/admin';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';

type AbuseReport = {
  id: string;
  description: string;
  report_type: string;
  ai_verdict: { abuseFlags?: string[] } | null;
  created_at: string;
  account: {
    display_name: string | null;
    handle: string;
    platform: string;
  } | null;
};

export default function AdminAbuse() {
  const toast = useToast();
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listAbuseFlaggedReports();
        if (mounted) setReports(data as AbuseReport[]);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load abuse reports');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleDismiss(reportId: string) {
    setBusyId(reportId);
    try {
      await dismissAbuse(reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast.push('Abuse flags dismissed.');
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed to dismiss.');
    } finally {
      setBusyId(null);
    }
  }

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wide">Abuse Oversight</h2>
        <span className="rounded-md border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600">
          {reports.length} flagged filings
        </span>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-16 text-center">
          <h3 className="text-xl font-black">No abuse signals</h3>
          <p className="mt-2 text-sm text-muted-foreground">The oversight queue is clear.</p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
          {reports.map((report) => {
            const busy = busyId === report.id;
            const flags = report.ai_verdict?.abuseFlags ?? [];
            return (
              <article key={report.id} className="p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <div className="mb-4 flex flex-wrap gap-2">
                      {flags.map((flag) => (
                        <span
                          key={flag}
                          className="rounded-xl bg-red-100 px-3 py-1.5 text-[11px] font-black uppercase text-red-700"
                        >
                          {flag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                        report.report_type === 'positive'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {report.report_type}
                    </span>
                    <h3 className="mt-2 text-xl font-black">
                      {report.account?.display_name ?? report.account?.handle ?? 'Unknown Account'}
                    </h3>
                    {report.account && (
                      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {report.account.handle} · {report.account.platform}
                      </p>
                    )}
                    <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">
                      {(report.description || '').slice(0, 120)}
                      {(report.description?.length ?? 0) > 120 ? '…' : ''}
                    </p>
                    {report.created_at && (
                      <p className="mt-3 text-[11px] text-muted-foreground">
                        Flagged {formatDate(report.created_at)}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Link
                      to={`/admin/review/${report.id}`}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-xs font-black uppercase text-primary-foreground"
                    >
                      Review Filing
                    </Link>
                    <Button variant="outline" disabled={busy} onClick={() => handleDismiss(report.id)}>
                      Dismiss Flags
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
