'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Pin, Star, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { ReportRecord } from '@/lib/repos/reports';

type FeedRow = ReportRecord & { account: { displayName: string; username: string; platform: string } | null };

export function AdminFeedTable({ initialReports }: { initialReports: FeedRow[] }) {
  const [reports, setReports] = useState(initialReports);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  async function patchReport(id: string, patch: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Update failed.');
      setReports((prev) => prev.map((r) => (r._id === id ? { ...r, ...payload.data } : r)));
      toast.push('Feed item updated.');
      startTransition(() => router.refresh());
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Update failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteReport(id: string) {
    if (!confirm('Delete this report permanently?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, { method: 'DELETE' });
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Delete failed.');
      setReports((prev) => prev.filter((r) => r._id !== id));
      toast.push('Report deleted.');
      startTransition(() => router.refresh());
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Delete failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="bg-secondary/30"><th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Claim</th><th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th><th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Controls</th></tr></thead>
        <tbody className="divide-y divide-border">
          {reports.map((report) => {
            const busy = busyId === report._id || pending;
            return (
              <tr key={report._id} className="hover:bg-secondary/20">
                <td className="max-w-md px-5 py-4">
                  <div className="mb-2 flex flex-wrap gap-2"><span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${report.type === 'positive' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{report.type}</span>{report.source === 'admin' && <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase text-primary">admin</span>}</div>
                  <p className="font-black text-foreground">{report.account?.displayName ?? 'Unknown account'}</p>
                  <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">{report.description}</p>
                </td>
                <td className="px-5 py-4">
                  <div className="space-y-2">
                    <span className="inline-flex min-h-9 items-center rounded-xl border border-border bg-secondary/40 px-3 py-1 text-xs font-bold text-muted-foreground">
                      {report.status}
                    </span>
                    <select disabled={busy} value={report.visibility ?? 'public'} onChange={(e) => patchReport(report._id, { visibility: e.target.value })} className="admin-input h-9 py-1 text-xs"><option value="public">public</option><option value="hidden">hidden</option></select>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <button disabled={busy} title="Toggle visibility" onClick={() => patchReport(report._id, { visibility: report.visibility === 'hidden' ? 'public' : 'hidden' })} className="rounded-lg border border-border p-2 hover:bg-secondary">{report.visibility === 'hidden' ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                    <button disabled={busy} title="Pin" onClick={() => patchReport(report._id, { pinned: !report.pinned })} className={`rounded-lg border border-border p-2 hover:bg-secondary ${report.pinned ? 'text-primary' : 'text-muted-foreground'}`}><Pin size={15} /></button>
                    <button disabled={busy} title="Feature" onClick={() => patchReport(report._id, { featured: !report.featured })} className={`rounded-lg border border-border p-2 hover:bg-secondary ${report.featured ? 'text-amber-600' : 'text-muted-foreground'}`}><Star size={15} /></button>
                    <button disabled={busy} title="Delete" onClick={() => deleteReport(report._id)} className="rounded-lg border border-border p-2 text-destructive hover:bg-destructive/5"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
