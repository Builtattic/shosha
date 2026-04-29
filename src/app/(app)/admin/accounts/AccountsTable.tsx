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
      <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`font-mono text-[11px] font-black ${score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
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
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />;
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
    <div className="bg-card">
      {/* Filters */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 rounded-xl border border-border bg-secondary/50 pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
        </div>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="h-11 rounded-xl border border-border bg-secondary/50 px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
        >
          {platforms.map((p) => (
            <option key={p} value={p}>{p === 'all' ? 'All platforms' : p}</option>
          ))}
        </select>
      </div>

      {/* Score edit modal */}
      {editScore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={() => setEditScore(null)}>
          <div className="rounded-2xl border border-border bg-background p-6 w-80 shadow-2xl animate-in zoom-in-95 duration-100" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-foreground font-black text-lg mb-1">Override Score</h3>
            <p className="text-muted-foreground text-[13px] mb-6">Manually set the trust score (0–100).</p>
            <input
              type="number"
              min={0}
              max={100}
              value={editScore.value}
              onChange={(e) => setEditScore({ ...editScore, value: Number(e.target.value) })}
              className="w-full h-20 rounded-2xl border-2 border-primary/20 bg-secondary/50 px-4 py-2 text-foreground text-4xl font-mono font-black text-center focus:outline-none focus:border-primary mb-6 transition-all"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setEditScore(null)} className="flex-1 h-11 rounded-xl border border-border py-2 text-[13px] font-bold text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={() => saveScore(editScore.id)} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground py-2 text-[13px] font-black hover:opacity-90 transition-opacity">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/30">
              <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">
                <button onClick={() => toggleSort('displayName')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  Account <SortIcon col="displayName" />
                </button>
              </th>
              <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border hidden md:table-cell">Platform</th>
              <th className="text-right px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">
                <button onClick={() => toggleSort('score')} className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors">
                  Score <SortIcon col="score" />
                </button>
              </th>
              <th className="text-right px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border hidden lg:table-cell">
                <button onClick={() => toggleSort('followers')} className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors">
                  Followers <SortIcon col="followers" />
                </button>
              </th>
              <th className="text-center px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border hidden sm:table-cell">Claimed</th>
              <th className="px-6 py-4 w-12 border-b border-border" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((account) => (
              <tr key={account._id} className="hover:bg-secondary/20 transition-colors group">
                <td className="px-6 py-4">
                  <Link href={`/account/${account._id}`} className="group inline-block">
                    <p className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                      {account.displayName}
                      <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-xs text-muted-foreground">@{account.username}</p>
                  </Link>
                </td>
                <td className="px-6 py-4 hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{PLATFORM_ICONS[account.platform] ?? '?'}</span>
                    <span className="text-[12px] font-bold text-muted-foreground capitalize">{account.platform}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end">
                    <ScoreBar score={account.score} />
                  </div>
                </td>
                <td className="px-6 py-4 text-right hidden lg:table-cell">
                  <span className="text-[12px] text-muted-foreground font-mono font-bold">{account.followers ?? '—'}</span>
                </td>
                <td className="px-6 py-4 text-center hidden sm:table-cell">
                  {account.claimed
                    ? <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
                        <CheckCircle size={14} />
                      </div>
                    : <span className="text-muted-foreground/30 text-xs">—</span>
                  }
                </td>
                <td className="px-6 py-4 text-right relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === account._id ? null : account._id)}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {openMenu === account._id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-6 top-12 z-20 w-48 rounded-xl border border-border bg-background shadow-xl overflow-hidden animate-in fade-in zoom-in duration-100">
                        <button
                          onClick={() => { setEditScore({ id: account._id, value: account.score }); setOpenMenu(null); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-foreground hover:bg-secondary transition-colors text-left"
                        >
                          <Edit3 size={14} className="text-primary" />
                          Override score
                        </button>
                        <div className="h-px bg-border mx-2" />
                        <button
                          onClick={() => deleteAccount(account._id, account.displayName)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-destructive hover:bg-destructive/5 transition-colors text-left"
                        >
                          <Trash2 size={14} />
                          Delete account
                        </button>
                      </div>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground text-[13px] font-medium">
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
