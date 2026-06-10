import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gavel } from 'lucide-react';
import { decideDispute, listPendingDisputes, type DisputeOut } from '@/api/admin';
import { useToast } from '@/components/ui/Toast';
import { cn, formatDate } from '@/lib/utils';

type Filter = 'open' | 'all' | 'resolved';

function shortId(id: string) {
  return id.slice(0, 8);
}

function statusTone(status: string) {
  switch (status) {
    case 'PENDING':
    case 'UNDER_REVIEW':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    case 'ACCEPTED':
      return 'bg-primary/10 text-primary border-primary/30';
    case 'REJECTED':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'WITHDRAWN':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export default function AdminDisputes() {
  const toast = useToast();
  const [allDisputes, setAllDisputes] = useState<DisputeOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listPendingDisputes(100);
        if (mounted) setAllDisputes(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load disputes');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const disputes = useMemo(() => {
    if (filter === 'all') return allDisputes;
    if (filter === 'open') {
      return allDisputes.filter(
        (d) => d.status === 'PENDING' || d.status === 'UNDER_REVIEW',
      );
    }
    return allDisputes.filter((d) =>
      ['ACCEPTED', 'REJECTED', 'WITHDRAWN'].includes(d.status),
    );
  }, [allDisputes, filter]);

  async function decide(id: string, decision: 'ACCEPTED' | 'REJECTED') {
    setBusyId(id);
    try {
      await decideDispute(id, decision, notes[id] ?? '');
      setAllDisputes((current) =>
        current.map((d) => (d.id === id ? { ...d, status: decision } : d)),
      );
      toast.push(`Dispute ${decision.toLowerCase()}.`);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed.');
    } finally {
      setBusyId(null);
    }
  }

  const STATUS_FILTERS: { label: string; value: Filter }[] = [
    { label: 'Open', value: 'open' },
    { label: 'All', value: 'all' },
    { label: 'Resolved', value: 'resolved' },
  ];

  if (loading) {
    return (
      <div className="space-y-3">
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
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Gavel size={20} className="text-primary" />
            Disputes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Subjects challenging the factual accuracy of approved filings.
          </p>
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                filter === f.value
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {disputes.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <p className="font-bold">No disputes</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === 'open' ? 'No pending disputes — the queue is clear.' : 'Nothing matches this filter.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {disputes.map((d) => {
            const open = d.status === 'PENDING' || d.status === 'UNDER_REVIEW';
            return (
              <li key={d.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase',
                          statusTone(d.status),
                        )}
                      >
                        {d.status.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(d.created_at)}
                      </span>
                    </div>
                    <p className="text-sm">
                      Report {shortId(d.report_id)} · Account{' '}
                      <Link to={`/accounts/${d.account_id}`} className="text-primary hover:underline">
                        {shortId(d.account_id)}
                      </Link>
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm">{d.reason.slice(0, 150)}</p>
                    {d.evidence_url && (
                      <a
                        href={d.evidence_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-primary hover:underline"
                      >
                        Evidence link
                      </a>
                    )}
                  </div>
                  {open && (
                    <div className="flex w-full shrink-0 flex-col gap-2 sm:w-72">
                      <textarea
                        value={notes[d.id] ?? ''}
                        onChange={(e) => setNotes((n) => ({ ...n, [d.id]: e.target.value }))}
                        rows={3}
                        placeholder="Internal note (optional)"
                        className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-xs"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busyId === d.id}
                          onClick={() => decide(d.id, 'ACCEPTED')}
                          className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={busyId === d.id}
                          onClick={() => decide(d.id, 'REJECTED')}
                          className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-bold text-destructive disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
