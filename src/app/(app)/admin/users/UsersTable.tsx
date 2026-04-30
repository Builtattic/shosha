'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Shield, User, MoreHorizontal, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { AppUser } from '@/lib/repos/users';

type UserRow = AppUser;
const roles = ['user', 'moderator', 'editor', 'admin', 'super_admin'] as const;

function RoleBadge({ role }: { role: string }) {
  const elevated = role !== 'user';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
      elevated
        ? 'bg-red-100 text-red-700 border border-red-200'
        : 'bg-secondary text-muted-foreground border border-border'
    }`}>
      {elevated ? <Shield size={9} /> : <User size={9} />}
      {role}
    </span>
  );
}

export function UsersTable({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'username' | 'reporterScore' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const filtered = users
    .filter((u) =>
      !search ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let va: string | number = sortBy === 'username' ? a.username : sortBy === 'reporterScore' ? a.reporterScore : (a.createdAt ?? '');
      let vb: string | number = sortBy === 'username' ? b.username : sortBy === 'reporterScore' ? b.reporterScore : (b.createdAt ?? '');
      if (typeof va === 'string' && typeof vb === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('asc'); }
  }

  function SortIcon({ col }: { col: typeof sortBy }) {
    if (sortBy !== col) return <ChevronUp size={12} className="opacity-20" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />;
  }

  async function toggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === 'user' ? 'admin' : 'user';
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? 'Failed');
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole as 'admin' | 'user' } : u)));
      toast.push(`Role changed to ${newRole}`);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Failed to update role');
    }
    setOpenMenu(null);
  }

  async function saveUser() {
    if (!editUser) return;
    try {
      const res = await fetch(`/api/admin/users/${editUser._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editUser.role,
          reporterScore: Number(editUser.reporterScore),
          claimedAccounts: editUser.claimedAccounts ?? [],
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? 'Failed');
      setUsers((prev) => prev.map((u) => (u._id === editUser._id ? data.data : u)));
      toast.push('User updated.');
      setEditUser(null);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Failed to update user');
    }
  }

  async function deleteUser(userId: string, username: string) {
    if (!confirm(`Delete user @${username}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? 'Failed');
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      toast.push(`User @${username} deleted.`);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Failed to delete user');
    }
    setOpenMenu(null);
  }

  return (
    <div className="bg-card">
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]" onClick={() => setEditUser(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-foreground font-black text-lg mb-1">Edit User</h3>
            <p className="text-muted-foreground text-[13px] mb-6">@{editUser.username}</p>
            <div className="space-y-3">
              <select value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value as UserRow['role'] })} className="admin-input">
                {roles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <input type="number" min="0" max="100" value={editUser.reporterScore} onChange={(e) => setEditUser({ ...editUser, reporterScore: Number(e.target.value) })} className="admin-input" />
              <textarea
                value={(editUser.claimedAccounts ?? []).join('\n')}
                onChange={(e) => setEditUser({ ...editUser, claimedAccounts: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })}
                rows={5}
                placeholder="Claimed account ids, one per line"
                className="admin-input"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setEditUser(null)} className="flex-1 h-11 rounded-xl border border-border py-2 text-[13px] font-bold text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={saveUser} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground py-2 text-[13px] font-black hover:opacity-90 transition-opacity">Save User</button>
            </div>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Filter users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 rounded-xl border border-border bg-secondary/50 pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/30">
              <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">
                <button onClick={() => toggleSort('username')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  User <SortIcon col="username" />
                </button>
              </th>
              <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border hidden md:table-cell">
                Role
              </th>
              <th className="text-right px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">
                <button onClick={() => toggleSort('reporterScore')} className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors">
                  Score <SortIcon col="reporterScore" />
                </button>
              </th>
              <th className="text-right px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border hidden lg:table-cell">
                <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors">
                  Joined <SortIcon col="createdAt" />
                </button>
              </th>
              <th className="px-6 py-4 w-12 border-b border-border" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((user) => (
              <tr key={user._id} className="hover:bg-secondary/20 transition-colors group">
                <td className="px-6 py-4">
                  <p className="font-bold text-foreground">@{user.username}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">{user.email}</p>
                </td>
                <td className="px-6 py-4 hidden md:table-cell">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`font-mono font-black text-[15px] ${
                    user.reporterScore >= 70 ? 'text-emerald-600' : user.reporterScore >= 40 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {user.reporterScore}
                  </span>
                </td>
                <td className="px-6 py-4 text-right hidden lg:table-cell">
                  <span className="text-[12px] text-muted-foreground font-mono font-medium">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === user._id ? null : user._id)}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {openMenu === user._id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-6 top-12 z-20 w-48 rounded-xl border border-border bg-background shadow-xl overflow-hidden animate-in fade-in zoom-in duration-100">
                        <button
                          onClick={() => { setEditUser(user); setOpenMenu(null); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-foreground hover:bg-secondary transition-colors text-left"
                        >
                          <User size={14} className="text-primary" />
                          Edit user
                        </button>
                        <button
                          onClick={() => toggleRole(user._id, user.role)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-foreground hover:bg-secondary transition-colors text-left"
                        >
                          <Shield size={14} className="text-primary" />
                          {user.role === 'user' ? 'Promote to admin' : 'Demote to user'}
                        </button>
                        <div className="h-px bg-border mx-2" />
                        <button
                          onClick={() => deleteUser(user._id, user.username)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-destructive hover:bg-destructive/5 transition-colors text-left"
                        >
                          <Trash2 size={14} />
                          Delete user
                        </button>
                      </div>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground text-[13px] font-medium">
                  No users match your filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
