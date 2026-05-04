'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, User, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';

type ClaimRow = {
  _id: string;
  proofType: string;
  proofPayload?: Record<string, unknown>;
  createdAt?: string;
  account: { _id: string; displayName: string; platform: string; username: string } | null;
  user: { _id: string; username: string; email: string } | null;
};

export function ClaimsList({ initialClaims }: { initialClaims: ClaimRow[] }) {
  const [claims, setClaims] = useState(initialClaims);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  async function decide(claimId: string, verdict: 'approved' | 'rejected') {
    setBusyId(claimId);
    try {
      const res = await fetch(`/api/admin/claims/${claimId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdict, note: '' }),
      });
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Decision failed.');
      setClaims((prev) => prev.filter((c) => c._id !== claimId));
      toast.push(`Claim ${verdict}.`);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Decision failed.');
    } finally {
      setBusyId(null);
    }
  }

  if (!claims.length) {
    return (
      <div className="rounded-3xl border border-border bg-card p-20 text-center">
        <div className="h-16 w-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={32} />
        </div>
        <h3 className="text-xl font-black text-foreground mb-2">No claims pending</h3>
        <p className="text-muted-foreground text-sm">Identity verifications are up to date.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {claims.map((claim) => {
        const note = (claim.proofPayload as { note?: string } | undefined)?.note;
        const busy = busyId === claim._id || pending;
        return (
          <article key={claim._id} className="p-6 hover:bg-secondary/20 transition-colors">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-orange-100 text-orange-700">
                    {claim.proofType.replace(/_/g, ' ')}
                  </span>
                  {claim.createdAt && (
                    <span className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                      {formatDate(claim.createdAt)}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-foreground">{claim.account?.displayName ?? 'Unknown Account'}</h2>
                {claim.account && (
                  <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">
                    {claim.account.username} · {claim.account.platform}
                  </p>
                )}
                
                {note && (
                  <div className="mt-4 p-4 rounded-2xl bg-secondary/30 border border-border/50">
                    <p className="text-[14px] text-muted-foreground font-medium italic">&ldquo;{note}&rdquo;</p>
                  </div>
                )}

                {claim.user && (
                  <div className="flex items-center gap-2 mt-4">
                    <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                      <User size={12} />
                    </div>
                    <p className="text-[12px] font-bold text-muted-foreground">
                      Filed by <span className="text-foreground">{claim.user.username}</span>
                      {claim.user.email ? <span className="ml-1 opacity-50 font-medium">({claim.user.email})</span> : ''}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => decide(claim._id, 'approved')}
                  disabled={busy}
                  className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 text-white text-[12px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
                >
                  <CheckCircle size={14} />
                  Approve
                </button>
                <button
                  onClick={() => decide(claim._id, 'rejected')}
                  disabled={busy}
                  className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-border bg-background text-[12px] font-black uppercase tracking-wider text-muted-foreground hover:border-red-200 hover:text-red-600 transition-all disabled:opacity-50"
                >
                  <XCircle size={14} />
                  Reject
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
