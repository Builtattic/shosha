'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  FilePlus, 
  UserCheck, 
  Plus, 
  Sparkles,
  Search,
  Globe,
  User,
  Shield,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { Platform } from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { CIRCUMSTANCES_LABELS, SHEET_SCORING_INDEX } from '@/lib/scoring';

type AccountOption = { _id: string; displayName: string; username: string; platform: Platform };
type UserOption = { _id: string; username: string; email: string };
const platforms: Platform[] = ['x', 'instagram', 'facebook', 'youtube', 'tiktok', 'linkedin', 'reddit', 'snapchat', 'website'];

type TabType = 'claim' | 'account' | 'ownership';

export function AdminCreatePanel({ initialAccounts, users }: { initialAccounts: AccountOption[]; users: UserOption[] }) {
  const firstPositiveRow = SHEET_SCORING_INDEX.find((row) => row.type === 'positive') ?? SHEET_SCORING_INDEX[0];
  const [activeTab, setActiveTab] = useState<TabType>('claim');
  const [accounts, setAccounts] = useState(initialAccounts);
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const toast = useToast();
  
  const [accountForm, setAccountForm] = useState({ 
    platform: 'x' as Platform, 
    username: '', 
    displayName: '', 
    bio: '', 
    avatarUrl: '', 
    followers: '0', 
    verified: false 
  });
  
  const [reportForm, setReportForm] = useState({ 
    accountId: initialAccounts[0]?._id ?? '', 
    type: 'positive' as 'positive' | 'negative',
    category: firstPositiveRow.category,
    deed: firstPositiveRow.deed,
    baseScore: firstPositiveRow.baseScore,
    repetitionPattern: '1',
    intent: '1',
    circumstances: '1',
    description: '', 
    feelings: 'Published by the Shosha admin team.', 
    mediaUrl: '', 
    mediaType: 'image', 
    status: 'approved', 
    visibility: 'public', 
    pinned: false, 
    featured: false 
  });
  
  const [ownership, setOwnership] = useState({ 
    accountId: initialAccounts[0]?._id ?? '', 
    userId: users[0]?._id ?? '' 
  });
  const typedRows = useMemo(
    () => SHEET_SCORING_INDEX.filter((row) => row.type === reportForm.type),
    [reportForm.type]
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set(typedRows.map((row) => row.category))),
    [typedRows]
  );
  const deedOptions = useMemo(
    () => typedRows.filter((row) => row.category === reportForm.category),
    [reportForm.category, typedRows]
  );
  const selectedScoringRow = typedRows.find((row) => row.category === reportForm.category && row.deed === reportForm.deed) ?? typedRows[0];

  async function submit(action: () => Promise<void>) {
    if (submitting) return;
    setSubmitting(true);
    try { 
      await action(); 
    } catch (error) { 
      toast.push(error instanceof Error ? error.message : 'Action failed.'); 
    } finally {
      setSubmitting(false);
    }
  }

  async function createAccount() {
    const res = await fetch('/api/admin/accounts', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        ...accountForm, 
        displayName: accountForm.displayName || undefined, 
        bio: accountForm.bio || undefined, 
        avatarUrl: accountForm.avatarUrl || undefined 
      }) 
    });
    const payload = await res.json();
    if (!payload.ok) throw new Error(payload.error?.message ?? 'Account create failed.');
    setAccounts((prev) => prev.some((a) => a._id === payload.data._id) ? prev : [payload.data, ...prev]);
    setReportForm((form) => ({ ...form, accountId: payload.data._id }));
    toast.push('Account created successfully.');
    setAccountForm({ platform: 'x', username: '', displayName: '', bio: '', avatarUrl: '', followers: '0', verified: false });
    startTransition(() => router.refresh());
  }

  async function createReport() {
    if (!selectedScoringRow) throw new Error('Choose a valid workbook deed first.');
    const res = await fetch('/api/admin/reports', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        ...reportForm, 
        media: { url: reportForm.mediaUrl, type: reportForm.mediaType, width: 0, height: 0, bytes: 0 }, 
        category: selectedScoringRow.category,
        deed: selectedScoringRow.deed,
        baseScore: selectedScoringRow.baseScore,
        repetitionPattern: reportForm.repetitionPattern,
        intent: reportForm.intent,
        circumstances: reportForm.circumstances
      }) 
    });
    const payload = await res.json();
    if (!payload.ok) throw new Error(payload.error?.message ?? 'Claim create failed.');
    toast.push('Feed claim published.');
    setReportForm((form) => ({ ...form, description: '', mediaUrl: '', pinned: false, featured: false }));
    startTransition(() => router.refresh());
  }

  async function assignOwnership() {
    const res = await fetch('/api/admin/ownership', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(ownership) 
    });
    const payload = await res.json();
    if (!payload.ok) throw new Error(payload.error?.message ?? 'Ownership assignment failed.');
    toast.push('Ownership assigned successfully.');
    startTransition(() => router.refresh());
  }

  const tabs = [
    { id: 'claim', label: 'Feed Claim', icon: FilePlus, color: 'text-primary' },
    { id: 'account', label: 'Create Account', icon: Plus, color: 'text-emerald-500' },
    { id: 'ownership', label: 'Ownership', icon: UserCheck, color: 'text-blue-500' },
  ];
  const busy = pending || submitting;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Tab Switcher */}
      <div className="flex p-1.5 bg-secondary/50 backdrop-blur-sm rounded-2xl border border-white/5 mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "relative flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-xl",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-background shadow-lg rounded-xl border border-white/5"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon size={14} className={cn("relative z-10", isActive ? tab.color : "")} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="relative overflow-hidden rounded-[32px] border border-white/5 bg-card/30 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-blue-500/50 to-primary/50" />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-8 md:p-12"
          >
            {activeTab === 'claim' && (
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-foreground">Publish Tribunal Claim</h3>
                    <p className="text-sm text-muted-foreground font-medium">Create a direct feed entry for a tracked account.</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Target Dossier</label>
                    <select 
                      value={reportForm.accountId} 
                      onChange={(e) => setReportForm({ ...reportForm, accountId: e.target.value })} 
                      className="admin-input h-14 bg-secondary/30 border-white/5"
                    >
                      {accounts.map((a) => (
                        <option key={a._id} value={a._id}>{a.displayName} ({a.username}) — {a.platform}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Claim Direction</label>
                      <select 
                        value={reportForm.type} 
                        onChange={(e) => {
                          const type = e.target.value as 'positive' | 'negative';
                          const first = SHEET_SCORING_INDEX.find((row) => row.type === type) ?? firstPositiveRow;
                          setReportForm({
                            ...reportForm,
                            type,
                            category: first.category,
                            deed: first.deed,
                            baseScore: first.baseScore
                          });
                        }} 
                        className="admin-input h-14 bg-secondary/30 border-white/5"
                      >
                        <option value="positive">Positive Impact</option>
                        <option value="negative">Negative Impact</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Workbook Category</label>
                      <select
                        value={reportForm.category}
                        onChange={(e) => {
                          const category = e.target.value;
                          const first = typedRows.find((row) => row.category === category) ?? typedRows[0];
                          setReportForm({
                            ...reportForm,
                            category,
                            deed: first?.deed ?? '',
                            baseScore: first?.baseScore ?? 0
                          });
                        }}
                        className="admin-input h-14 bg-secondary/30 border-white/5"
                      >
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Workbook Deed</label>
                      <select
                        value={reportForm.deed}
                        onChange={(e) => {
                          const deed = e.target.value;
                          const row = deedOptions.find((item) => item.deed === deed) ?? deedOptions[0];
                          setReportForm({
                            ...reportForm,
                            deed,
                            baseScore: row?.baseScore ?? 0
                          });
                        }}
                        className="admin-input h-14 bg-secondary/30 border-white/5"
                      >
                        {deedOptions.map((row) => (
                          <option key={`${row.category}:${row.deed}`} value={row.deed}>{row.deed}</option>
                        ))}
                      </select>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-secondary/30 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Base Score</p>
                      <p className={cn('mt-1 text-2xl font-black', reportForm.baseScore < 0 ? 'text-destructive' : 'text-primary')}>
                        {reportForm.baseScore > 0 ? '+' : ''}{reportForm.baseScore}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Repetition Pattern (RP)</label>
                      <select
                        value={reportForm.repetitionPattern}
                        onChange={(e) => setReportForm({ ...reportForm, repetitionPattern: e.target.value })}
                        className="admin-input h-14 bg-secondary/30 border-white/5"
                      >
                        <option value="0.5">No Clear Pattern (0.5)</option>
                        <option value="1">Balanced (1)</option>
                        <option value="1.5">Mixed Signals (1.5)</option>
                        <option value="2">Leaning Off (2)</option>
                        <option value="2.5">Pattern Forming (2.5)</option>
                        <option value="3">Consistent Pattern (3)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Intent (IN)</label>
                      <select
                        value={reportForm.intent}
                        onChange={(e) => setReportForm({ ...reportForm, intent: e.target.value })}
                        className="admin-input h-14 bg-secondary/30 border-white/5"
                      >
                        <option value="0.5">Did not mean to (0.5)</option>
                        <option value="1">Not Aware (1)</option>
                        <option value="1.5">Not Careful (1.5)</option>
                        <option value="2">Meant to (2)</option>
                        <option value="2.5">Thought Through (2.5)</option>
                        <option value="3">Fully Planned (3)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Circumstances (C)</label>
                      <select
                        value={reportForm.circumstances}
                        onChange={(e) => setReportForm({ ...reportForm, circumstances: e.target.value })}
                        className="admin-input h-14 bg-secondary/30 border-white/5"
                      >
                        {Object.entries(CIRCUMSTANCES_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label} ({value})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Detailed Description</label>
                    <textarea 
                      value={reportForm.description} 
                      onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })} 
                      placeholder="What is the context of this claim?" 
                      rows={4} 
                      className="admin-input min-h-32 py-4 bg-secondary/30 border-white/5" 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Evidence Media URL</label>
                      <input 
                        value={reportForm.mediaUrl} 
                        onChange={(e) => setReportForm({ ...reportForm, mediaUrl: e.target.value })} 
                        placeholder="https://..." 
                        className="admin-input h-14 bg-secondary/30 border-white/5" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Media Type</label>
                      <select
                        value={reportForm.mediaType}
                        onChange={(e) => setReportForm({ ...reportForm, mediaType: e.target.value as 'image' | 'video' })}
                        className="admin-input h-14 bg-secondary/30 border-white/5"
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="admin-check group cursor-pointer hover:bg-secondary/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={reportForm.pinned} 
                        onChange={(e) => setReportForm({ ...reportForm, pinned: e.target.checked })} 
                        className="h-4 w-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary"
                      /> 
                      <span className="flex-1 group-hover:text-foreground transition-colors">Pin to Top of Dossier</span>
                    </label>
                    <label className="admin-check group cursor-pointer hover:bg-secondary/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={reportForm.featured} 
                        onChange={(e) => setReportForm({ ...reportForm, featured: e.target.checked })} 
                        className="h-4 w-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary"
                      /> 
                      <span className="flex-1 group-hover:text-foreground transition-colors">Feature on Main Feed</span>
                    </label>
                  </div>

                  <button 
                    disabled={busy || !reportForm.accountId || !reportForm.description || !reportForm.mediaUrl || !selectedScoringRow} 
                    onClick={() => submit(createReport)} 
                    className="group flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-primary text-sm font-black uppercase tracking-[0.2em] text-primary-foreground shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all active:scale-95 disabled:opacity-50"
                  >
                    {busy ? "Processing..." : "Publish Claim"} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Globe size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-foreground">Create Global Dossier</h3>
                    <p className="text-sm text-muted-foreground font-medium">Add a new social media profile to the platform tracking system.</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Platform</label>
                      <select 
                        value={accountForm.platform} 
                        onChange={(e) => setAccountForm({ ...accountForm, platform: e.target.value as Platform })} 
                        className="admin-input h-14 bg-secondary/30 border-white/5"
                      >
                        {platforms.map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Handle / Username</label>
                      <input 
                        value={accountForm.username} 
                        onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })} 
                        placeholder="e.g. elonmusk" 
                        className="admin-input h-14 bg-secondary/30 border-white/5" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Display Name</label>
                    <input 
                      value={accountForm.displayName} 
                      onChange={(e) => setAccountForm({ ...accountForm, displayName: e.target.value })} 
                      placeholder="The public name" 
                      className="admin-input h-14 bg-secondary/30 border-white/5" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Avatar URL</label>
                    <input 
                      value={accountForm.avatarUrl} 
                      onChange={(e) => setAccountForm({ ...accountForm, avatarUrl: e.target.value })} 
                      placeholder="Direct image link" 
                      className="admin-input h-14 bg-secondary/30 border-white/5" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Profile Bio</label>
                    <textarea 
                      value={accountForm.bio} 
                      onChange={(e) => setAccountForm({ ...accountForm, bio: e.target.value })} 
                      placeholder="Short biography..." 
                      rows={3} 
                      className="admin-input min-h-24 py-4 bg-secondary/30 border-white/5" 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Followers (Approx)</label>
                      <input 
                        value={accountForm.followers} 
                        onChange={(e) => setAccountForm({ ...accountForm, followers: e.target.value })} 
                        placeholder="0" 
                        className="admin-input h-14 bg-secondary/30 border-white/5" 
                      />
                    </div>
                    <label className="admin-check h-14 self-end group cursor-pointer hover:bg-secondary/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={accountForm.verified} 
                        onChange={(e) => setAccountForm({ ...accountForm, verified: e.target.checked })} 
                        className="h-4 w-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500"
                      /> 
                      <span className="flex-1 group-hover:text-foreground transition-colors">Verified Badge</span>
                    </label>
                  </div>

                  <button 
                    disabled={busy} 
                    onClick={() => submit(createAccount)} 
                    className="group flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 text-sm font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-emerald-500/20 hover:scale-[1.01] transition-all active:scale-95"
                  >
                    {busy ? "Registering..." : "Create Account"} <Plus size={18} />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'ownership' && (
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <UserCheck size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-foreground">Assign Ownership</h3>
                    <p className="text-sm text-muted-foreground font-medium">Connect a Shosha user to a verified social account.</p>
                  </div>
                </div>

                <div className="grid gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Social Account</label>
                      <select 
                        value={ownership.accountId} 
                        onChange={(e) => setOwnership({ ...ownership, accountId: e.target.value })} 
                        className="admin-input h-16 bg-secondary/30 border-white/5"
                      >
                        {accounts.map((a) => (
                          <option key={a._id} value={a._id}>{a.displayName} ({a.username}) — {a.platform.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-center py-2 opacity-50">
                      <ArrowRight className="rotate-90 md:rotate-0" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Platform User</label>
                      <select 
                        value={ownership.userId} 
                        onChange={(e) => setOwnership({ ...ownership, userId: e.target.value })} 
                        className="admin-input h-16 bg-secondary/30 border-white/5"
                      >
                        {users.map((u) => (
                          <option key={u._id} value={u._id}>{u.username} — {u.email || 'No email'}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-blue-500/5 border border-blue-500/10 p-6 flex gap-4">
                    <Shield className="text-blue-500 shrink-0" size={20} />
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      Assigning ownership allows the user to manage the dossier, respond to claims, and update profile metadata directly. Use this for confirmed identity verifications.
                    </p>
                  </div>

                  <button 
                    disabled={busy || !ownership.accountId || !ownership.userId} 
                    onClick={() => submit(assignOwnership)} 
                    className="group flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 text-sm font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-blue-500/20 hover:scale-[1.01] transition-all active:scale-95 disabled:opacity-50"
                  >
                    {busy ? "Linking..." : "Finalize Assignment"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
