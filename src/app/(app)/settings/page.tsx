'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, Globe, Lock, Palette, Pencil, Settings, Trash2, User, Bell, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 rounded-full transition ${checked ? 'bg-primary' : 'bg-muted'}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? 'right-1' : 'left-1'}`} />
    </button>
  );
}

const DELETION_REASONS = [
  'Privacy concerns',
  'Duplicate account',
  'Incorrect profile',
  'Impersonation',
  'Do not want public profile',
  'Harassment or safety concerns',
  'Other',
] as const;

type DeletionRequestModalProps = {
  open: boolean;
  onClose: () => void;
};

function DeletionRequestModal({ open, onClose }: DeletionRequestModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setReason('');
    setDetails('');
    setAttachmentUrls([]);
    setUploading(false);
    setSubmitting(false);
    setConfirmed(false);
    setError(null);
  }, [open]);

  const canSubmit = useMemo(() => Boolean(reason && confirmed && !submitting), [reason, confirmed, submitting]);

  async function handleAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || attachmentUrls.length >= 5) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/media/upload', { method: 'POST', body: formData });
      const payload = await response.json();
      if (!payload.ok || !payload.data?.url) {
        throw new Error(payload.error?.message ?? 'Upload failed.');
      }
      setAttachmentUrls((prev) => [...prev, payload.data.url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/me/deletion-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          details: details.trim() || undefined,
          attachmentUrls,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        if (response.status === 409) {
          setError('You already have a pending request under review.');
          return;
        }
        throw new Error(payload?.error?.message ?? 'Failed to submit request.');
      }
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[20px] font-black text-foreground">
              {step === 1 ? 'Request Profile Removal' : 'Request Submitted'}
            </h3>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {step === 1
                ? 'This will be reviewed by our moderation team. Your profile will not be deleted immediately.'
                : 'Our moderation team will review your request and contact you at your registered email address. This typically takes 2–5 business days.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border p-2 text-muted-foreground transition hover:bg-muted"
            aria-label="Close modal"
          >
            <X size={14} />
          </button>
        </div>

        {step === 2 ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle size={28} />
            </div>
            <p className="text-[14px] text-muted-foreground">
              Your request is now in the admin review queue.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-full bg-foreground px-6 py-2.5 text-[13px] font-bold text-background transition hover:opacity-90"
            >
              Close
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-1.5">
              <span className="text-[12px] font-bold text-foreground">Reason</span>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[14px]"
                required
              >
                <option value="">Select reason</option>
                {DELETION_REASONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-foreground">Details (optional)</span>
                <span className="text-[11px] text-muted-foreground">{details.length}/1000</span>
              </div>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
                placeholder="Provide any additional context..."
                className="min-h-[110px] w-full rounded-xl border border-border bg-background px-3 py-2 text-[14px]"
                maxLength={1000}
              />
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-foreground">Attachments (optional)</span>
                <span className="text-[11px] text-muted-foreground">{attachmentUrls.length}/5</span>
              </div>
              {attachmentUrls.length < 5 && (
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleAttachment}
                  className="block w-full text-[13px]"
                />
              )}
              {uploading ? <p className="text-[12px] text-muted-foreground">Uploading...</p> : null}
              {attachmentUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachmentUrls.map((url) => (
                    <span
                      key={url}
                      className="inline-flex max-w-full items-center gap-2 rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground"
                    >
                      <a href={url} target="_blank" rel="noreferrer" className="truncate hover:underline">
                        {url}
                      </a>
                      <button
                        type="button"
                        onClick={() => setAttachmentUrls((prev) => prev.filter((item) => item !== url))}
                        className="text-[12px] leading-none"
                        aria-label="Remove attachment"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-start gap-2 rounded-xl border border-border bg-background px-3 py-2">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-[12px] text-muted-foreground">
                I understand this request will be reviewed and my profile may be anonymized or removed at admin
                discretion.
              </span>
            </label>

            {error ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-full bg-foreground py-3 text-[14px] font-bold text-background transition hover:opacity-90 disabled:opacity-40"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [scoreChanges, setScoreChanges] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);

  useEffect(() => {
    setScoreChanges(window.localStorage.getItem('shosha:scoreChanges') !== 'false');
    setWeeklyDigest(window.localStorage.getItem('shosha:weeklyDigest') !== 'false');
  }, []);

  function updateScoreChanges(value: boolean) {
    setScoreChanges(value);
    window.localStorage.setItem('shosha:scoreChanges', String(value));
  }

  function updateWeeklyDigest(value: boolean) {
    setWeeklyDigest(value);
    window.localStorage.setItem('shosha:weeklyDigest', String(value));
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-background px-4 safe-bottom pt-8 lg:px-12">
      <header className="mb-10 flex items-center gap-3">
        <Settings size={28} className="text-foreground" />
        <h1 className="font-serif text-[28px] font-black leading-none tracking-tight text-foreground">Settings</h1>
      </header>

      <div className="space-y-6">
        <section className="rounded-[24px] border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
            <User size={20} className="text-foreground" />
            <h2 className="text-[18px] font-bold text-foreground">Account</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-bold">Email Address</p>
                <p className="text-[12px] text-muted-foreground">
                  {user?.email ?? 'Not signed in'}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-bold">Display Name</p>
                <p className="text-[12px] text-muted-foreground">{user?.displayName ?? 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-bold">Password & Security</p>
                <p className="text-[12px] text-muted-foreground">Managed by Firebase Authentication</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
              <div>
                <p className="text-[14px] font-bold">Profile Details</p>
                <p className="text-[12px] text-muted-foreground">Edit your name, bio, and other profile info</p>
              </div>
              <Link
                href="/profile/edit"
                className="flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-[13px] font-semibold text-foreground shadow-sm transition-all hover:bg-muted shrink-0"
              >
                <Pencil size={13} /> Edit
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
            <Bell size={20} className="text-foreground" />
            <h2 className="text-[18px] font-bold text-foreground">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-bold">Score Changes</p>
                <p className="text-[12px] text-muted-foreground">Get notified when your reports move a dossier</p>
              </div>
              <Toggle checked={scoreChanges} onChange={updateScoreChanges} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-bold">Weekly Digest</p>
                <p className="text-[12px] text-muted-foreground">A summary of your weekly momentum</p>
              </div>
              <Toggle checked={weeklyDigest} onChange={updateWeeklyDigest} />
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
            <Palette size={20} className="text-foreground" />
            <h2 className="text-[18px] font-bold text-foreground">Appearance</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-bold">Theme</p>
                <p className="text-[12px] text-muted-foreground">Switch between light and dark mode</p>
              </div>
              <ThemeToggle showLabel={true} />
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
            <Lock size={20} className="text-foreground" />
            <h2 className="text-[18px] font-bold text-foreground">Privacy & Security</h2>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[14px] font-bold">Profile Visibility</p>
              <p className="text-[12px] text-muted-foreground">Dossiers are public; user account details stay private</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-[12px] font-bold text-muted-foreground">
              <Globe size={14} /> Public
            </div>
          </div>
        </section>

        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-foreground">Danger Zone</h2>
              <p className="text-[12px] text-muted-foreground">Irreversible account actions</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold text-foreground">Request Profile Removal</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Submit a request to have your profile reviewed for removal. This does not immediately delete your
                account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDeletionModalOpen(true)}
              className="shrink-0 rounded-full border border-destructive/30 bg-background px-4 py-2 text-[12px] font-bold text-destructive transition hover:bg-destructive/10"
            >
              Request Removal
            </button>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <Button variant="danger" className="w-full max-w-sm" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>
      </div>
      <DeletionRequestModal open={deletionModalOpen} onClose={() => setDeletionModalOpen(false)} />
    </main>
  );
}
