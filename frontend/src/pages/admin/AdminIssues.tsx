import { useEffect, useState } from 'react';
import { listIssueReports, updateIssueStatus } from '@/api/admin';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/Toast';
import { cn, formatDate } from '@/lib/utils';

type IssueRow = {
  id: string;
  title: string;
  name: string;
  email: string;
  issue_type: string;
  severity: string;
  status: string;
  created_at: string;
};

function severityClass(severity: string) {
  switch (severity) {
    case 'Critical':
      return 'bg-red-100 text-red-700';
    case 'High':
      return 'bg-orange-100 text-orange-700';
    case 'Medium':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-secondary text-muted-foreground';
  }
}

export default function AdminIssues() {
  const toast = useToast();
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listIssueReports();
        if (mounted) setIssues(data as IssueRow[]);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load issues');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleStatus(id: string, status: 'RESOLVED' | 'DISMISSED') {
    setBusyId(id);
    try {
      await updateIssueStatus(id, status);
      setIssues((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
      toast.push(`Issue marked ${status.toLowerCase()}.`);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Could not update status.');
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
        <h2 className="text-sm font-black uppercase tracking-wide">Reported Issues</h2>
        <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-muted-foreground">
          {issues.length} total
        </span>
      </div>

      {issues.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-16 text-center">
          <h3 className="text-xl font-black">No issue reports yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">Incoming issues will appear here for triage.</p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
          {issues.map((item) => {
            const busy = busyId === item.id;
            return (
              <article key={item.id} className="p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'rounded px-2 py-0.5 text-[10px] font-black uppercase',
                          severityClass(item.severity ?? 'Low'),
                        )}
                      >
                        {item.severity ?? 'Low'}
                      </span>
                      <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-black uppercase text-purple-700">
                        {item.issue_type}
                      </span>
                      <span className="rounded bg-cyan-100 px-2 py-0.5 text-[10px] font-black uppercase text-cyan-700">
                        {item.status}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-black">{item.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.created_at)} · {item.name} ({item.email})
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button
                      disabled={busy}
                      onClick={() => handleStatus(item.id, 'RESOLVED')}
                      className="bg-emerald-600 hover:bg-emerald-600/90"
                    >
                      Resolve
                    </Button>
                    <Button variant="outline" disabled={busy} onClick={() => handleStatus(item.id, 'DISMISSED')}>
                      Dismiss
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
