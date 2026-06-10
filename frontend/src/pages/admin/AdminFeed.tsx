import { useCallback, useEffect, useState } from 'react';
import {
  deleteAdminReport,
  getFeedReports,
  updateAdminReport,
} from '@/api/admin';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/providers/AuthProvider';
import type { ReportOut } from '@/types/report';
import { cn, formatDate } from '@/lib/utils';

type FeedControl = {
  visibility: 'public' | 'hidden';
  pinned: boolean;
  featured: boolean;
};

export default function AdminFeed() {
  const toast = useToast();
  const { profile } = useAuth();
  const [reports, setReports] = useState<ReportOut[]>([]);
  const [controls, setControls] = useState<Map<string, FeedControl>>(new Map());
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isSuperAdmin = profile?.role === 'SUPER_ADMIN';

  const getControls = useCallback(
    (reportId: string): FeedControl =>
      controls.get(reportId) ?? { visibility: 'public', pinned: false, featured: false },
    [controls],
  );

  function updateControlMap(reportId: string, patch: Partial<FeedControl>) {
    setControls((prev) => {
      const next = new Map(prev);
      const current = next.get(reportId) ?? { visibility: 'public', pinned: false, featured: false };
      next.set(reportId, { ...current, ...patch });
      return next;
    });
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getFeedReports(50);
        if (mounted) {
          setReports(data.items);
          setNextCursor(data.next_cursor);
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load feed');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await getFeedReports(50, nextCursor);
      setReports((prev) => [...prev, ...data.items]);
      setNextCursor(data.next_cursor);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }

  async function patchReport(reportId: string, patch: Partial<FeedControl>) {
    setBusyId(reportId);
    try {
      await updateAdminReport(reportId, patch);
      updateControlMap(reportId, patch);
      toast.push('Feed item updated.');
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(reportId: string) {
    if (!isSuperAdmin) return;
    if (!confirm('Delete this report permanently?')) return;
    setBusyId(reportId);
    try {
      await deleteAdminReport(reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setControls((prev) => {
        const next = new Map(prev);
        next.delete(reportId);
        return next;
      });
      toast.push('Report deleted.');
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-wide">Feed Control</h2>
        <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-muted-foreground">
          {reports.length} reports loaded
        </span>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        Showing approved public reports. Pending reports visible in{' '}
        <a href="/admin/queue" className="font-bold text-primary hover:underline">/admin/queue</a>.
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border bg-card">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="bg-secondary/30">
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-muted-foreground">Claim</th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-muted-foreground">Meta</th>
              <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-muted-foreground">Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reports.map((report) => {
              const busy = busyId === report.id;
              const ctrl = getControls(report.id);
              const label = (report.title || report.description || '').slice(0, 80);
              return (
                <tr key={report.id} className="hover:bg-secondary/20">
                  <td className="max-w-md px-4 py-4">
                    <div className="mb-2 flex flex-wrap gap-2">
                      {report.type && (
                        <span
                          className={cn(
                            'rounded px-2 py-0.5 text-[10px] font-black uppercase',
                            report.type === 'positive'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700',
                          )}
                        >
                          {report.type}
                        </span>
                      )}
                      <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-black uppercase">
                        {report.status}
                      </span>
                    </div>
                    <p className="font-black">{report.account?.display_name ?? report.account?.handle ?? 'Unknown'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {report.account?.handle} · {report.account?.platform}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(report.created_at)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      <span className="rounded border border-border px-2 py-0.5 text-[10px] font-bold">
                        {ctrl.visibility}
                      </span>
                      {ctrl.pinned && (
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                          pinned
                        </span>
                      )}
                      {ctrl.featured && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">
                          featured
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          patchReport(report.id, {
                            visibility: ctrl.visibility === 'public' ? 'hidden' : 'public',
                          })
                        }
                      >
                        {ctrl.visibility === 'hidden' ? 'Show' : 'Hide'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => patchReport(report.id, { pinned: !ctrl.pinned })}
                        className={ctrl.pinned ? 'text-primary' : ''}
                      >
                        Pin
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => patchReport(report.id, { featured: !ctrl.featured })}
                        className={ctrl.featured ? 'text-amber-600' : ''}
                      >
                        Feature
                      </Button>
                      {isSuperAdmin && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => handleDelete(report.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {nextCursor && (
        <div className="flex justify-center">
          <Button variant="outline" disabled={loadingMore} onClick={loadMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
