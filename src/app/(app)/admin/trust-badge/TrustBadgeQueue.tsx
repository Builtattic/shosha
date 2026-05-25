'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, ExternalLink, User, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import type { AppUser } from '@/lib/repos/users';

type TrustBadgeRow = Pick<
  AppUser,
  | '_id'
  | 'name'
  | 'username'
  | 'email'
  | 'trustBadgeSubmittedAt'
  | 'trustBadgeDocType'
  | 'trustBadgeSelfieUrl'
  | 'trustBadgeDocUrl'
>;

export function TrustBadgeQueue({ items }: { items: TrustBadgeRow[] }) {
  const [rows, setRows] = useState(items);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  async function decide(userId: string, verdict: 'approved' | 'rejected') {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/admin/trust-badge/${userId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdict, note: notesById[userId]?.trim() ?? '' }),
      });
      const payload = await res.json().catch(() => null);
      if (!payload?.ok) throw new Error(payload?.error?.message ?? 'Decision failed.');

      setRows((prev) => prev.filter((row) => row._id !== userId));
      toast.push(`Trust badge ${verdict}.`);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Decision failed.');
    } finally {
      setBusyId(null);
    }
  }

  if (!rows.length) {
    return (
      <div className="rounded-3xl border border-border bg-card p-20 text-center">
        <div className="h-16 w-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={32} />
        </div>
        <h3 className="text-xl font-black text-foreground mb-2">No trust badges pending</h3>
        <p className="text-muted-foreground text-sm">All submissions are reviewed.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {rows.map((item) => {
        const busy = busyId === item._id || pending;
        return (
          <article key={item._id} className="p-6 hover:bg-secondary/20 transition-colors">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                    {item.trustBadgeDocType ?? 'unknown'}
                  </span>
                  {item.trustBadgeSubmittedAt && (
                    <span className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                      {formatDate(item.trustBadgeSubmittedAt)}
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-black text-foreground">
                  {item.name?.trim() || item.username || 'Unknown User'}
                </h2>
                <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">
                  @{item.username} {item.email ? `· ${item.email}` : ''}
                </p>

                <div className="mt-4 flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full border border-border overflow-hidden bg-muted flex items-center justify-center">
                    {item.trustBadgeSelfieUrl ? (
                      <img
                        src={item.trustBadgeSelfieUrl}
                        alt="Selfie preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={18} className="text-muted-foreground" />
                    )}
                  </div>

                  <a
                    href={item.trustBadgeDocUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary/30 transition-colors"
                  >
                    <FileText size={14} />
                    View Document
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div className="mt-4">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Note (optional)
                  </label>
                  <input
                    value={notesById[item._id] ?? ''}
                    onChange={(event) =>
                      setNotesById((prev) => ({ ...prev, [item._id]: event.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Add context for approval or rejection"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => decide(item._id, 'approved')}
                  disabled={busy}
                  className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 text-white text-[12px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
                >
                  <CheckCircle size={14} />
                  Approve
                </button>
                <button
                  onClick={() => decide(item._id, 'rejected')}
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
