'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Shield, User, MoreHorizontal, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { AppUser } from '@/lib/repos/users';

type UserRow = AppUser;

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
      role === 'admin'
        ? 'bg-red-100 text-red-700 border border-red-200'
        : 'bg-secondary text-muted-foreground border border-border'
    }`}>
      {role === 'admin' ? <Shield size={9} /> : <User size={9} />}
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
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
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
                          onClick={() => toggleRole(user._id, user.role)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-foreground hover:bg-secondary transition-colors text-left"
                        >
                          <Shield size={14} className="text-primary" />
                          {user.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
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
