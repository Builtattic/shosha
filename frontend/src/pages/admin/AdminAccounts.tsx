import { useEffect, useMemo, useState } from 'react';
import {
  createAdminAccount,
  deleteAdminAccount,
  listAdminAccounts,
  updateAdminAccount,
} from '@/api/admin';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';

type AdminAccount = {
  id: string;
  platform: string;
  handle: string;
  display_name: string | null;
  bio: string | null;
  status: string;
  score: number;
  owner_user_id: string | null;
  created_at: string;
};

const STATUSES = ['ACTIVE', 'UNDER_REVIEW', 'DISPUTED', 'REMOVED'] as const;
const PLATFORMS = ['x', 'instagram', 'facebook', 'youtube', 'tiktok', 'linkedin', 'reddit', 'snapchat', 'website'];

function shortId(id: string | null) {
  if (!id) return '—';
  return id.slice(0, 8);
}

export default function AdminAccounts() {
  const toast = useToast();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);
  const [scoreOverrideId, setScoreOverrideId] = useState<string | null>(null);
  const [newScore, setNewScore] = useState('');
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ platform: 'x', handle: '', display_name: '', bio: '' });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listAdminAccounts();
        if (mounted) setAccounts(data as AdminAccount[]);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load accounts');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = searchQ.toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.handle.toLowerCase().includes(q) ||
        (a.display_name ?? '').toLowerCase().includes(q) ||
        a.platform.toLowerCase().includes(q),
    );
  }, [accounts, searchQ]);

  async function handleScoreSave(accountId: string) {
    const score = Number(newScore);
    if (!Number.isFinite(score)) {
      toast.push('Enter a valid score');
      return;
    }
    setBusyId(accountId);
    try {
      await updateAdminAccount(accountId, { score });
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, score } : a)));
      toast.push('Score updated.');
      setScoreOverrideId(null);
      setNewScore('');
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed to update score');
    } finally {
      setBusyId(null);
    }
  }

  async function handleEditSave() {
    if (!editingAccount) return;
    setSaving(true);
    try {
      const updated = await updateAdminAccount(editingAccount.id, {
        display_name: editingAccount.display_name ?? undefined,
        bio: editingAccount.bio ?? undefined,
        status: editingAccount.status,
        score: editingAccount.score,
        owner_user_id: editingAccount.owner_user_id || null,
      });
      setAccounts((prev) =>
        prev.map((a) => (a.id === editingAccount.id ? { ...a, ...(updated as AdminAccount) } : a)),
      );
      toast.push('Account updated.');
      setEditingAccount(null);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed to update account');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (!createForm.handle.trim()) {
      toast.push('Handle is required');
      return;
    }
    setSaving(true);
    try {
      const created = await createAdminAccount({
        platform: createForm.platform,
        handle: createForm.handle.trim(),
        display_name: createForm.display_name.trim() || undefined,
        bio: createForm.bio.trim() || undefined,
      });
      setAccounts((prev) => [created as AdminAccount, ...prev]);
      toast.push('Account created.');
      setCreating(false);
      setCreateForm({ platform: 'x', handle: '', display_name: '', bio: '' });
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(accountId: string, name: string) {
    if (!confirm(`Delete account "${name}"?`)) return;
    setBusyId(accountId);
    try {
      await deleteAdminAccount(accountId);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      toast.push(`Account "${name}" deleted.`);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-wide">Social Accounts</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-muted-foreground">
            {accounts.length} tracked
          </span>
          <Button size="sm" onClick={() => setCreating(true)}>Create Account</Button>
        </div>
      </div>

      <input
        value={searchQ}
        onChange={(e) => setSearchQ(e.target.value)}
        placeholder="Search by handle, name, or platform…"
        className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm"
      />

      <div className="overflow-x-auto rounded-3xl border border-border bg-card">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="bg-secondary/30">
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-muted-foreground">Account</th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-muted-foreground">Platform</th>
              <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-muted-foreground">Score</th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-muted-foreground">Owner</th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((account) => (
              <tr key={account.id}>
                <td className="px-4 py-3 font-bold">{account.display_name ?? account.handle}</td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{account.platform}</td>
                <td className="px-4 py-3 text-right font-mono font-black">{account.score}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-black uppercase">
                    {account.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {shortId(account.owner_user_id)}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(account.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={() => {
                      setScoreOverrideId(account.id);
                      setNewScore(String(account.score));
                    }}>
                      Score
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingAccount({ ...account })}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === account.id}
                      onClick={() => handleDelete(account.id, account.display_name ?? account.handle)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {scoreOverrideId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setScoreOverrideId(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black">Override Score</h3>
            <input
              type="number"
              value={newScore}
              onChange={(e) => setNewScore(e.target.value)}
              className="mt-4 h-12 w-full rounded-xl border border-border px-4 text-2xl font-mono font-black text-center"
            />
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setScoreOverrideId(null)}>Cancel</Button>
              <Button className="flex-1" disabled={busyId === scoreOverrideId} onClick={() => handleScoreSave(scoreOverrideId)}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditingAccount(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black">Edit Account</h3>
            {/* TODO: expand when backend AccountUpdatePayload supports more fields */}
            <div className="mt-4 space-y-4">
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Display name</span>
                <input
                  value={editingAccount.display_name ?? ''}
                  onChange={(e) => setEditingAccount({ ...editingAccount, display_name: e.target.value })}
                  className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Bio</span>
                <textarea
                  value={editingAccount.bio ?? ''}
                  onChange={(e) => setEditingAccount({ ...editingAccount, bio: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Status</span>
                <select
                  value={editingAccount.status}
                  onChange={(e) => setEditingAccount({ ...editingAccount, status: e.target.value })}
                  className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Score</span>
                <input
                  type="number"
                  value={editingAccount.score}
                  onChange={(e) => setEditingAccount({ ...editingAccount, score: Number(e.target.value) })}
                  className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Owner user ID (optional)</span>
                <input
                  value={editingAccount.owner_user_id ?? ''}
                  onChange={(e) => setEditingAccount({ ...editingAccount, owner_user_id: e.target.value || null })}
                  className="h-11 w-full rounded-xl border border-border px-3 text-sm font-mono"
                />
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditingAccount(null)}>Cancel</Button>
              <Button className="flex-1" disabled={saving} onClick={handleEditSave}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setCreating(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black">Create Account</h3>
            <div className="mt-4 space-y-4">
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Platform</span>
                <select
                  value={createForm.platform}
                  onChange={(e) => setCreateForm({ ...createForm, platform: e.target.value })}
                  className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Handle *</span>
                <input
                  value={createForm.handle}
                  onChange={(e) => setCreateForm({ ...createForm, handle: e.target.value })}
                  className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Display name</span>
                <input
                  value={createForm.display_name}
                  onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })}
                  className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Bio</span>
                <textarea
                  value={createForm.bio}
                  onChange={(e) => setCreateForm({ ...createForm, bio: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCreating(false)}>Cancel</Button>
              <Button className="flex-1" disabled={saving} onClick={handleCreate}>{saving ? 'Creating…' : 'Create'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
