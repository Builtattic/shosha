'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { SiteSettings } from '@/lib/repos/siteSettings';
import type { Platform } from '@/types';

const platforms: Platform[] = ['x', 'instagram', 'facebook', 'youtube', 'tiktok', 'linkedin', 'website'];

export function AdminSettingsForm({ initialSettings }: { initialSettings: SiteSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  async function save() {
    try {
      const res = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Settings update failed.');
      setSettings(payload.data);
      toast.push('Settings saved.');
      startTransition(() => router.refresh());
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Settings update failed.');
    }
  }

  function togglePlatform(platform: Platform) {
    setSettings((current) => ({ ...current, enabledPlatforms: current.enabledPlatforms.includes(platform) ? current.enabledPlatforms.filter((item) => item !== platform) : [...current.enabledPlatforms, platform] }));
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Feed behavior</h3>
          <label className="admin-check"><input type="checkbox" checked={settings.allowAiReviewedInFeed} onChange={(e) => setSettings({ ...settings, allowAiReviewedInFeed: e.target.checked })} /> Show AI-reviewed reports publicly</label>
          <label className="admin-check"><input type="checkbox" checked={settings.allowFlaggedInFeed} onChange={(e) => setSettings({ ...settings, allowFlaggedInFeed: e.target.checked })} /> Show flagged reports publicly</label>
          <label className="admin-check"><input type="checkbox" checked={settings.liveFeedEnabled} onChange={(e) => setSettings({ ...settings, liveFeedEnabled: e.target.checked })} /> Enable external live feed inserts</label>
          <select value={settings.feedRankingMode} onChange={(e) => setSettings({ ...settings, feedRankingMode: e.target.value as SiteSettings['feedRankingMode'] })} className="admin-input"><option value="smart">Smart ranking</option><option value="recent">Recent first</option></select>
        </section>
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Limits & platforms</h3>
          <div className="grid grid-cols-2 gap-3"><input type="number" value={settings.scoreImpactMin} onChange={(e) => setSettings({ ...settings, scoreImpactMin: Number(e.target.value) })} className="admin-input" /><input type="number" value={settings.scoreImpactMax} onChange={(e) => setSettings({ ...settings, scoreImpactMax: Number(e.target.value) })} className="admin-input" /></div>
          <input type="number" value={settings.uploadMaxBytes} onChange={(e) => setSettings({ ...settings, uploadMaxBytes: Number(e.target.value) })} className="admin-input" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{platforms.map((platform) => <label key={platform} className="admin-check capitalize"><input type="checkbox" checked={settings.enabledPlatforms.includes(platform)} onChange={() => togglePlatform(platform)} />{platform}</label>)}</div>
        </section>
      </div>
      <div className="mt-6 flex justify-end"><button disabled={pending} onClick={save} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-[12px] font-black uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50"><Save size={15} /> Save settings</button></div>
    </div>
  );
}
