'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, FilePlus, UserCheck } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { Platform } from '@/types';

type AccountOption = { _id: string; displayName: string; username: string; platform: Platform };
type UserOption = { _id: string; username: string; email: string };
const platforms: Platform[] = ['x', 'instagram', 'facebook', 'youtube', 'tiktok', 'linkedin', 'website'];

export function AdminCreatePanel({ initialAccounts, users }: { initialAccounts: AccountOption[]; users: UserOption[] }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const [accountForm, setAccountForm] = useState({ platform: 'x' as Platform, username: '', displayName: '', bio: '', avatarUrl: '', followers: '0', verified: false });
  const [reportForm, setReportForm] = useState({ accountId: initialAccounts[0]?._id ?? '', type: 'positive', description: '', feelings: 'Published by the Shosha admin team.', mediaUrl: '', mediaType: 'image', finalImpact: 0, status: 'approved', visibility: 'public', pinned: false, featured: false });
  const [ownership, setOwnership] = useState({ accountId: initialAccounts[0]?._id ?? '', userId: users[0]?._id ?? '' });

  async function submit(action: () => Promise<void>) {
    try { await action(); } catch (error) { toast.push(error instanceof Error ? error.message : 'Action failed.'); }
  }

  async function createAccount() {
    const res = await fetch('/api/admin/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...accountForm, displayName: accountForm.displayName || undefined, bio: accountForm.bio || undefined, avatarUrl: accountForm.avatarUrl || undefined }) });
    const payload = await res.json();
    if (!payload.ok) throw new Error(payload.error?.message ?? 'Account create failed.');
    setAccounts((prev) => prev.some((a) => a._id === payload.data._id) ? prev : [payload.data, ...prev]);
    setReportForm((form) => ({ ...form, accountId: payload.data._id }));
    toast.push('Account created.');
    startTransition(() => router.refresh());
  }

  async function createReport() {
    const res = await fetch('/api/admin/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...reportForm, media: { url: reportForm.mediaUrl, type: reportForm.mediaType, width: 0, height: 0, bytes: 0 }, finalImpact: Number(reportForm.finalImpact) }) });
    const payload = await res.json();
    if (!payload.ok) throw new Error(payload.error?.message ?? 'Claim create failed.');
    toast.push('Feed claim published.');
    setReportForm((form) => ({ ...form, description: '', mediaUrl: '', finalImpact: 0, pinned: false, featured: false }));
    startTransition(() => router.refresh());
  }

  async function assignOwnership() {
    const res = await fetch('/api/admin/ownership', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ownership) });
    const payload = await res.json();
    if (!payload.ok) throw new Error(payload.error?.message ?? 'Ownership assignment failed.');
    toast.push('Ownership assigned.');
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="mb-5 flex items-center gap-2"><FilePlus size={18} className="text-primary" /><h3 className="text-sm font-black uppercase tracking-widest text-foreground">Feed Claim</h3></div>
        <div className="space-y-3">
          <select value={reportForm.accountId} onChange={(e) => setReportForm({ ...reportForm, accountId: e.target.value })} className="admin-input">{accounts.map((a) => <option key={a._id} value={a._id}>{a.displayName} @{a.username}</option>)}</select>
          <div className="grid grid-cols-2 gap-3"><select value={reportForm.type} onChange={(e) => setReportForm({ ...reportForm, type: e.target.value })} className="admin-input"><option value="positive">Positive</option><option value="negative">Negative</option></select><input type="number" min="-10" max="10" value={reportForm.finalImpact} onChange={(e) => setReportForm({ ...reportForm, finalImpact: Number(e.target.value) })} className="admin-input" /></div>
          <textarea value={reportForm.description} onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })} placeholder="Claim description" rows={4} className="admin-input min-h-28" />
          <input value={reportForm.mediaUrl} onChange={(e) => setReportForm({ ...reportForm, mediaUrl: e.target.value })} placeholder="Evidence media URL" className="admin-input" />
          <div className="grid grid-cols-2 gap-3"><select value={reportForm.status} onChange={(e) => setReportForm({ ...reportForm, status: e.target.value })} className="admin-input"><option value="approved">Approved</option><option value="ai_reviewed">AI reviewed</option><option value="flagged">Flagged</option></select><select value={reportForm.visibility} onChange={(e) => setReportForm({ ...reportForm, visibility: e.target.value })} className="admin-input"><option value="public">Public</option><option value="hidden">Hidden</option></select></div>
          <label className="admin-check"><input type="checkbox" checked={reportForm.pinned} onChange={(e) => setReportForm({ ...reportForm, pinned: e.target.checked })} /> Pin to top</label>
          <label className="admin-check"><input type="checkbox" checked={reportForm.featured} onChange={(e) => setReportForm({ ...reportForm, featured: e.target.checked })} /> Mark featured</label>
          <button disabled={pending || !reportForm.accountId} onClick={() => submit(createReport)} className="admin-button"><CheckCircle size={15} /> Publish claim</button>
        </div>
      </section>
      <section className="rounded-3xl border border-border bg-card p-6">
        <h3 className="mb-5 text-sm font-black uppercase tracking-widest text-foreground">Create Account</h3>
        <div className="space-y-3">
          <select value={accountForm.platform} onChange={(e) => setAccountForm({ ...accountForm, platform: e.target.value as Platform })} className="admin-input">{platforms.map((p) => <option key={p} value={p}>{p}</option>)}</select>
          <input value={accountForm.username} onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })} placeholder="Username" className="admin-input" />
          <input value={accountForm.displayName} onChange={(e) => setAccountForm({ ...accountForm, displayName: e.target.value })} placeholder="Display name" className="admin-input" />
          <input value={accountForm.avatarUrl} onChange={(e) => setAccountForm({ ...accountForm, avatarUrl: e.target.value })} placeholder="Avatar URL" className="admin-input" />
          <label className="admin-check"><input type="checkbox" checked={accountForm.verified} onChange={(e) => setAccountForm({ ...accountForm, verified: e.target.checked })} /> Verified</label>
          <button disabled={pending} onClick={() => submit(createAccount)} className="admin-button"><CheckCircle size={15} /> Create account</button>
        </div>
      </section>
      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="mb-5 flex items-center gap-2"><UserCheck size={18} className="text-primary" /><h3 className="text-sm font-black uppercase tracking-widest text-foreground">Ownership</h3></div>
        <div className="space-y-3">
          <select value={ownership.accountId} onChange={(e) => setOwnership({ ...ownership, accountId: e.target.value })} className="admin-input">{accounts.map((a) => <option key={a._id} value={a._id}>{a.displayName} @{a.username}</option>)}</select>
          <select value={ownership.userId} onChange={(e) => setOwnership({ ...ownership, userId: e.target.value })} className="admin-input">{users.map((u) => <option key={u._id} value={u._id}>@{u.username} {u.email ? `(${u.email})` : ''}</option>)}</select>
          <button disabled={pending || !ownership.accountId || !ownership.userId} onClick={() => submit(assignOwnership)} className="admin-button"><CheckCircle size={15} /> Assign owner</button>
        </div>
      </section>
    </div>
  );
}
