'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, User, Bell, Lock, Globe } from 'lucide-react';
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

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [scoreChanges, setScoreChanges] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

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
    <main className="mx-auto min-h-screen max-w-3xl bg-background px-4 pb-24 pt-8 lg:px-12">
      <header className="mb-10 flex items-center gap-3">
        <Settings size={28} className="text-foreground" />
        <h1 className="font-serif text-[32px] font-black text-foreground">Settings</h1>
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

        <div className="flex justify-center pt-4">
          <Button variant="danger" className="w-full max-w-sm" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>
      </div>
    </main>
  );
}
