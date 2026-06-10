import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  adminCreateReport,
  assignOwnership,
  createAdminAccount,
} from '@/api/admin';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/Toast';
import { SHEET_SCORING_INDEX } from '@/lib/scoringIndex';
import { cn } from '@/lib/utils';

type TabType = 'claim' | 'account' | 'ownership';

const PLATFORMS = ['x', 'instagram', 'facebook', 'youtube', 'tiktok', 'linkedin', 'reddit', 'snapchat', 'website'];

const firstPositive = SHEET_SCORING_INDEX.find((r) => r.type === 'positive') ?? SHEET_SCORING_INDEX[0];

export default function AdminCreate() {
  const toast = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('claim');
  const [submitting, setSubmitting] = useState(false);

  const [reportForm, setReportForm] = useState({
    account_id: '',
    type: 'positive' as 'positive' | 'negative',
    category: firstPositive.category,
    deed: firstPositive.deed,
    baseScore: firstPositive.baseScore,
    description: '',
    feelings: 'Published by the Shosha admin team.',
    visibility: 'public' as 'public' | 'hidden',
    pinned: false,
    featured: false,
  });

  const [accountForm, setAccountForm] = useState({
    platform: 'x',
    handle: '',
    display_name: '',
    bio: '',
  });

  const [ownership, setOwnership] = useState({ account_id: '', user_id: '' });

  const typedRows = useMemo(
    () => SHEET_SCORING_INDEX.filter((r) => r.type === reportForm.type),
    [reportForm.type],
  );

  const categoryOptions = useMemo(
    () => [...new Set(typedRows.map((r) => r.category))],
    [typedRows],
  );

  const deedOptions = useMemo(
    () => typedRows.filter((r) => r.category === reportForm.category),
    [reportForm.category, typedRows],
  );

  const selectedRow = deedOptions.find((r) => r.deed === reportForm.deed) ?? deedOptions[0];

  async function handleCreateReport() {
    if (!reportForm.account_id.trim()) {
      toast.push('Account ID is required');
      return;
    }
    if (reportForm.description.trim().length < 10) {
      toast.push('Description must be at least 10 characters');
      return;
    }
    if (!selectedRow) {
      toast.push('Choose a valid workbook deed');
      return;
    }
    setSubmitting(true);
    try {
      await adminCreateReport({
        account_id: reportForm.account_id.trim(),
        type: reportForm.type,
        description: reportForm.description.trim(),
        feelings: reportForm.feelings,
        category: selectedRow.category,
        deed: selectedRow.deed,
        base_score: selectedRow.baseScore,
        visibility: reportForm.visibility,
        pinned: reportForm.pinned,
        featured: reportForm.featured,
      });
      toast.push('Feed claim published.');
      setReportForm((f) => ({ ...f, description: '', pinned: false, featured: false }));
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Claim create failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAccount() {
    if (!accountForm.handle.trim()) {
      toast.push('Handle is required');
      return;
    }
    setSubmitting(true);
    try {
      await createAdminAccount({
        platform: accountForm.platform,
        handle: accountForm.handle.trim(),
        display_name: accountForm.display_name.trim() || undefined,
        bio: accountForm.bio.trim() || undefined,
      });
      toast.push('Account created.');
      navigate('/admin/accounts');
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Account create failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssignOwnership() {
    if (!ownership.account_id.trim() || !ownership.user_id.trim()) {
      toast.push('Account ID and user ID are required');
      return;
    }
    setSubmitting(true);
    try {
      await assignOwnership(ownership.account_id.trim(), ownership.user_id.trim());
      toast.push('Ownership assigned.');
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Ownership assignment failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'claim', label: 'Feed Claim' },
    { id: 'account', label: 'Create Account' },
    { id: 'ownership', label: 'Assign Ownership' },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wide">Create & Override</h2>
        <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-muted-foreground">
          Feed claims, accounts, ownership
        </span>
      </div>

      <div className="flex gap-1 rounded-2xl border border-border bg-secondary/50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-colors',
              activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-border bg-card p-6">
        {activeTab === 'claim' && (
          <div className="space-y-4">
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase text-muted-foreground">Account ID *</span>
              <input
                value={reportForm.account_id}
                onChange={(e) => setReportForm({ ...reportForm, account_id: e.target.value })}
                className="h-11 w-full rounded-xl border border-border px-3 text-sm font-mono"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Type</span>
                <select
                  value={reportForm.type}
                  onChange={(e) => {
                    const type = e.target.value as 'positive' | 'negative';
                    const first = SHEET_SCORING_INDEX.find((r) => r.type === type) ?? firstPositive;
                    setReportForm({
                      ...reportForm,
                      type,
                      category: first.category,
                      deed: first.deed,
                      baseScore: first.baseScore,
                    });
                  }}
                  className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                >
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Category</span>
                <select
                  value={reportForm.category}
                  onChange={(e) => {
                    const category = e.target.value;
                    const first = typedRows.find((r) => r.category === category) ?? typedRows[0];
                    setReportForm({
                      ...reportForm,
                      category,
                      deed: first?.deed ?? '',
                      baseScore: first?.baseScore ?? 0,
                    });
                  }}
                  className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                >
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Deed</span>
                <select
                  value={reportForm.deed}
                  onChange={(e) => {
                    const deed = e.target.value;
                    const row = deedOptions.find((r) => r.deed === deed) ?? deedOptions[0];
                    setReportForm({
                      ...reportForm,
                      deed,
                      baseScore: row?.baseScore ?? 0,
                    });
                  }}
                  className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                >
                  {deedOptions.map((r) => (
                    <option key={`${r.category}:${r.deed}`} value={r.deed}>{r.deed}</option>
                  ))}
                </select>
              </label>
              <div className="rounded-xl border border-border bg-secondary/30 px-4 py-2">
                <p className="text-[10px] font-black uppercase text-muted-foreground">Base score</p>
                <p className={cn('text-2xl font-black', reportForm.baseScore < 0 ? 'text-destructive' : 'text-primary')}>
                  {reportForm.baseScore > 0 ? '+' : ''}{reportForm.baseScore}
                </p>
              </div>
            </div>
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase text-muted-foreground">Description * (min 10)</span>
              <textarea
                value={reportForm.description}
                onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                rows={4}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase text-muted-foreground">Feelings</span>
              <input
                value={reportForm.feelings}
                onChange={(e) => setReportForm({ ...reportForm, feelings: e.target.value })}
                className="h-11 w-full rounded-xl border border-border px-3 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase text-muted-foreground">Visibility</span>
              <select
                value={reportForm.visibility}
                onChange={(e) => setReportForm({ ...reportForm, visibility: e.target.value as 'public' | 'hidden' })}
                className="h-11 w-full rounded-xl border border-border px-3 text-sm"
              >
                <option value="public">Public</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reportForm.pinned}
                  onChange={(e) => setReportForm({ ...reportForm, pinned: e.target.checked })}
                />
                Pin to dossier
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reportForm.featured}
                  onChange={(e) => setReportForm({ ...reportForm, featured: e.target.checked })}
                />
                Feature on feed
              </label>
            </div>
            <Button className="w-full" disabled={submitting} onClick={handleCreateReport}>
              {submitting ? 'Publishing…' : 'Publish Claim'}
            </Button>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-4">
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase text-muted-foreground">Platform</span>
              <select
                value={accountForm.platform}
                onChange={(e) => setAccountForm({ ...accountForm, platform: e.target.value })}
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
                value={accountForm.handle}
                onChange={(e) => setAccountForm({ ...accountForm, handle: e.target.value })}
                className="h-11 w-full rounded-xl border border-border px-3 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase text-muted-foreground">Display name</span>
              <input
                value={accountForm.display_name}
                onChange={(e) => setAccountForm({ ...accountForm, display_name: e.target.value })}
                className="h-11 w-full rounded-xl border border-border px-3 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase text-muted-foreground">Bio</span>
              <textarea
                value={accountForm.bio}
                onChange={(e) => setAccountForm({ ...accountForm, bio: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </label>
            <Button className="w-full" disabled={submitting} onClick={handleCreateAccount}>
              {submitting ? 'Creating…' : 'Create Account'}
            </Button>
          </div>
        )}

        {activeTab === 'ownership' && (
          <div className="space-y-4">
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase text-muted-foreground">Account ID</span>
              <input
                value={ownership.account_id}
                onChange={(e) => setOwnership({ ...ownership, account_id: e.target.value })}
                className="h-11 w-full rounded-xl border border-border px-3 text-sm font-mono"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase text-muted-foreground">User ID</span>
              <input
                value={ownership.user_id}
                onChange={(e) => setOwnership({ ...ownership, user_id: e.target.value })}
                className="h-11 w-full rounded-xl border border-border px-3 text-sm font-mono"
              />
            </label>
            <Button className="w-full" disabled={submitting} onClick={handleAssignOwnership}>
              {submitting ? 'Assigning…' : 'Finalize Assignment'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
