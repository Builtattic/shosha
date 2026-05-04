'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

type ModerationRow = {
  _id: string;
  reportId: string;
  accountId: string;
  requestedBy: string;
  reason: string;
  evidenceLinks: string[];
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
  report: { _id: string; description: string; visibility?: string } | null;
  account: { _id: string; displayName: string; username: string; platform: string } | null;
  requester: { _id: string; username: string; name?: string } | null;
};

export function ModerationRequestsList({ initialRequests }: { initialRequests: ModerationRow[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  async function decide(id: string, verdict: 'approved' | 'rejected') {
    const note = verdict === 'approved'
      ? 'Approved user moderation request; filing hidden.'
      : 'Rejected user moderation request; filing remains visible.';
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/moderation/${id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdict, note }),
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Decision failed.');
      setRequests((current) =>
        current.map((item) => item._id === id ? { ...item, status: verdict, reviewNote: note, reviewedAt: new Date().toISOString() } : item)
      );
      toast.push(verdict === 'approved' ? 'Request approved and filing hidden.' : 'Request rejected.');
      startTransition(() => router.refresh());
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Decision failed.');
    } finally {
      setBusyId(null);
    }
  }

  if (!requests.length) {
    return (
      <div className="rounded-3xl border border-border bg-card p-16 text-center">
        <h3 className="text-lg font-black text-foreground">No moderation requests</h3>
        <p className="mt-2 text-sm text-muted-foreground">User appeals will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="divide-y divide-border">
        {requests.map((request) => {
          const busy = busyId === request._id || pending;
          const pendingStatus = request.status === 'pending';
          return (
            <article key={request._id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider',
                        request.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : request.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {request.status}
                    </span>
                    <span className="text-[11px] font-bold text-muted-foreground">
                      {new Date(request.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="text-[16px] font-black text-foreground">
                    {request.account?.displayName ?? 'Unknown account'}
                  </h3>
                  <p className="mt-1 text-[12px] font-bold text-muted-foreground">
                    Requested by {request.requester?.name || request.requester?.username || request.requestedBy}
                  </p>
                  <p className="mt-4 whitespace-pre-wrap text-[14px] leading-6 text-foreground/90">{request.reason}</p>
                  {request.report?.description && (
                    <p className="mt-3 rounded-2xl border border-border bg-background px-3 py-2 text-[12px] leading-5 text-muted-foreground">
                      {request.report.description}
                    </p>
                  )}
                  {request.evidenceLinks.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {request.evidenceLinks.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-bold text-primary"
                        >
                          Evidence <ExternalLink size={11} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                  <Link
                    href={`/admin/review/${request.reportId}`}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-[12px] font-black uppercase tracking-wider text-foreground hover:bg-muted"
                  >
                    Review filing
                  </Link>
                  {pendingStatus && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => decide(request._id, 'approved')}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-[12px] font-black uppercase tracking-wider text-white disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => decide(request._id, 'rejected')}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-[12px] font-black uppercase tracking-wider text-muted-foreground hover:text-destructive disabled:opacity-50"
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
