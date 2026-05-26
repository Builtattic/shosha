'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, ChevronDown, ChevronUp, ExternalLink, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { cn, formatDate } from '@/lib/utils';

type DeletionRequestRow = {
  _id: string;
  userId: string;
  reason: string;
  details?: string;
  attachmentUrls?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
  user: { _id: string; username: string; email: string; name?: string } | null;
};

const HIGH_SEVERITY_REASONS = new Set(['Privacy concerns', 'Harassment or safety concerns']);

export function DeletionRequestsList({ items }: { items: DeletionRequestRow[] }) {
  const [requests, setRequests] = useState(items);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const router = useRouter();
  const toast = useToast();

  const pendingCount = useMemo(() => requests.filter((item) => item.status === 'pending').length, [requests]);

  async function decide(requestId: string, verdict: 'approved' | 'rejected') {
    const reviewNote = (notesById[requestId] ?? '').slice(0, 500);
    setBusyId(requestId);
    try {
      const res = await fetch(`/api/admin/deletion-requests/${requestId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdict, note: reviewNote }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) throw new Error(payload?.error?.message ?? 'Decision failed.');
      setRequests((prev) =>
        prev.map((item) =>
          item._id === requestId
            ? {
                ...item,
                status: verdict,
                reviewedAt: new Date().toISOString(),
                reviewNote,
              }
            : item
        )
      );
      toast.push(verdict === 'approved' ? 'Deletion request approved.' : 'Deletion request rejected.');
      startTransition(() => router.refresh());
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Decision failed.');
    } finally {
      setBusyId(null);
    }
  }

  function statusStyle(status: DeletionRequestRow['status']) {
    if (status === 'approved') return 'bg-emerald-100 text-emerald-700';
    if (status === 'rejected') return 'bg-muted text-muted-foreground';
    if (status === 'completed') return 'bg-blue-100 text-blue-700';
    return 'bg-amber-100 text-amber-700';
  }

  if (!requests.length) {
    return (
      <div className="rounded-3xl border border-border bg-card p-20 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
          <CheckCircle size={32} />
        </div>
        <h3 className="mb-2 text-xl font-black text-foreground">No deletion requests</h3>
        <p className="text-sm text-muted-foreground">Deletion queue is currently clear.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="border-b border-border bg-secondary/20 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
        {pendingCount} pending review
      </div>
      <div className="divide-y divide-border">
        {requests.map((request) => {
          const busy = busyId === request._id || pending;
          const isPending = request.status === 'pending';
          const isExpanded = expandedIds[request._id] ?? false;
          const details = request.details?.trim() ?? '';
          const showExpand = details.length > 180;
          const isHighSeverity = HIGH_SEVERITY_REASONS.has(request.reason);
          return (
            <article key={request._id} className="p-6 hover:bg-secondary/20 transition-colors">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider', statusStyle(request.status))}>
                      {request.status}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider',
                        isHighSeverity ? 'bg-red-100 text-red-700' : 'bg-secondary text-muted-foreground'
                      )}
                    >
                      {request.reason}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
                      {formatDate(request.createdAt)}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-foreground">
                      {request.user?.name || request.user?.username || `User ${request.userId.slice(0, 8)}`}
                    </h3>
                    <p className="text-[12px] font-semibold text-muted-foreground">
                      {request.user?.email || 'No email on file'}
                    </p>
                  </div>

                  {details ? (
                    <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
                      <p className={cn('text-[13px] leading-6 text-muted-foreground', isExpanded ? '' : 'line-clamp-3')}>
                        {details}
                      </p>
                      {showExpand ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedIds((prev) => ({ ...prev, [request._id]: !prev[request._id] }))
                          }
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-primary"
                        >
                          {isExpanded ? (
                            <>
                              Show less <ChevronUp size={12} />
                            </>
                          ) : (
                            <>
                              Show more <ChevronDown size={12} />
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {request.attachmentUrls?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {request.attachmentUrls.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-bold text-primary"
                        >
                          Attachment <ExternalLink size={11} />
                        </a>
                      ))}
                    </div>
                  ) : null}

                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Admin Note</span>
                    <textarea
                      value={notesById[request._id] ?? request.reviewNote ?? ''}
                      onChange={(e) =>
                        setNotesById((prev) => ({ ...prev, [request._id]: e.target.value.slice(0, 500) }))
                      }
                      maxLength={500}
                      placeholder="Optional note for this decision..."
                      className="min-h-[72px] w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px]"
                      disabled={!isPending}
                    />
                  </label>
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => decide(request._id, 'approved')}
                    disabled={!isPending || busy}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-[12px] font-black uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <CheckCircle size={14} />
                    {busy && isPending ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(request._id, 'rejected')}
                    disabled={!isPending || busy}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-[12px] font-black uppercase tracking-wider text-muted-foreground transition-all hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    {busy && isPending ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
