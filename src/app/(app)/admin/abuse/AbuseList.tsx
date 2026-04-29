'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldOff, Gavel, ExternalLink, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

type AbuseRow = {
  _id: string;
  description: string;
  type: string;
  abuseFlags: string[];
  account: { _id: string; displayName: string; platform: string; username: string } | null;
  createdAt?: string;
};

export function AbuseList({ initialReports }: { initialReports: AbuseRow[] }) {
  const [reports, setReports] = useState(initialReports);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  async function dismiss(reportId: string) {
    setBusyId(reportId);
    try {
      const res = await fetch(`/api/admin/abuse/${reportId}/dismiss`, { method: 'POST' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? 'Failed');
      setReports((prev) => prev.filter((r) => r._id !== reportId));
      toast.push('Abuse flags dismissed.');
      startTransition(() => router.refresh());
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Failed to dismiss');
    } finally {
      setBusyId(null);
    }
  }

  if (!reports.length) {
    return (
      <div className="rounded-3xl border border-border bg-card p-20 text-center">
        <div className="h-16 w-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
          <ShieldOff size={32} />
        </div>
        <h3 className="text-xl font-black text-foreground mb-2">No abuse signals</h3>
        <p className="text-muted-foreground text-sm">The oversight queue is clear.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {reports.map((report) => {
        const busy = busyId === report._id || pending;
        return (
          <article key={report._id} className="p-6 hover:bg-secondary/20 transition-colors">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                {/* Flags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {report.abuseFlags.map((flag) => (
                    <span key={flag} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-100 border border-red-100 text-[11px] font-black uppercase tracking-wide text-red-700">
                      <AlertTriangle size={10} />
                      {flag.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
                <h2 className="text-xl font-black text-foreground">{report.account?.displayName ?? 'Unknown Account'}</h2>
                {report.account && (
                  <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">
                    @{report.account.username} · {report.account.platform}
                  </p>
                )}
                <p className="text-[15px] text-muted-foreground mt-4 leading-relaxed line-clamp-2 font-medium">{report.description}</p>
                {report.createdAt && (
                  <p className="text-[11px] text-muted-foreground/40 mt-4 font-black uppercase tracking-widest">
                    Flagged {new Date(report.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Link
                  href={`/admin/review/${report._id}`}
                  className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[12px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
                >
                  <Gavel size={14} />
                  Review
                </Link>
                <button
                  onClick={() => dismiss(report._id)}
                  disabled={busy}
                  className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-border bg-background text-[12px] font-black uppercase tracking-wider text-muted-foreground hover:border-red-200 hover:text-red-600 transition-all disabled:opacity-50"
                >
                  <ShieldOff size={14} />
                  Dismiss
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
