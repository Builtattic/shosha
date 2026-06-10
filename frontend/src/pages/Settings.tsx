import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, User, Bell, Lock, Trash2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { submitDeletionRequest } from '@/api/me';
import { useToast } from '@/components/ui/Toast';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 rounded-full transition ${checked ? 'bg-primary' : 'bg-muted'}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-background transition ${checked ? 'right-1' : 'left-1'}`}
      />
    </button>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const toast = useToast();
  const { profile, firebaseUser, logout } = useAuth();

  const [scoreChanges, setScoreChanges] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

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

  async function handleDeletionSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (reason.trim().length < 10) {
      setFormError('Reason must be at least 10 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await submitDeletionRequest(reason.trim(), details.trim() || undefined);
      toast.push('Request submitted');
      setDeletionOpen(false);
      setReason('');
      setDetails('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit request';
      setFormError(message);
      toast.push(message);
    } finally {
      setSubmitting(false);
    }
  }

  const email = profile?.email ?? firebaseUser?.email ?? 'Not signed in';
  const displayName = profile?.display_name ?? profile?.username ?? 'Not set';

  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-background px-4 safe-bottom pt-8 pb-20 md:pb-8 lg:px-12">
      <header className="mb-10 flex items-center gap-3">
        <SettingsIcon size={28} className="text-foreground" />
        <h1 className="font-serif text-[28px] font-black leading-none tracking-tight text-foreground">
          Settings
        </h1>
      </header>

      <div className="space-y-6">
        <section className="rounded-[24px] border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
            <User size={20} className="text-foreground" />
            <h2 className="text-[18px] font-bold text-foreground">Account</h2>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[14px] font-bold">Email Address</p>
              <p className="text-[12px] text-muted-foreground">{email}</p>
            </div>
            <div>
              <p className="text-[14px] font-bold">Display Name</p>
              <p className="text-[12px] text-muted-foreground">{displayName}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/profile/edit')}
              className="rounded-full border border-border bg-background px-4 py-2 text-[13px] font-semibold hover:bg-muted"
            >
              Edit Profile
            </button>
          </div>
        </section>

        <section className="rounded-[24px] border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
            <Bell size={20} className="text-foreground" />
            <h2 className="text-[18px] font-bold text-foreground">Notifications</h2>
          </div>
          <p className="mb-4 text-[12px] text-muted-foreground">
            {/* Note: notification preferences are stored locally until backend preference endpoint is added */}
            Notification preferences are stored locally until a backend preference endpoint is added.
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-bold">Score changes</p>
                <p className="text-[12px] text-muted-foreground">
                  Get notified when your reports move a dossier
                </p>
              </div>
              <Toggle checked={scoreChanges} onChange={updateScoreChanges} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-bold">Weekly digest</p>
                <p className="text-[12px] text-muted-foreground">A summary of your weekly momentum</p>
              </div>
              <Toggle checked={weeklyDigest} onChange={updateWeeklyDigest} />
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
            <Lock size={20} className="text-foreground" />
            <h2 className="text-[18px] font-bold text-foreground">Privacy</h2>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Your public dossiers are visible to all Shosha users.
          </p>
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
          {!deletionOpen ? (
            <button
              type="button"
              onClick={() => setDeletionOpen(true)}
              className="rounded-full border border-destructive/30 bg-background px-4 py-2 text-[12px] font-bold text-destructive hover:bg-destructive/10"
            >
              Request account removal
            </button>
          ) : (
            <form onSubmit={handleDeletionSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold mb-1.5">Reason (required, min 10 chars)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[14px] resize-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold mb-1.5">Details (optional)</label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[14px] resize-none"
                />
              </div>
              {formError && <p className="text-[12px] text-destructive">{formError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-bold text-background disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeletionOpen(false)}
                  className="rounded-full border border-border px-5 py-2.5 text-[13px] font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={() => logout()}
            className="w-full max-w-sm rounded-full bg-destructive px-6 py-3 text-[14px] font-bold text-destructive-foreground"
          >
            Sign Out
          </button>
        </div>
      </div>
    </main>
  );
}
