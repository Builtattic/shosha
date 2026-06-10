import { useEffect, useState } from 'react';
import { decideDeletionRequest, listDeletionRequests } from '@/api/admin';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/Toast';
import { cn, formatDate } from '@/lib/utils';

type DeletionRequest = {
  id: string;
  user_id: string;
  reason: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
};

function shortId(id: string) {
  return id.slice(0, 8);
}

export default function AdminDeletionRequests() {
  const toast = useToast();
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listDeletionRequests();
        if (mounted) setRequests(data as DeletionRequest[]);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load requests');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function decide(requestId: string, verdict: 'approved' | 'rejected') {
    const note = (notesById[requestId] ?? '').slice(0, 500);
    setBusyId(requestId);
    try {
      await decideDeletionRequest(requestId, verdict, note);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: verdict.toUpperCase(), reviewed_at: new Date().toISOString() }
            : r,
        ),
      );
      toast.push(verdict === 'approved' ? 'Deletion request approved.' : 'Deletion request rejected.');
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Decision failed.');
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

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide">Deletion Requests</h2>
          <p className="mt-1 text-xs text-muted-foreground">User-submitted profile removal requests.</p>
        </div>
        <span className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-bold text-muted-foreground">
          {pendingCount} pending
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-16 text-center">
          <h3 className="text-xl font-black">No deletion requests</h3>
          <p className="mt-2 text-sm text-muted-foreground">Deletion queue is currently clear.</p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
          {requests.map((request) => {
            const busy = busyId === request.id;
            const isPending = request.status === 'PENDING';
            return (
              <article key={request.id} className="p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[10px] font-black uppercase',
                          request.status === 'APPROVED' && 'bg-emerald-100 text-emerald-700',
                          request.status === 'REJECTED' && 'bg-muted text-muted-foreground',
                          request.status === 'PENDING' && 'bg-amber-100 text-amber-700',
                        )}
                      >
                        {request.status}
                      </span>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-black uppercase text-muted-foreground">
                        {request.reason}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{formatDate(request.created_at)}</span>
                    </div>
                    <h3 className="text-lg font-black">User {shortId(request.user_id)}</h3>
                    {request.reviewed_at && (
                      <p className="text-xs text-muted-foreground">Reviewed {formatDate(request.reviewed_at)}</p>
                    )}
                    {isPending && (
                      <label className="block space-y-1">
                        <span className="text-[11px] font-black uppercase text-muted-foreground">Admin note</span>
                        <textarea
                          value={notesById[request.id] ?? ''}
                          onChange={(e) =>
                            setNotesById((prev) => ({
                              ...prev,
                              [request.id]: e.target.value.slice(0, 500),
                            }))
                          }
                          maxLength={500}
                          placeholder="Optional note…"
                          className="min-h-[72px] w-full rounded-xl border border-border px-3 py-2 text-sm"
                        />
                      </label>
                    )}
                  </div>
                  {isPending && (
                    <div className="flex shrink-0 flex-col gap-2">
                      <Button
                        disabled={busy}
                        onClick={() => decide(request.id, 'approved')}
                        className="bg-emerald-600 hover:bg-emerald-600/90"
                      >
                        Approve
                      </Button>
                      <Button variant="outline" disabled={busy} onClick={() => decide(request.id, 'rejected')}>
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
