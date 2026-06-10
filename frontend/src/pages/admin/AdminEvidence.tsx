import { useEffect, useState } from 'react';
import {
  decideEvidenceProposal,
  listEvidenceProposals,
  scanAccountEvidence,
} from '@/api/admin';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

type EvidenceProposal = {
  id: string;
  account_id: string;
  title: string;
  summary: string;
  scoring_category: string;
  scoring_deed: string;
  report_type: string;
  suggested_impact: number;
  confidence: number;
  source_urls: string[];
  status: string;
};

function shortId(id: string) {
  return id.slice(0, 8);
}

export default function AdminEvidence() {
  const toast = useToast();
  const [proposals, setProposals] = useState<EvidenceProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scanAccountId, setScanAccountId] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listEvidenceProposals();
        if (mounted) setProposals(data as EvidenceProposal[]);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load proposals');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleScan() {
    if (!scanAccountId.trim()) return;
    setScanning(true);
    try {
      const result = await scanAccountEvidence(scanAccountId.trim());
      const count =
        result && typeof result === 'object' && 'proposals' in result
          ? (result.proposals as unknown[]).length
          : 0;
      toast.push(`${count} evidence proposals queued.`);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setScanning(false);
    }
  }

  async function decide(id: string, verdict: 'APPROVED' | 'REJECTED') {
    setBusyId(id);
    try {
      await decideEvidenceProposal(id, verdict);
      setProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: verdict } : p)).filter(
          (p) => p.status === 'PENDING',
        ),
      );
      toast.push(verdict === 'APPROVED' ? 'Evidence approved.' : 'Evidence rejected.');
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
      <div>
        <h1 className="text-2xl font-black tracking-tight">Shosha Evidence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review cited actions and approve what should enter the score ledger.
        </p>
      </div>

      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="text-sm font-black uppercase tracking-widest">Run Evidence Scan</h2>
        <p className="mt-1 text-xs text-amber-700">
          Scan is stubbed on V2 backend — proposals returned may be empty.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={scanAccountId}
            onChange={(e) => setScanAccountId(e.target.value)}
            placeholder="Account UUID"
            className="h-11 flex-1 rounded-xl border border-border bg-background px-4 text-sm"
          />
          <Button disabled={scanning || !scanAccountId.trim()} onClick={handleScan}>
            {scanning ? 'Scanning…' : 'Scan'}
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <h2 className="text-sm font-black uppercase tracking-widest">Pending Evidence</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {proposals.length} proposals awaiting review
          </p>
        </div>
        <div className="divide-y divide-border">
          {proposals.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No evidence proposals waiting.</div>
          ) : (
            proposals.map((proposal) => {
              const busy = busyId === proposal.id;
              const isPending = proposal.status === 'PENDING';
              return (
                <article key={proposal.id} className="p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {shortId(proposal.account_id)} · {proposal.report_type} ·{' '}
                        {Math.round((proposal.confidence ?? 0) * 100)}%
                      </p>
                      <h3 className="mt-2 text-xl font-black">{proposal.title}</h3>
                      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{proposal.summary}</p>
                      <p className="mt-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {proposal.scoring_category} · {proposal.scoring_deed} · impact{' '}
                        {proposal.suggested_impact > 0 ? '+' : ''}
                        {proposal.suggested_impact}
                      </p>
                      {proposal.source_urls?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {proposal.source_urls.slice(0, 3).map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded border border-border px-2 py-1 text-xs text-primary"
                            >
                              Source
                            </a>
                          ))}
                        </div>
                      )}
                      <span
                        className={cn(
                          'mt-3 inline-block rounded px-2 py-0.5 text-[10px] font-black uppercase',
                          proposal.status === 'PENDING' && 'bg-amber-100 text-amber-700',
                          proposal.status === 'APPROVED' && 'bg-emerald-100 text-emerald-700',
                          proposal.status === 'REJECTED' && 'bg-red-100 text-red-700',
                        )}
                      >
                        {proposal.status}
                      </span>
                    </div>
                    {isPending && (
                      <div className="flex gap-2">
                        <Button disabled={busy} onClick={() => decide(proposal.id, 'APPROVED')}>
                          Approve
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() => decide(proposal.id, 'REJECTED')}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
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
