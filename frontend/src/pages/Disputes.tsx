import { useEffect, useState } from 'react';
import { ShieldAlert, Plus } from 'lucide-react';
import {
  listMyDisputes,
  createDispute,
  withdrawDispute,
  type Dispute,
} from '@/api/disputes';
import { useToast } from '@/components/ui/Toast';
import { cn, formatDate } from '@/lib/utils';

function statusBadge(status: Dispute['status']) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    case 'UNDER_REVIEW':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
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

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export default function Disputes() {
  const toast = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [reportId, setReportId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [reason, setReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  async function loadDisputes() {
    setLoading(true);
    setError('');
    try {
      const data = await listMyDisputes();
      setDisputes(data);
    } catch {
      setError('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDisputes();
  }, []);

  async function handleWithdraw(id: string) {
    try {
      const updated = await withdrawDispute(id);
      setDisputes((prev) => prev.map((d) => (d.id === id ? updated : d)));
      toast.push('Dispute withdrawn');
    } catch (err: unknown) {
      toast.push(err instanceof Error ? err.message : 'Failed to withdraw dispute');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (reason.trim().length < 10) {
      setFormError('Reason must be at least 10 characters.');
      return;
    }
    if (!reportId.trim() || !accountId.trim()) {
      setFormError('Report ID and Account ID are required.');
      return;
    }
    setSubmitting(true);
    try {
      const dispute = await createDispute({
        report_id: reportId.trim(),
        account_id: accountId.trim(),
        reason: reason.trim(),
        evidence_url: evidenceUrl.trim() || undefined,
      });
      setDisputes((prev) => [dispute, ...prev]);
      setComposeOpen(false);
      setReportId('');
      setAccountId('');
      setReason('');
      setEvidenceUrl('');
      toast.push('Dispute submitted');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to file dispute');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background safe-bottom pb-20 md:pb-8 pt-8 px-4 lg:px-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h1 className="font-serif text-[28px] font-black leading-none tracking-tight text-foreground">
                Dispute Center
              </h1>
              <p className="text-[13px] text-muted-foreground mt-1.5 max-w-md">
                Challenge the factual accuracy of an approved filing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setComposeOpen((v) => !v)}
            className="shrink-0 flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-[13px] font-bold text-background"
          >
            <Plus size={16} />
            File Dispute
          </button>
        </div>

        {composeOpen && (
          <form
            onSubmit={handleSubmit}
            className="mb-8 rounded-[18px] border border-border bg-card p-5 space-y-4"
          >
            <h2 className="text-[16px] font-bold">File a Dispute</h2>
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Report ID
              </label>
              <input
                type="text"
                value={reportId}
                onChange={(e) => setReportId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[14px]"
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Account ID
              </label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[14px]"
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Reason (min 10 characters)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[14px] resize-none"
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Evidence URL (optional)
              </label>
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[14px]"
              />
            </div>
            {formError && (
              <p className="text-[13px] text-destructive font-medium">{formError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-bold text-background disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit Dispute'}
              </button>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="rounded-full border border-border px-5 py-2.5 text-[13px] font-bold"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-[18px] border border-border bg-card" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-[24px] border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-[14px] font-bold text-destructive">{error}</p>
          </div>
        )}

        {!loading && !error && disputes.length === 0 && (
          <div className="rounded-[24px] border border-border bg-card p-8 text-center">
            <ShieldAlert size={28} className="mx-auto text-muted-foreground/60" />
            <p className="mt-3 text-[15px] font-bold text-foreground">No disputes filed yet</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              When a filing is factually wrong, file a dispute and provide evidence.
            </p>
          </div>
        )}

        {!loading && !error && disputes.length > 0 && (
          <ul className="space-y-3">
            {disputes.map((d) => (
              <li key={d.id} className="rounded-[18px] border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase',
                          statusBadge(d.status),
                        )}
                      >
                        {d.status.replace('_', ' ')}
                      </span>
                      <span className="text-[12px] text-muted-foreground font-mono">
                        Report {d.report_id.slice(0, 8)}…
                      </span>
                    </div>
                    <p className="mt-3 text-[13px] text-foreground leading-snug">
                      {truncate(d.reason, 120)}
                    </p>
                    {d.evidence_url && (
                      <a
                        href={d.evidence_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[12px] text-primary hover:underline mt-1 inline-block"
                      >
                        View evidence →
                      </a>
                    )}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {formatDate(d.created_at)}
                    </p>
                  </div>
                  {(d.status === 'PENDING' || d.status === 'UNDER_REVIEW') && (
                    <button
                      type="button"
                      onClick={() => handleWithdraw(d.id)}
                      className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[12px] font-bold text-muted-foreground hover:bg-muted"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
