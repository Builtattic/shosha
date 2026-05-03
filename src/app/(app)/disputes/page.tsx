'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Link from 'next/link';
import { ShieldAlert, Plus, X, AlertTriangle, CheckCircle2, Clock, Hourglass, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

type DisputeStatus = 'pending' | 'under_review' | 'accepted' | 'rejected' | 'withdrawn';

type Dispute = {
  _id: string;
  reportId: string;
  accountId: string;
  reason: string;
  evidenceUrl?: string;
  status: DisputeStatus;
  createdAt: string;
  resolution?: { verdict: 'accepted' | 'rejected'; note: string; decidedAt: string } | null;
  report: { _id: string; type: 'positive' | 'negative'; description: string } | null;
  account: { _id: string; displayName: string; username: string; avatarUrl?: string; platform?: string } | null;
};

type ClaimedAccount = {
  _id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  platform?: string;
};

type ReportSummary = {
  _id: string;
  type: 'positive' | 'negative';
  description: string;
  status: string;
  createdAt?: string;
};

function statusBadge(status: DisputeStatus) {
  switch (status) {
    case 'pending':
      return { label: 'Pending', tone: 'bg-amber-500/10 text-amber-600 border-amber-500/30', Icon: Clock };
    case 'under_review':
      return { label: 'Under review', tone: 'bg-blue-500/10 text-blue-600 border-blue-500/30', Icon: Hourglass };
    case 'accepted':
      return { label: 'Accepted', tone: 'bg-primary/10 text-primary border-primary/30', Icon: CheckCircle2 };
    case 'rejected':
      return { label: 'Rejected', tone: 'bg-destructive/10 text-destructive border-destructive/30', Icon: AlertTriangle };
    case 'withdrawn':
      return { label: 'Withdrawn', tone: 'bg-muted text-muted-foreground border-border', Icon: X };
    default:
      return { label: status, tone: 'bg-muted text-muted-foreground border-border', Icon: Clock };
  }
}

export default function DisputesPage() {
  const toast = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [claimed, setClaimed] = useState<ClaimedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  // Compose state
  const [accountId, setAccountId] = useState<string>('');
  const [reportOptions, setReportOptions] = useState<ReportSummary[]>([]);
  const [reportId, setReportId] = useState<string>('');
  const [disputeType, setDisputeType] = useState<string>('');
  const [reason, setReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadDisputes() {
    setLoading(true);
    try {
      const response = await fetch('/api/disputes', { cache: 'no-store' });
      const payload = await response.json();
      if (payload.ok) setDisputes(payload.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function loadMe() {
    const response = await fetch('/api/me', { cache: 'no-store' });
    const payload = await response.json();
    if (payload.ok) setClaimed(payload.data?.claimedAccounts ?? []);
  }

  useEffect(() => {
    loadDisputes();
    loadMe();
  }, []);

  // When the user picks an account, fetch its filings to choose a target.
  useEffect(() => {
    if (!accountId) {
      setReportOptions([]);
      setReportId('');
      return;
    }
    let alive = true;
    fetch(`/api/reports?accountId=${encodeURIComponent(accountId)}`)
      .then((r) => r.json())
      .then((payload) => {
        if (!alive || !payload.ok) return;
        setReportOptions(payload.data ?? []);
      });
    return () => {
      alive = false;
    };
  }, [accountId]);

  const canFile = claimed.length > 0;

  async function handleSubmit() {
    if (!reportId || reason.trim().length < 10) {
      toast.push('Reason must be at least 10 characters and a filing must be selected.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          disputeType: disputeType || undefined,
          reason: reason.trim(),
          evidenceUrl: evidenceUrl.trim() || undefined
        })
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Failed to file dispute.');
      toast.push('Dispute submitted. A moderator will review it.');
      setComposeOpen(false);
      setReason('');
      setEvidenceUrl('');
      setReportId('');
      setAccountId('');
      setDisputeType('');
      await loadDisputes();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Failed to file dispute.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw(id: string) {
    if (!confirm('Withdraw this dispute? You can re-file later if needed.')) return;
    const response = await fetch(`/api/disputes/${id}/withdraw`, { method: 'POST' });
    const payload = await response.json();
    if (!payload.ok) {
      toast.push(payload.error?.message ?? 'Failed to withdraw.');
      return;
    }
    await loadDisputes();
  }

  const sorted = useMemo(
    () =>
      [...disputes].sort((a, b) => {
        const order: Record<DisputeStatus, number> = {
          pending: 0,
          under_review: 1,
          accepted: 2,
          rejected: 3,
          withdrawn: 4
        };
        return order[a.status] - order[b.status] || (a.createdAt < b.createdAt ? 1 : -1);
      }),
    [disputes]
  );

  return (
    <main className="min-h-screen bg-background safe-bottom pt-8 px-4 lg:px-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h1 className="text-[28px] font-serif font-black text-foreground leading-none">Dispute Center</h1>
              <p className="text-[13px] text-muted-foreground mt-1.5 max-w-md">
                Challenge the factual accuracy of an approved filing on an account you own. Disputes need
                documented evidence.
              </p>
            </div>
          </div>
          <Button
            size="lg"
            onClick={() => setComposeOpen(true)}
            disabled={!canFile}
            className="shrink-0"
          >
            <Plus size={16} className="mr-2" />
            File Dispute
          </Button>
        </div>

        {!canFile && (
          <div className="rounded-[18px] border border-amber-500/30 bg-amber-500/5 p-5 mb-6">
            <p className="text-[14px] font-bold text-foreground">Claim an account first</p>
            <p className="text-[13px] text-muted-foreground mt-1">
              Disputes can only be filed by the verified owner of the subject account. Submit an ownership
              claim from the account&apos;s dossier and wait for admin approval.
            </p>
            <Link
              href="/search"
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-primary hover:underline"
            >
              Find your account and submit a claim <ExternalLink size={12} />
            </Link>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-[18px] border border-border bg-card p-5">
                <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="rounded-[24px] border border-border bg-card p-8 text-center">
            <ShieldAlert size={28} className="mx-auto text-muted-foreground/60" />
            <p className="mt-3 text-[15px] font-bold text-foreground">No disputes yet</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {canFile
                ? 'When a filing on your account is factually wrong, file a dispute and provide evidence.'
                : 'You have no claimed accounts with disputes on file.'}
            </p>
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <ul className="space-y-3">
            {sorted.map((d) => {
              const badge = statusBadge(d.status);
              const Icon = badge.Icon;
              return (
                <li key={d._id} className="rounded-[18px] border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider',
                            badge.tone
                          )}
                        >
                          <Icon size={12} />
                          {badge.label}
                        </span>
                        {d.report && (
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider',
                              d.report.type === 'positive'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-destructive/10 text-destructive'
                            )}
                          >
                            {d.report.type}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 text-[15px] font-bold text-foreground">
                        {d.account ? (
                          <Link href={`/account/${d.account._id}`} className="hover:underline">
                            {d.account.displayName}
                          </Link>
                        ) : (
                          'Account'
                        )}
                      </h3>
                      {d.report && (
                        <p className="text-[13px] text-muted-foreground mt-0.5 line-clamp-2">
                          Filing: {d.report.description}
                        </p>
                      )}
                      <p className="text-[13px] text-foreground/90 mt-3 leading-snug">
                        <span className="text-muted-foreground">Reason:</span> {d.reason}
                      </p>
                      {d.evidenceUrl && (
                        <a
                          href={d.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[12px] text-primary hover:underline mt-1 inline-block"
                        >
                          View evidence →
                        </a>
                      )}
                      {d.resolution && (
                        <div className="mt-3 rounded-[12px] border border-border bg-muted/30 px-3 py-2 text-[12px]">
                          <p className="font-bold text-foreground">
                            Resolution: {d.resolution.verdict === 'accepted' ? 'Accepted' : 'Rejected'}
                          </p>
                          {d.resolution.note && (
                            <p className="text-muted-foreground mt-0.5">{d.resolution.note}</p>
                          )}
                        </div>
                      )}
                    </div>
                    {(d.status === 'pending' || d.status === 'under_review') && (
                      <button
                        type="button"
                        onClick={() => handleWithdraw(d._id)}
                        className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[12px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {composeOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] bg-background border border-border p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[18px] font-bold">File a Dispute</h2>
              <button onClick={() => setComposeOpen(false)} className="text-muted-foreground" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Account
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px]"
                >
                  <option value="">Choose a claimed account…</option>
                  {claimed.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Filing
                </label>
                <select
                  value={reportId}
                  onChange={(e) => setReportId(e.target.value)}
                  disabled={!accountId || reportOptions.length === 0}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] disabled:opacity-50"
                >
                  <option value="">{accountId ? 'Choose a filing…' : 'Pick an account first'}</option>
                  {reportOptions.map((r) => (
                    <option key={r._id} value={r._id}>
                      [{r.type}] {r.description.slice(0, 80)}
                      {r.description.length > 80 ? '…' : ''}
                    </option>
                  ))}
                </select>
                {accountId && reportOptions.length === 0 && (
                  <p className="text-[12px] text-muted-foreground mt-1.5">No filings on this account yet.</p>
                )}
              </div>

              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Dispute Type
                </label>
                <select
                  value={disputeType}
                  onChange={(e) => setDisputeType(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px]"
                >
                  <option value="">Select a type (optional)</option>
                  <option value="factual_inaccuracy">Factual Inaccuracy — Contains false information</option>
                  <option value="outdated_information">Outdated Information — Situation has since changed</option>
                  <option value="missing_context">Missing Context — Filing lacks important context</option>
                  <option value="mistaken_identity">Mistaken Identity — Wrong person or entity</option>
                  <option value="evidence_fabricated">Evidence Fabricated — Provided evidence is manipulated</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Reason ({reason.length}/500)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 500))}
                  rows={5}
                  placeholder="Explain why this filing is factually inaccurate. Reference dates, sources, or context."
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] resize-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Evidence URL (optional)
                </label>
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px]"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || !reportId || reason.trim().length < 10}
                size="lg"
                className="w-full"
              >
                {submitting ? 'Submitting…' : 'Submit Dispute'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
