import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { decideClaim, listPendingClaims, type ClaimOut } from '@/api/admin';
import { useToast } from '@/components/ui/Toast';
import { cn, formatDate } from '@/lib/utils';

function shortId(id: string) {
  return id.slice(0, 8);
}

export default function AdminClaims() {
  const toast = useToast();
  const [claims, setClaims] = useState<ClaimOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listPendingClaims(100);
        if (mounted) setClaims(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load claims');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function decide(claimId: string, decision: 'APPROVED' | 'REJECTED') {
    setBusyId(claimId);
    try {
      await decideClaim(claimId, decision);
      setClaims((prev) => prev.filter((c) => c.id !== claimId));
      toast.push(`Claim ${decision.toLowerCase()}.`);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wide">Identity Claims</h2>
        <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-muted-foreground">
          {claims.length} pending review
        </span>
      </div>

      {claims.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-16 text-center">
          <h3 className="text-xl font-black">No pending claims</h3>
          <p className="mt-2 text-sm text-muted-foreground">Identity verifications are up to date.</p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
          {claims.map((claim) => {
            const busy = busyId === claim.id;
            const note =
              claim.evidence_payload &&
              typeof claim.evidence_payload === 'object' &&
              'note' in claim.evidence_payload &&
              typeof claim.evidence_payload.note === 'string'
                ? claim.evidence_payload.note
                : null;
            return (
              <article key={claim.id} className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {claim.evidence_type && (
                        <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase text-orange-700">
                          {claim.evidence_type.replace(/_/g, ' ')}
                        </span>
                      )}
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">
                        {claim.status}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(claim.created_at)}
                      </span>
                    </div>
                    <p className="text-sm">
                      Account{' '}
                      <Link
                        to={`/accounts/${claim.account_id}`}
                        className="font-bold text-primary hover:underline"
                      >
                        {shortId(claim.account_id)}
                      </Link>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Requester {shortId(claim.requester_user_id)}
                    </p>
                    {note && (
                      <p className="mt-3 rounded-2xl border border-border bg-muted/30 p-3 text-sm italic text-muted-foreground">
                        &ldquo;{note}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => decide(claim.id, 'APPROVED')}
                      className={cn(
                        'rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase text-white',
                        busy && 'opacity-50',
                      )}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => decide(claim.id, 'REJECTED')}
                      className={cn(
                        'rounded-xl border border-border px-4 py-2 text-xs font-black uppercase text-muted-foreground',
                        busy && 'opacity-50',
                      )}
                    >
                      Reject
                    </button>
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
