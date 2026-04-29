'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, User, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

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
      <div className="rounded-xl border border-white/8 bg-white/4 p-16 text-center">
        <CheckCircle size={28} className="text-emerald-400 mx-auto mb-3" />
        <p className="text-white/50 text-sm font-medium">No claims pending.</p>
        <p className="text-white/25 text-xs mt-1">No owner has asked to pin a name to a dossier.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {claims.map((claim) => {
        const note = (claim.proofPayload as { note?: string } | undefined)?.note;
        const busy = busyId === claim._id || pending;
        return (
          <article key={claim._id} className="rounded-xl border border-white/8 bg-white/4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25">
                    {claim.proofType.replace(/_/g, ' ')}
                  </span>
                  {claim.createdAt && (
                    <span className="text-[10px] text-white/25">
                      {new Date(claim.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-white">{claim.account?.displayName ?? 'Unknown'}</h2>
                {claim.account && (
                  <p className="text-xs text-white/30 mt-0.5">{claim.account.platform} · @{claim.account.username}</p>
                )}
                {claim.user && (
                  <div className="flex items-center gap-1.5 mt-3">
                    <User size={11} className="text-white/25" />
                    <p className="text-xs text-white/40">
                      Filed by @{claim.user.username}
                      {claim.user.email ? ` (${claim.user.email})` : ''}
                    </p>
                  </div>
                )}
                {note && (
                  <div className="flex items-start gap-1.5 mt-2">
                    <FileText size={11} className="text-white/25 mt-0.5" />
                    <p className="text-xs text-white/50">{note}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => decide(claim._id, 'approved')}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/25 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                >
                  <CheckCircle size={13} />
                  Approve
                </button>
                <button
                  onClick={() => decide(claim._id, 'rejected')}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <XCircle size={13} />
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
