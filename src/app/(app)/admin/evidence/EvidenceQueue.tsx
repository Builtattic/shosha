'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Search, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import type { EvidenceProposalRecord } from '@/lib/repos/evidenceProposals';

type AccountLite = {
  _id: string;
  displayName: string;
  username: string;
  profileId?: string;
};

export function EvidenceQueue({
  proposals,
  accounts
}: {
  proposals: EvidenceProposalRecord[];
  accounts: AccountLite[];
}) {
  const [accountId, setAccountId] = useState(accounts[0]?._id ?? '');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  async function scan() {
    if (!accountId.trim()) return;
    setBusyId('scan');
    try {
      const response = await fetch(`/api/admin/accounts/${encodeURIComponent(accountId.trim())}/evidence/scan`, {
        method: 'POST'
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Shosha evidence scan failed.');
      toast.push(`${payload.data.proposals.length} evidence proposals queued.`);
      startTransition(() => router.refresh());
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Shosha evidence scan failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function decide(id: string, verdict: 'approved' | 'rejected') {
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/evidence/${id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdict })
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Evidence review failed.');
      toast.push(verdict === 'approved' ? 'Evidence approved and scored.' : 'Evidence rejected.');
      startTransition(() => router.refresh());
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Evidence review failed.');
    } finally {
      setBusyId(null);
    }
  }

  const accountById = new Map(accounts.map((account) => [account._id, account]));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Search size={18} className="text-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Run Shosha Evidence Scan</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            list="evidence-accounts"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            placeholder="Account ID, e.g. SS00001"
          />
          <Button disabled={Boolean(busyId) || pending || !accountId.trim()} onClick={scan}>
            <Search size={16} />
            Scan
          </Button>
        </div>
        <datalist id="evidence-accounts">
          {accounts.map((account) => (
            <option key={account._id} value={account._id}>
              {account.displayName} @{account.username}
            </option>
          ))}
        </datalist>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Pending Evidence</h2>
          <p className="mt-1 text-sm text-muted-foreground">{proposals.length} proposals awaiting review</p>
        </div>
        <div className="divide-y divide-border">
          {proposals.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No evidence proposals are waiting.</div>
          ) : (
            proposals.map((proposal) => {
              const account = accountById.get(proposal.accountId);
              const disabled = Boolean(busyId) || pending;
              return (
                <article key={proposal._id} className="p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {account?.displayName ?? proposal.accountId} · {proposal.type} · {Math.round(proposal.confidence * 100)}%
                      </p>
                      <h3 className="mt-2 text-xl font-black text-foreground">{proposal.title}</h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{proposal.summary}</p>
                      <p className="mt-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {proposal.scoringCategory} · {proposal.scoringDeed} · impact {proposal.suggestedImpact > 0 ? '+' : ''}
                        {proposal.suggestedImpact}
                      </p>
                      {proposal.sourceUrls.length ? (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          {proposal.sourceUrls.slice(0, 4).map((url) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer" className="rounded border border-border px-2 py-1 text-primary">
                              Source
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button disabled={disabled} onClick={() => decide(proposal._id, 'approved')}>
                        <CheckCircle size={16} />
                        Approve
                      </Button>
                      <Button variant="secondary" disabled={disabled} onClick={() => decide(proposal._id, 'rejected')}>
                        <XCircle size={16} />
                        Reject
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
