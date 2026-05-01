'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Gavel, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

type DisputeStatus = 'pending' | 'under_review' | 'accepted' | 'rejected' | 'withdrawn';

type AdminDispute = {
  _id: string;
  userId: string;
  reportId: string;
  accountId: string;
  reason: string;
  evidenceUrl?: string;
  status: DisputeStatus;
  createdAt: string;
  resolution?: { adminId: string; verdict: 'accepted' | 'rejected'; note: string; decidedAt: string } | null;
  filer: { _id: string; name: string; username: string } | null;
  account: { _id: string; displayName: string; username: string; platform?: string } | null;
  report: { _id: string; type: 'positive' | 'negative'; description: string; status: string } | null;
};

const STATUS_FILTERS: Array<{ label: string; value: 'open' | 'all' | 'resolved' }> = [
  { label: 'Open', value: 'open' },
  { label: 'All', value: 'all' },
  { label: 'Resolved', value: 'resolved' }
];

function statusTone(status: DisputeStatus) {
  switch (status) {
    case 'pending':
    case 'under_review':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    case 'accepted':
      return 'bg-primary/10 text-primary border-primary/30';
    case 'rejected':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'withdrawn':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export default function AdminDisputesPage() {
  const toast = useToast();
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'open' | 'all' | 'resolved'>('open');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam =
        filter === 'open'
          ? 'pending,under_review'
          : filter === 'resolved'
          ? 'accepted,rejected,withdrawn'
          : 'all';
      const response = await fetch(`/api/admin/disputes?status=${statusParam}`, { cache: 'no-store' });
      const payload = await response.json();
      if (payload.ok) setDisputes(payload.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, verdict: 'accepted' | 'rejected') {
    if (busyId) return;
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/disputes/${id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdict, note: notes[id] ?? '' })
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Failed.');
      toast.push(`Dispute ${verdict}.`);
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Failed.');
    } finally {
      setBusyId(null);
    }
  }

  const counts = useMemo(() => {
    return disputes.reduce(
      (acc, d) => {
        acc[d.status] = (acc[d.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<DisputeStatus, number>
    );
  }, [disputes]);

  return (
    <section>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[20px] font-bold text-foreground flex items-center gap-2">
            <Gavel size={20} className="text-primary" />
            Disputes
          </h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            Subjects challenging the factual accuracy of approved filings on accounts they own.
          </p>
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors',
                filter === f.value
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-[18px] border border-border bg-card p-5">
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {!loading && disputes.length === 0 && (
        <div className="rounded-[24px] border border-border bg-card p-8 text-center">
          <p className="text-[14px] font-bold text-foreground">No disputes</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            {filter === 'open'
              ? 'No pending disputes — the queue is clear.'
              : 'Nothing matches this filter.'}
          </p>
        </div>
      )}

      {!loading && disputes.length > 0 && (
        <ul className="space-y-3">
          {disputes.map((d) => {
            const open = d.status === 'pending' || d.status === 'under_review';
            return (
              <li key={d._id} className="rounded-[18px] border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider',
                          statusTone(d.status)
                        )}
                      >
                        {d.status.replace('_', ' ')}
                      </span>
                      {d.report && (
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider',
                            d.report.type === 'positive'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-destructive/10 text-destructive'
                          )}
                        >
                          {d.report.type}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(d.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-[13px] text-foreground/90">
                      <span className="font-bold">Filer:</span> {d.filer?.name ?? d.userId}{' '}
                      <span className="text-muted-foreground">(@{d.filer?.username ?? '?'})</span>
                    </p>
                    {d.account && (
                      <p className="text-[13px] text-foreground/90">
                        <span className="font-bold">Account:</span>{' '}
                        <Link className="hover:underline" href={`/account/${d.account._id}`}>
                          {d.account.displayName} (@{d.account.username})
                        </Link>
                      </p>
                    )}
                    {d.report && (
                      <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">
                        <span className="font-bold text-foreground">Filing:</span> {d.report.description}{' '}
                        <Link
                          href={`/admin/review/${d.report._id}`}
                          className="text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          review <ExternalLink size={11} />
                        </Link>
                      </p>
                    )}
                    <p className="text-[13px] text-foreground mt-3 leading-snug">
                      <span className="text-muted-foreground">Reason:</span> {d.reason}
                    </p>
                    {d.evidenceUrl && (
                      <a
                        href={d.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[12px] text-primary hover:underline mt-1 inline-block"
                      >
                        Evidence: {d.evidenceUrl}
                      </a>
                    )}

                    {d.resolution && (
                      <div className="mt-3 rounded-[12px] border border-border bg-muted/30 px-3 py-2 text-[12px]">
                        <p className="font-bold text-foreground">
                          Resolved {d.resolution.verdict}
                          {' · '}
                          {new Date(d.resolution.decidedAt).toLocaleString()}
                        </p>
                        {d.resolution.note && (
                          <p className="text-muted-foreground mt-0.5">{d.resolution.note}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {open && (
                    <div className="flex flex-col gap-2 w-full sm:w-72 shrink-0">
                      <textarea
                        value={notes[d._id] ?? ''}
                        onChange={(e) => setNotes((n) => ({ ...n, [d._id]: e.target.value }))}
                        rows={3}
                        placeholder="Internal note (optional)"
                        className="rounded-xl border border-border bg-background px-3 py-2 text-[12px] resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => decide(d._id, 'accepted')}
                          disabled={busyId === d._id}
                          className="flex-1"
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => decide(d._id, 'rejected')}
                          disabled={busyId === d._id}
                          className="flex-1 text-destructive"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && disputes.length > 0 && (
        <p className="text-[11px] text-muted-foreground mt-4 text-right">
          Showing {disputes.length} dispute{disputes.length === 1 ? '' : 's'}
          {counts.pending ? ` · ${counts.pending} pending` : ''}
          {counts.under_review ? ` · ${counts.under_review} in review` : ''}
        </p>
      )}
    </section>
  );
}
