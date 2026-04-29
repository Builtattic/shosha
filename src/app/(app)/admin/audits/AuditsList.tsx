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
      <div className="rounded-3xl border border-border bg-card p-20 text-center">
        <div className="h-16 w-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={32} />
        </div>
        <h3 className="text-xl font-black text-foreground mb-2">No audits pending</h3>
        <p className="text-muted-foreground text-sm">The verification queue is clear.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {audits.map((audit) => {
        const busy = busyId === audit._id || pending;
        return (
          <article key={audit._id} className="p-6 hover:bg-secondary/20 transition-colors">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-100 text-cyan-700">
                    {audit.status}
                  </span>
                  {audit.createdAt && (
                    <span className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                      {new Date(audit.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-foreground">{audit.account?.displayName ?? 'Unknown Account'}</h2>
                {audit.account && (
                  <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">
                    @{audit.account.username} · {audit.account.platform}
                  </p>
                )}
                <p className="text-[15px] text-muted-foreground mt-4 leading-relaxed font-medium bg-secondary/30 p-4 rounded-2xl border border-border/50">
                  {audit.reason || 'No reason provided.'}
                </p>
                {audit.user && (
                  <div className="flex items-center gap-2 mt-4">
                    <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                      <User size={12} />
                    </div>
                    <p className="text-[12px] font-bold text-muted-foreground">
                      Requested by <span className="text-foreground">@{audit.user.username}</span>
                      {audit.user.email ? <span className="ml-1 opacity-50 font-medium">({audit.user.email})</span> : ''}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => decide(audit._id, 'completed')}
                  disabled={busy}
                  className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 text-white text-[12px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
                >
                  <CheckCircle size={14} />
                  Approve
                </button>
                <button
                  onClick={() => decide(audit._id, 'rejected')}
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
