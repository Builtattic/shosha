'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type AuditRow = {
  _id: string;
  reason: string;
  status: string;
  account: { _id: string; displayName: string; platform: string; username: string } | null;
  user: { _id: string; username: string; email: string } | null;
  createdAt?: string;
};

export function AuditsList({ initialAudits }: { initialAudits: AuditRow[] }) {
  const [audits, setAudits] = useState(initialAudits);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  async function decide(auditId: string, verdict: 'completed' | 'rejected') {
    setBusyId(auditId);
    try {
      const res = await fetch(`/api/admin/audits/${auditId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdict }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? 'Failed');
      setAudits((prev) => prev.filter((a) => a._id !== auditId));
      toast.push(`Audit marked as ${verdict}.`);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  if (!audits.length) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/4 p-16 text-center">
        <CheckCircle size={28} className="text-emerald-400 mx-auto mb-3" />
        <p className="text-white/50 text-sm font-medium">No audits pending.</p>
        <p className="text-white/25 text-xs mt-1">The audit queue is clear.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {audits.map((audit) => {
        const busy = busyId === audit._id || pending;
        return (
          <article key={audit._id} className="rounded-xl border border-white/8 bg-white/4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={12} className="text-cyan-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">{audit.status}</span>
                  {audit.createdAt && (
                    <span className="text-[10px] text-white/25">
                      {new Date(audit.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-white">{audit.account?.displayName ?? 'Unknown Account'}</h2>
                {audit.account && (
                  <p className="text-xs text-white/30 mt-0.5">@{audit.account.username} · {audit.account.platform}</p>
                )}
                <p className="text-sm text-white/50 mt-3 leading-relaxed">{audit.reason || 'No reason provided.'}</p>
                {audit.user && (
                  <div className="flex items-center gap-1.5 mt-3">
                    <User size={11} className="text-white/25" />
                    <p className="text-xs text-white/30">
                      Filed by @{audit.user.username}
                      {audit.user.email ? ` (${audit.user.email})` : ''}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => decide(audit._id, 'completed')}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/25 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                >
                  <CheckCircle size={13} />
                  Complete
                </button>
                <button
                  onClick={() => decide(audit._id, 'rejected')}
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
