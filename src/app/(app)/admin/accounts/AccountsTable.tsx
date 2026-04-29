'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronUp, ChevronDown, Trash2, MoreHorizontal, CheckCircle, Edit3, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import type { AccountRecord } from '@/lib/repos/accounts';

const PLATFORM_ICONS: Record<string, string> = {
  x: '𝕏',
  instagram: '📸',
  facebook: '📘',
  youtube: '▶️',
  tiktok: '🎵',
  linkedin: '💼',
  website: '🌐',
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`font-mono text-xs font-bold ${score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
        {score}
      </span>
    </div>
  );
}

export function AccountsTable({ initialAccounts }: { initialAccounts: AccountRecord[] }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('all');
  const [sortBy, setSortBy] = useState<'score' | 'displayName' | 'followers'>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editScore, setEditScore] = useState<{ id: string; value: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const platforms = ['all', ...Array.from(new Set(initialAccounts.map((a) => a.platform)))];

  const filtered = accounts
    .filter((a) => {
      if (platform !== 'all' && a.platform !== platform) return false;
      if (!search) return true;
      return (
        a.displayName.toLowerCase().includes(search.toLowerCase()) ||
        a.username.toLowerCase().includes(search.toLowerCase())
      );
    })
    .sort((a, b) => {
      const va = sortBy === 'score' ? a.score : sortBy === 'displayName' ? a.displayName : parseInt(a.followers || '0');
      const vb = sortBy === 'score' ? b.score : sortBy === 'displayName' ? b.displayName : parseInt(b.followers || '0');
      if (typeof va === 'string' && typeof vb === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('desc'); }
  }

  function SortIcon({ col }: { col: typeof sortBy }) {
    if (sortBy !== col) return <ChevronUp size={12} className="opacity-20" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-white/60" /> : <ChevronDown size={12} className="text-white/60" />;
  }

  async function saveScore(accountId: string) {
    if (!editScore || editScore.id !== accountId) return;
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: editScore.value }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? 'Failed');
      setAccounts((prev) => prev.map((a) => (a._id === accountId ? { ...a, score: editScore.value } : a)));
      toast.push('Score updated.');
      startTransition(() => router.refresh());
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Failed to update score');
    }
    setEditScore(null);
  }

  async function deleteAccount(accountId: string, name: string) {
    if (!confirm(`Delete account "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? 'Failed');
      setAccounts((prev) => prev.filter((a) => a._id !== accountId));
      toast.push(`Account "${name}" deleted.`);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Failed to delete account');
    }
    setOpenMenu(null);
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
          <input
            type="text"
            placeholder="Search accounts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
          />
        </div>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-white/25"
        >
          {platforms.map((p) => (
            <option key={p} value={p} className="bg-[#1a1a1a]">{p === 'all' ? 'All platforms' : p}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-white/30 mb-3 font-medium">{filtered.length} account{filtered.length !== 1 ? 's' : ''}</p>

      {/* Score edit modal */}
      {editScore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditScore(null)}>
          <div className="rounded-2xl border border-white/15 bg-[#181818] p-6 w-72 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold mb-1">Override Score</h3>
            <p className="text-white/40 text-xs mb-4">Set a new trust score (0–100).</p>
            <input
              type="number"
              min={0}
              max={100}
              value={editScore.value}
              onChange={(e) => setEditScore({ ...editScore, value: Number(e.target.value) })}
              className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-white text-2xl font-mono font-bold text-center focus:outline-none focus:border-white/30 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setEditScore(null)} className="flex-1 rounded-xl border border-white/15 py-2 text-sm text-white/50 hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={() => saveScore(editScore.id)} className="flex-1 rounded-xl bg-white text-black py-2 text-sm font-bold hover:bg-white/90 transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-white/30">
                <button onClick={() => toggleSort('displayName')} className="flex items-center gap-1 hover:text-white/60 transition-colors">
                  Account <SortIcon col="displayName" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-white/30 hidden md:table-cell">Platform</th>
              <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-white/30">
                <button onClick={() => toggleSort('score')} className="flex items-center gap-1 ml-auto hover:text-white/60 transition-colors">
                  Score <SortIcon col="score" />
                </button>
              </th>
              <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-white/30 hidden lg:table-cell">
                <button onClick={() => toggleSort('followers')} className="flex items-center gap-1 ml-auto hover:text-white/60 transition-colors">
                  Followers <SortIcon col="followers" />
                </button>
              </th>
              <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-white/30 hidden sm:table-cell">Claimed</th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((account) => (
              <tr key={account._id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/account/${account._id}`} className="group flex items-start gap-2.5">
                    <div>
                      <p className="font-semibold text-white group-hover:text-white/80 transition-colors flex items-center gap-1.5">
                        {account.displayName}
                        <ExternalLink size={11} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                      </p>
                      <p className="text-xs text-white/30">@{account.username}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-sm">{PLATFORM_ICONS[account.platform] ?? '?'}</span>
                  <span className="ml-2 text-xs text-white/40 capitalize">{account.platform}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <ScoreBar score={account.score} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right hidden lg:table-cell">
                  <span className="text-xs text-white/40 font-mono">{account.followers ?? '—'}</span>
                </td>
                <td className="px-4 py-3 text-center hidden sm:table-cell">
                  {account.claimed
                    ? <CheckCircle size={14} className="text-emerald-400 mx-auto" />
                    : <span className="text-white/15 text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-3 text-right relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === account._id ? null : account._id)}
                    className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white transition-all"
                  >
                    <MoreHorizontal size={15} />
                  </button>
                  {openMenu === account._id && (
                    <div className="absolute right-3 top-10 z-50 w-48 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl overflow-hidden">
                      <button
                        onClick={() => { setEditScore({ id: account._id, value: account.score }); setOpenMenu(null); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/8 hover:text-white transition-colors text-left"
                      >
                        <Edit3 size={14} />
                        Override score
                      </button>
                      <button
                        onClick={() => deleteAccount(account._id, account.displayName)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                      >
                        <Trash2 size={14} />
                        Delete account
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-white/25 text-sm">
                  No accounts match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
