import { useEffect, useState } from 'react';
import { decideAudit, listAudits, runAudit } from '@/api/admin';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';

type AuditRow = {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  account: {
    display_name: string | null;
    handle: string;
    platform: string;
  } | null;
  user: {
    username: string;
    email?: string;
  } | null;
};

export default function AdminAudits() {
  const toast = useToast();
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listAudits();
        if (mounted) setAudits(data as AuditRow[]);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load audits');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleRun(auditId: string) {
    setBusyId(auditId);
    try {
      const result = await runAudit(auditId);
      const summary =
        result && typeof result === 'object' && 'summary' in result
          ? String(result.summary)
          : 'Audit completed.';
      toast.push(summary);
      setAudits((prev) =>
        prev.map((a) => (a.id === auditId ? { ...a, status: 'IN_PROGRESS' } : a)),
      );
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Audit failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(auditId: string) {
    setBusyId(auditId);
    try {
      await decideAudit(auditId, 'rejected');
      setAudits((prev) => prev.filter((a) => a.id !== auditId));
      toast.push('Audit rejected.');
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Action failed.');
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
        <h2 className="text-sm font-black uppercase tracking-wide">Verification Audits</h2>
        <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-muted-foreground">
          {audits.length} pending review
        </span>
      </div>

      {audits.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-16 text-center">
          <h3 className="text-xl font-black">No audits pending</h3>
          <p className="mt-2 text-sm text-muted-foreground">The verification queue is clear.</p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
          {audits.map((audit) => {
            const busy = busyId === audit.id;
            const canRun = audit.status === 'PENDING';
            const canReject = audit.status === 'PENDING' || audit.status === 'IN_PROGRESS';
            return (
              <article key={audit.id} className="p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="rounded bg-cyan-100 px-2 py-0.5 text-[10px] font-black uppercase text-cyan-700">
                        {audit.status}
                      </span>
                      {audit.created_at && (
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(audit.created_at)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black">
                      {audit.account?.display_name ?? audit.account?.handle ?? 'Unknown Account'}
                    </h3>
                    {audit.account && (
                      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {audit.account.handle} · {audit.account.platform}
                      </p>
                    )}
                    <p className="mt-4 rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      {(audit.reason || 'No reason provided.').slice(0, 150)}
                      {(audit.reason?.length ?? 0) > 150 ? '…' : ''}
                    </p>
                    {audit.user && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Requested by <span className="font-bold text-foreground">{audit.user.username}</span>
                        {audit.user.email ? ` (${audit.user.email})` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    {canRun && (
                      <Button
                        disabled={busy}
                        onClick={() => handleRun(audit.id)}
                        className="bg-emerald-600 hover:bg-emerald-600/90"
                      >
                        Run Audit
                      </Button>
                    )}
                    {canReject && (
                      <Button variant="outline" disabled={busy} onClick={() => handleReject(audit.id)}>
                        Reject
                      </Button>
                    )}
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
