import { useEffect, useState } from 'react';
import { Inbox } from 'lucide-react';
import {
  decideModerationRequest,
  listModerationRequests,
  type ModerationRequestItem,
} from '@/api/admin';
import { useToast } from '@/components/ui/Toast';
import { cn, formatDate } from '@/lib/utils';

function shortId(id: string) {
  return id.slice(0, 8);
}

export default function AdminModeration() {
  const toast = useToast();
  const [requests, setRequests] = useState<ModerationRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listModerationRequests(200);
        if (mounted) setRequests(data);
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

  async function decide(id: string, verdict: 'APPROVED' | 'REJECTED') {
    setBusyId(id);
    try {
      await decideModerationRequest(id, verdict);
      setRequests((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: verdict } : item,
        ),
      );
      toast.push(verdict === 'APPROVED' ? 'Request approved.' : 'Request rejected.');
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Decision failed.');
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Inbox size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide">Moderation Requests</h2>
            <p className="text-xs text-muted-foreground">User appeals for filing deletion or review.</p>
          </div>
        </div>
        <span className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-bold text-muted-foreground">
          {pendingCount} pending
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-16 text-center">
          <h3 className="text-lg font-black">No moderation requests</h3>
          <p className="mt-2 text-sm text-muted-foreground">User appeals will appear here.</p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
          {requests.map((request) => {
            const busy = busyId === request.id;
            const isPending = request.status === 'PENDING';
            return (
              <article key={request.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[10px] font-black uppercase',
                          request.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-700'
                            : request.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {request.status}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(request.created_at)}
                      </span>
                    </div>
                    <p className="line-clamp-3 text-sm">{request.reason.slice(0, 150)}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Report {shortId(request.report_id)} · Account {shortId(request.account_id)}
                    </p>
                  </div>
                  {isPending && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => decide(request.id, 'APPROVED')}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase text-white disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => decide(request.id, 'REJECTED')}
                        className="rounded-xl border border-border px-4 py-2 text-xs font-black uppercase text-muted-foreground disabled:opacity-50"
                      >
                        Reject
                      </button>
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
