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
      <div className="rounded-xl border border-white/8 bg-white/4 p-16 text-center">
        <ShieldOff size={28} className="text-emerald-400 mx-auto mb-3" />
        <p className="text-white/50 text-sm font-medium">No abuse signals.</p>
        <p className="text-white/25 text-xs mt-1">The abuse queue is clear.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => {
        const busy = busyId === report._id || pending;
        return (
          <article key={report._id} className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Flags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {report.abuseFlags.map((flag) => (
                    <span key={flag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-[10px] font-bold uppercase tracking-wide text-red-400">
                      <AlertTriangle size={9} />
                      {flag.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
                <h2 className="text-lg font-bold text-white">{report.account?.displayName ?? 'Unknown Account'}</h2>
                {report.account && (
                  <p className="text-xs text-white/30 mt-0.5">@{report.account.username} · {report.account.platform}</p>
                )}
                <p className="text-sm text-white/50 mt-3 leading-relaxed line-clamp-3">{report.description}</p>
                {report.createdAt && (
                  <p className="text-xs text-white/20 mt-2 font-mono">{new Date(report.createdAt).toLocaleString()}</p>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Link
                  href={`/admin/review/${report._id}`}
                  className="flex items-center gap-2 rounded-lg bg-white/8 border border-white/10 px-3 py-2 text-xs font-bold text-white/60 hover:bg-white/12 transition-colors"
                >
                  <Gavel size={13} />
                  Review
                </Link>
                <button
                  onClick={() => dismiss(report._id)}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-bold text-white/40 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <ShieldOff size={13} />
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
