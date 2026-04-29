'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Shield, User, MoreHorizontal, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { AppUser } from '@/lib/repos/users';

type UserRow = AppUser;

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
      role === 'admin'
        ? 'bg-red-500/15 text-red-400 border border-red-500/20'
        : 'bg-white/8 text-white/40 border border-white/10'
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
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-white/60" /> : <ChevronDown size={12} className="text-white/60" />;
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
    <div>
      {/* Search bar */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by username or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
        />
      </div>

      {/* Count */}
      <p className="text-xs text-white/30 mb-3 font-medium">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-white/30">
                <button onClick={() => toggleSort('username')} className="flex items-center gap-1 hover:text-white/60 transition-colors">
                  User <SortIcon col="username" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-white/30 hidden md:table-cell">
                Role
              </th>
              <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-white/30">
                <button onClick={() => toggleSort('reporterScore')} className="flex items-center gap-1 ml-auto hover:text-white/60 transition-colors">
                  Rep <SortIcon col="reporterScore" />
                </button>
              </th>
              <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-white/30 hidden lg:table-cell">
                <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 ml-auto hover:text-white/60 transition-colors">
                  Joined <SortIcon col="createdAt" />
                </button>
              </th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user._id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-semibold text-white">@{user.username}</p>
                  <p className="text-xs text-white/30 truncate max-w-[180px]">{user.email}</p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-mono font-bold text-sm ${
                    user.reporterScore >= 70 ? 'text-emerald-400' : user.reporterScore >= 40 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {user.reporterScore}
                  </span>
                </td>
                <td className="px-4 py-3 text-right hidden lg:table-cell">
                  <span className="text-xs text-white/30 font-mono">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === user._id ? null : user._id)}
                    className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white transition-all"
                  >
                    <MoreHorizontal size={15} />
                  </button>
                  {openMenu === user._id && (
                    <div className="absolute right-3 top-10 z-50 w-48 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl overflow-hidden">
                      <button
                        onClick={() => toggleRole(user._id, user.role)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/8 hover:text-white transition-colors text-left"
                      >
                        <Shield size={14} />
                        {user.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                      </button>
                      <button
                        onClick={() => deleteUser(user._id, user.username)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                      >
                        <Trash2 size={14} />
                        Delete user
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-white/25 text-sm">
                  No users match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
