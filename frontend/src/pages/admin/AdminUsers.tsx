import { useEffect, useMemo, useState } from 'react';
import { deleteAdminUser, listAdminUsers, updateAdminUser } from '@/api/admin';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/providers/AuthProvider';
import { cn, formatDate } from '@/lib/utils';

type AdminUser = {
  id: string;
  username: string;
  display_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
  photo_url: string | null;
  created_at: string;
};

const ROLES = ['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'] as const;

function roleBadgeClass(role: string) {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'ADMIN':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'MODERATOR':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    default:
      return 'bg-secondary text-muted-foreground border-border';
  }
}

export default function AdminUsers() {
  const toast = useToast();
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listAdminUsers();
        if (mounted) setUsers(data as AdminUser[]);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load users');
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
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.display_name ?? '').toLowerCase().includes(q),
    );
  }, [users, searchQ]);

  async function handleDelete(userId: string, username: string) {
    if (profile?.id === userId) {
      toast.push('Cannot delete your own account');
      return;
    }
    if (!confirm(`Delete user ${username}? This cannot be undone.`)) return;
    setBusyId(userId);
    try {
      await deleteAdminUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.push(`User ${username} deleted.`);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setBusyId(null);
    }
  }

  async function handleSave() {
    if (!editingUser) return;
    setSaving(true);
    try {
      const updated = await updateAdminUser(editingUser.id, {
        role: editingUser.role,
        is_active: editingUser.is_active,
        email: editingUser.email,
        username: editingUser.username,
        display_name: editingUser.display_name ?? undefined,
        photo_url: editingUser.photo_url ?? undefined,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, ...(updated as AdminUser) } : u)),
      );
      toast.push('User updated.');
      setEditingUser(null);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
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
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wide">Registered Users</h2>
        <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-muted-foreground">
          {users.length} total
        </span>
      </div>

      <input
        value={searchQ}
        onChange={(e) => setSearchQ(e.target.value)}
        placeholder="Filter users…"
        className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm"
      />

      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="bg-secondary/30">
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-muted-foreground">User</th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-muted-foreground">Active</th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-muted-foreground">Joined</th>
              <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <p className="font-bold">{user.display_name ?? user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('rounded border px-2 py-0.5 text-[10px] font-black uppercase', roleBadgeClass(user.role))}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs font-bold', user.is_active ? 'text-emerald-600' : 'text-red-600')}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(user.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditingUser({ ...user })}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === user.id}
                      onClick={() => handleDelete(user.id, user.username)}
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

      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditingUser(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black">Edit User</h3>
            <p className="mt-1 text-sm text-muted-foreground">{editingUser.username}</p>
            {/* TODO: expand when backend UserUpdateRequest supports more fields */}
            <div className="mt-6 space-y-4">
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Role</span>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingUser.is_active}
                  onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                />
                <span className="text-sm font-medium">Active</span>
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Email</span>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Username</span>
                <input
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Display name</span>
                <input
                  value={editingUser.display_name ?? ''}
                  onChange={(e) => setEditingUser({ ...editingUser, display_name: e.target.value })}
                  className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Photo URL</span>
                <input
                  value={editingUser.photo_url ?? ''}
                  onChange={(e) => setEditingUser({ ...editingUser, photo_url: e.target.value })}
                  className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                />
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button className="flex-1" disabled={saving} onClick={handleSave}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
