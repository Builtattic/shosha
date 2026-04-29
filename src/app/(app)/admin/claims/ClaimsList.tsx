'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';

type ClaimRow = {
  _id: string;
  proofType: string;
  proofPayload?: Record<string, unknown>;
  account: { _id: string; displayName: string; platform: string; username: string } | null;
  user: { _id: string; username: string; email: string } | null;
};

export function ClaimsList({ initialClaims }: { initialClaims: ClaimRow[] }) {
  const [claims, setClaims] = useState(initialClaims);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  async function decide(claimId: string, verdict: 'approved' | 'rejected') {
    setBusyId(claimId);
    try {
      const res = await fetch(`/api/admin/claims/${claimId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdict, note: '' })
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
    return <EmptyState title="No claims waiting." body="No one is asking to pin a name to a dossier." />;
  }

  return (
    <div className="space-y-3">
      {claims.map((claim) => {
        const note = (claim.proofPayload as { note?: string } | undefined)?.note;
        const busy = busyId === claim._id || pending;
        return (
          <article key={claim._id} className="border border-border bg-raised p-4">
            <p className="text-xs uppercase text-muted">{claim.proofType.replace('_', ' ')}</p>
            <h2 className="mt-2 font-serif text-3xl">{claim.account?.displayName ?? 'Unknown'}</h2>
            <p className="mt-1 text-xs text-muted">
              {claim.account ? `${claim.account.platform} · @${claim.account.username}` : ''}
            </p>
            <p className="mt-2 text-sm text-muted">
              Filed by {claim.user?.username ?? 'unknown'}
              {claim.user?.email ? ` (${claim.user.email})` : ''}
            </p>
            {note ? <p className="mt-2 text-sm">Note: {note}</p> : null}
            <div className="mt-3 flex gap-2">
              <Button onClick={() => decide(claim._id, 'approved')} disabled={busy}>
                Approve
              </Button>
              <Button variant="secondary" onClick={() => decide(claim._id, 'rejected')} disabled={busy}>
                Reject
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
