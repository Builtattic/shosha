'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  MoreHorizontal, 
  CheckCircle, 
  Edit3, 
  ExternalLink,
  Filter,
  Users,
  ShieldCheck,
  Globe,
  AlertTriangle,
  X,
  Plus,
  Camera,
  Upload,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import type { AccountRecord } from '@/lib/repos/accounts';
import { BASE_SCORE } from '@/lib/scoring';
import { motion, AnimatePresence } from 'framer-motion';
import { useRef } from 'react';

const PLATFORMS = ['x', 'instagram', 'facebook', 'youtube', 'tiktok', 'linkedin', 'reddit', 'snapchat', 'website'];

const PLATFORM_ICONS: Record<string, any> = {
  x: <span className="font-serif italic font-black">X</span>,
  instagram: <span className="text-pink-500">📸</span>,
  facebook: <span className="text-blue-600">📘</span>,
  youtube: <span className="text-red-600">▶️</span>,
  tiktok: <span className="text-foreground">🎵</span>,
  linkedin: <span className="text-blue-700">💼</span>,
  website: <Globe size={14} />,
};

function ScoreIndicator({ score }: { score: number }) {
  const color = score >= BASE_SCORE ? 'text-emerald-500' : score >= 0 ? 'text-amber-500' : 'text-red-500';
  const bgColor = score >= BASE_SCORE ? 'bg-emerald-500/10' : score >= 0 ? 'bg-amber-500/10' : 'bg-red-500/10';
  const borderColor = score >= BASE_SCORE ? 'border-emerald-500/20' : score >= 0 ? 'border-amber-500/20' : 'border-red-500/20';

  return (
    <div className={`flex items-center gap-3 ${bgColor} ${borderColor} border px-3 py-1.5 rounded-full`}>
      <div className="flex flex-col">
        <span className={`font-mono text-sm font-black leading-none ${color}`}>
          {score}
        </span>
      </div>
      <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(5, Math.min(100, (score / (BASE_SCORE * 1.5)) * 100))}%` }}
          className={`h-full rounded-full ${score >= BASE_SCORE ? 'bg-emerald-500' : 'bg-amber-500'}`}
        />
      </div>
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
  const [editAccount, setEditAccount] = useState<AccountRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newAccount, setNewAccount] = useState<Partial<AccountRecord>>({
    platform: 'x',
    username: '',
    displayName: '',
    bio: '',
    avatarUrl: '',
    followers: '0',
    verified: false,
    profileKind: 'standard',
    claimable: true,
    credibility: 50,
    region: '',
    role: '',
    quote: '',
    enrichmentStatus: 'none',
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);

  const platforms = useMemo(() => ['all', ...Array.from(new Set(initialAccounts.map((a) => a.platform)))], [initialAccounts]);

  const filtered = useMemo(() => {
    return accounts
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
  }, [accounts, platform, search, sortBy, sortDir]);

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('desc'); }
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

  async function saveAccount() {
    if (!editAccount) return;
    try {
      const res = await fetch(`/api/admin/accounts/${editAccount._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: editAccount.displayName,
          username: editAccount.username,
          platform: editAccount.platform,
          bio: editAccount.bio,
          avatarUrl: editAccount.avatarUrl,
          followers: editAccount.followers,
          verified: editAccount.verified,
          claimed: editAccount.claimed,
          claimedBy: editAccount.claimedBy,
          score: Number(editAccount.score),
          credibility: Number(editAccount.credibility),
          region: editAccount.region,
          role: editAccount.role,
          quote: editAccount.quote,
          enrichmentStatus: editAccount.enrichmentStatus,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? 'Failed');
      setAccounts((prev) => prev.map((a) => (a._id === editAccount._id ? data.data : a)));
      toast.push('Account dossier updated.');
      setEditAccount(null);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Failed to update account');
    }
  }

  async function handleCreateAccount() {
    if (!newAccount.username || !newAccount.platform) {
      toast.push('Username and Platform are required');
      return;
    }
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? 'Failed to create account');
      
      setAccounts((prev) => [data.data, ...prev]);
      toast.push(`Dossier for ${data.data.displayName} created.`);
      setIsCreating(false);
      setNewAccount({
        platform: 'x',
        username: '',
        displayName: '',
        bio: '',
        avatarUrl: '',
        followers: '0',
        verified: false,
        profileKind: 'standard',
        claimable: true,
        credibility: 50,
        region: '',
        role: '',
        quote: '',
        enrichmentStatus: 'none',
      });
      startTransition(() => router.refresh());
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Failed to create account');
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingAvatar(true);
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.ok && data.data?.url) {
        if (isEdit) {
          setEditAccount((prev) => prev ? { ...prev, avatarUrl: data.data.url } : null);
        } else {
          setNewAccount((prev) => ({ ...prev, avatarUrl: data.data.url }));
        }
        toast.push('Avatar uploaded successfully.');
      } else {
        throw new Error(data.error?.message || 'Failed to upload photo');
      }
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      if (editAvatarInputRef.current) editAvatarInputRef.current.value = '';
    }
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
    <div className="relative">
      {/* Filtering Header */}
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search dossier by name or handle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 bg-black/20 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-muted-foreground/50"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full h-12 bg-black/20 border border-white/10 rounded-2xl pl-10 pr-4 text-sm font-bold appearance-none focus:outline-none focus:border-primary/40 transition-all"
            >
              {platforms.map((p) => (
                <option key={p} value={p} className="bg-background">{p === 'all' ? 'All Platforms' : p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={() => { setSearch(''); setPlatform('all'); }}
            className="h-12 w-12 flex items-center justify-center bg-black/20 border border-white/10 rounded-2xl text-muted-foreground hover:text-foreground transition-all"
          >
            <X size={16} />
          </button>

          <button 
            onClick={() => setIsCreating(true)}
            className="h-12 px-6 flex items-center gap-2 bg-primary text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all whitespace-nowrap"
          >
            <Plus size={16} />
            Create Dossier
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-8 py-5">
                <button onClick={() => toggleSort('displayName')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                  Dossier
                  {sortBy === 'displayName' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </button>
              </th>
              <th className="text-left px-8 py-5 hidden lg:table-cell">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Network</span>
              </th>
              <th className="text-right px-8 py-5">
                <button onClick={() => toggleSort('score')} className="flex items-center gap-2 ml-auto text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                  Shosha Score
                  {sortBy === 'score' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </button>
              </th>
              <th className="text-right px-8 py-5 hidden md:table-cell">
                <button onClick={() => toggleSort('followers')} className="flex items-center gap-2 ml-auto text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                  Reach
                  {sortBy === 'followers' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </button>
              </th>
              <th className="text-center px-8 py-5 hidden sm:table-cell">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</span>
              </th>
              <th className="px-8 py-5 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <AnimatePresence mode="popLayout">
              {filtered.map((account) => (
                <motion.tr 
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  key={account._id} 
                  className="group hover:bg-primary/[0.02] transition-colors"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-secondary/50 border border-white/5 overflow-hidden flex-shrink-0">
                        {account.avatarUrl ? (
                          <img src={account.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
                            <Users size={16} />
                          </div>
                        )}
                      </div>
                      <div>
                        <Link href={`/account/${account._id}`} className="block group/link">
                          <span className="text-sm font-black text-foreground group-hover/link:text-primary transition-colors flex items-center gap-1.5">
                            {account.displayName}
                            <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </span>
                        </Link>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-8 py-6 hidden lg:table-cell">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-tighter text-muted-foreground/80">
                      <span className="h-6 w-6 rounded-lg bg-black/20 flex items-center justify-center border border-white/5">
                        {PLATFORM_ICONS[account.platform] || <Globe size={10} />}
                      </span>
                      {account.platform}
                    </div>
                  </td>

                  <td className="px-8 py-6">
                    <div className="flex justify-end">
                      <ScoreIndicator score={account.score} />
                    </div>
                  </td>

                  <td className="px-8 py-6 text-right hidden md:table-cell">
                    <span className="text-xs font-mono font-black text-foreground opacity-80">
                      {account.followers ? parseInt(account.followers).toLocaleString() : '—'}
                    </span>
                  </td>

                  <td className="px-8 py-6 hidden sm:table-cell">
                    <div className="flex justify-center">
                      {account.claimed ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">
                          <CheckCircle size={10} />
                          Claimed
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-muted-foreground/50 border border-white/5 text-[10px] font-black uppercase tracking-widest">
                          Unclaimed
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-8 py-6 text-right relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === account._id ? null : account._id)}
                      className={`p-2 rounded-xl transition-all ${openMenu === account._id ? 'bg-primary text-primary-foreground' : 'hover:bg-white/5 text-muted-foreground'}`}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    
                    <AnimatePresence>
                      {openMenu === account._id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-8 top-full mt-2 z-50 w-56 rounded-2xl border border-white/10 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden"
                          >
                            <div className="p-2 space-y-1">
                              <button
                                onClick={() => { setEditAccount(account); setOpenMenu(null); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-foreground hover:bg-primary hover:text-primary-foreground rounded-xl transition-all text-left"
                              >
                                <Edit3 size={14} />
                                Edit Dossier
                              </button>
                              <button
                                onClick={() => { setEditScore({ id: account._id, value: account.score }); setOpenMenu(null); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-foreground hover:bg-primary hover:text-primary-foreground rounded-xl transition-all text-left"
                              >
                                <ShieldCheck size={14} />
                                Override Score
                              </button>
                              <div className="h-px bg-white/5 mx-2 my-1" />
                              <button
                                onClick={() => deleteAccount(account._id, account.displayName)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all text-left"
                              >
                                <Trash2 size={14} />
                                Purge Record
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-8 py-32 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-20">
                    <Search size={48} strokeWidth={1} />
                    <p className="text-sm font-bold uppercase tracking-[0.2em]">No records found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Overlays / Modals */}
      <AnimatePresence>
        {editScore && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
              onClick={() => setEditScore(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-[2.5rem] border border-white/10 bg-card p-10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-8">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-2xl font-serif font-black text-foreground mb-2">Score Override</h3>
              <p className="text-sm text-muted-foreground font-medium mb-10">Manually adjust the authenticity metrics for this dossier. This bypasses automated scoring logic.</p>
              
              <div className="relative mb-10">
                <input
                  type="number"
                  value={editScore.value}
                  onChange={(e) => setEditScore({ ...editScore, value: Number(e.target.value) })}
                  className="w-full h-32 rounded-3xl border-2 border-primary/20 bg-black/20 px-6 text-foreground text-7xl font-mono font-black text-center focus:outline-none focus:border-primary transition-all"
                  autoFocus
                />
                <div className="absolute top-4 right-6 text-[10px] font-black uppercase tracking-widest text-primary/40">Point Value</div>
              </div>
              
              <div className="flex gap-4">
                <button onClick={() => setEditScore(null)} className="flex-1 h-14 rounded-2xl border border-white/10 text-sm font-black hover:bg-white/5 transition-colors">Discard</button>
                <button onClick={() => saveScore(editScore.id)} className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground text-sm font-black hover:opacity-90 transition-opacity">Deploy Change</button>
              </div>
            </motion.div>
          </div>
        )}

        {editAccount && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
              onClick={() => setEditAccount(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border border-white/10 bg-card p-10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Edit3 size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-black text-foreground leading-tight">Edit Dossier</h3>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mt-1">Manual Override Protocol</p>
                  </div>
                </div>
                <button onClick={() => setEditAccount(null)} className="h-10 w-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Display Name</label>
                  <input value={editAccount.displayName} onChange={(e) => setEditAccount({ ...editAccount, displayName: e.target.value })} className="admin-input h-14" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Handle / Username</label>
                  <input value={editAccount.username} onChange={(e) => setEditAccount({ ...editAccount, username: e.target.value })} className="admin-input h-14" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reach (Followers)</label>
                  <input value={editAccount.followers || ''} onChange={(e) => setEditAccount({ ...editAccount, followers: e.target.value })} className="admin-input h-14" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Base Score</label>
                  <input type="number" value={editAccount.score} onChange={(e) => setEditAccount({ ...editAccount, score: Number(e.target.value) })} className="admin-input h-14" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Avatar Resource URL</label>
                  <div className="flex gap-2">
                    <input value={editAccount.avatarUrl || ''} onChange={(e) => setEditAccount({ ...editAccount, avatarUrl: e.target.value })} className="admin-input h-14 flex-1" />
                    <button 
                      onClick={() => editAvatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      {uploadingAvatar ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                    </button>
                    <input type="file" ref={editAvatarInputRef} onChange={(e) => handleAvatarUpload(e, true)} accept="image/*" className="hidden" />
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Profile Biography</label>
                  <textarea value={editAccount.bio || ''} onChange={(e) => setEditAccount({ ...editAccount, bio: e.target.value })} className="admin-input min-h-[100px] py-4" />
                </div>
                
                <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/[0.08] transition-colors">
                    <input type="checkbox" checked={editAccount.verified} onChange={(e) => setEditAccount({ ...editAccount, verified: e.target.checked })} className="h-5 w-5 rounded-lg border-white/10 bg-black/20 text-primary focus:ring-primary/20 transition-all" />
                    <span className="text-xs font-black uppercase tracking-widest">Verified Status</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/[0.08] transition-colors">
                    <input type="checkbox" checked={editAccount.claimed} onChange={(e) => setEditAccount({ ...editAccount, claimed: e.target.checked, claimedBy: e.target.checked ? editAccount.claimedBy : null })} className="h-5 w-5 rounded-lg border-white/10 bg-black/20 text-primary focus:ring-primary/20 transition-all" />
                    <span className="text-xs font-black uppercase tracking-widest">Claimed Status</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Credibility Score (0-100)</label>
                  <input type="number" min="0" max="100" value={editAccount.credibility || 0} onChange={(e) => setEditAccount({ ...editAccount, credibility: Number(e.target.value) })} className="admin-input h-14" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Enrichment Status</label>
                  <select value={editAccount.enrichmentStatus || 'none'} onChange={(e) => setEditAccount({ ...editAccount, enrichmentStatus: e.target.value as any })} className="admin-input h-14 bg-black/20 w-full">
                    <option value="none" className="bg-background">NONE</option>
                    <option value="pending" className="bg-background">PENDING</option>
                    <option value="reviewed" className="bg-background">REVIEWED</option>
                    <option value="stale" className="bg-background">STALE</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Geographic Region</label>
                  <input placeholder="e.g. North America" value={editAccount.region || ''} onChange={(e) => setEditAccount({ ...editAccount, region: e.target.value })} className="admin-input h-14" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Professional Role</label>
                  <input placeholder="e.g. Philanthropist" value={editAccount.role || ''} onChange={(e) => setEditAccount({ ...editAccount, role: e.target.value })} className="admin-input h-14" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Primary Quote</label>
                  <input placeholder="A defining statement..." value={editAccount.quote || ''} onChange={(e) => setEditAccount({ ...editAccount, quote: e.target.value })} className="admin-input h-14" />
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button onClick={() => setEditAccount(null)} className="flex-1 h-14 rounded-2xl border border-white/10 text-sm font-black hover:bg-white/5 transition-colors">Cancel</button>
                <button onClick={saveAccount} className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground text-sm font-black hover:opacity-90 transition-opacity">Commit Changes</button>
              </div>
            </motion.div>
          </div>
        )}

        {isCreating && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
              onClick={() => setIsCreating(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border border-white/10 bg-card p-10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Plus size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-black text-foreground leading-tight">Create New Dossier</h3>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mt-1">Registry Enrollment Protocol</p>
                  </div>
                </div>
                <button onClick={() => setIsCreating(false)} className="h-10 w-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Platform / Network</label>
                  <select 
                    value={newAccount.platform} 
                    onChange={(e) => setNewAccount({ ...newAccount, platform: e.target.value as any })} 
                    className="admin-input h-14 bg-black/20 w-full"
                  >
                    {PLATFORMS.map(p => (
                      <option key={p} value={p} className="bg-background">{p.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Handle / Username</label>
                  <input 
                    placeholder="e.g. elonmusk"
                    value={newAccount.username} 
                    onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value, displayName: newAccount.displayName || e.target.value })} 
                    className="admin-input h-14" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Display Name</label>
                  <input 
                    placeholder="e.g. Elon Musk"
                    value={newAccount.displayName} 
                    onChange={(e) => setNewAccount({ ...newAccount, displayName: e.target.value })} 
                    className="admin-input h-14" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reach (Followers)</label>
                  <input 
                    placeholder="0"
                    value={newAccount.followers || ''} 
                    onChange={(e) => setNewAccount({ ...newAccount, followers: e.target.value })} 
                    className="admin-input h-14" 
                  />
                </div>
                
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Avatar Resource URL</label>
                  <div className="flex gap-2">
                    <input 
                      placeholder="https://..."
                      value={newAccount.avatarUrl || ''} 
                      onChange={(e) => setNewAccount({ ...newAccount, avatarUrl: e.target.value })} 
                      className="admin-input h-14 flex-1" 
                    />
                    <button 
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      {uploadingAvatar ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                    </button>
                    <input type="file" ref={avatarInputRef} onChange={(e) => handleAvatarUpload(e, false)} accept="image/*" className="hidden" />
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Profile Biography</label>
                  <textarea 
                    placeholder="Tell the truth, modernize the noise..."
                    value={newAccount.bio || ''} 
                    onChange={(e) => setNewAccount({ ...newAccount, bio: e.target.value })} 
                    className="admin-input min-h-[100px] py-4" 
                  />
                </div>
                
                <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/[0.08] transition-colors">
                    <input type="checkbox" checked={newAccount.verified} onChange={(e) => setNewAccount({ ...newAccount, verified: e.target.checked })} className="h-5 w-5 rounded-lg border-white/10 bg-black/20 text-primary focus:ring-primary/20 transition-all" />
                    <span className="text-xs font-black uppercase tracking-widest">Verified Status</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/[0.08] transition-colors">
                    <input type="checkbox" checked={newAccount.claimable} onChange={(e) => setNewAccount({ ...newAccount, claimable: e.target.checked })} className="h-5 w-5 rounded-lg border-white/10 bg-black/20 text-primary focus:ring-primary/20 transition-all" />
                    <span className="text-xs font-black uppercase tracking-widest">Claimable</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Credibility Score (0-100)</label>
                  <input type="number" min="0" max="100" value={newAccount.credibility} onChange={(e) => setNewAccount({ ...newAccount, credibility: Number(e.target.value) })} className="admin-input h-14" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Enrichment Status</label>
                  <select value={newAccount.enrichmentStatus} onChange={(e) => setNewAccount({ ...newAccount, enrichmentStatus: e.target.value as any })} className="admin-input h-14 bg-black/20 w-full">
                    <option value="none" className="bg-background">NONE</option>
                    <option value="pending" className="bg-background">PENDING</option>
                    <option value="reviewed" className="bg-background">REVIEWED</option>
                    <option value="stale" className="bg-background">STALE</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Geographic Region</label>
                  <input placeholder="e.g. North America" value={newAccount.region} onChange={(e) => setNewAccount({ ...newAccount, region: e.target.value })} className="admin-input h-14" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Professional Role</label>
                  <input placeholder="e.g. Philanthropist" value={newAccount.role} onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value })} className="admin-input h-14" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Primary Quote</label>
                  <input placeholder="A defining statement for this profile..." value={newAccount.quote} onChange={(e) => setNewAccount({ ...newAccount, quote: e.target.value })} className="admin-input h-14" />
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button onClick={() => setIsCreating(false)} className="flex-1 h-14 rounded-2xl border border-white/10 text-sm font-black hover:bg-white/5 transition-colors">Abort</button>
                <button onClick={handleCreateAccount} className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground text-sm font-black hover:opacity-90 transition-opacity">Deploy Dossier</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
