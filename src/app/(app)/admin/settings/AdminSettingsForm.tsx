'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { SiteSettings } from '@/lib/repos/siteSettings';
import type { Platform } from '@/types';

const platforms: Platform[] = ['x', 'instagram', 'facebook', 'youtube', 'tiktok', 'linkedin', 'reddit', 'snapchat', 'website'];

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="admin-input"
      />
    </label>
  );
}

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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberField label="Impact min" value={settings.scoreImpactMin} onChange={(value) => setSettings({ ...settings, scoreImpactMin: value })} />
            <NumberField label="Impact max" value={settings.scoreImpactMax} onChange={(value) => setSettings({ ...settings, scoreImpactMax: value })} />
          </div>
          <NumberField label="Upload max bytes" value={settings.uploadMaxBytes} onChange={(value) => setSettings({ ...settings, uploadMaxBytes: value })} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberField label="Dispute threshold" value={settings.disputeThreshold} onChange={(value) => setSettings({ ...settings, disputeThreshold: value })} />
            <NumberField label="Duplicate threshold" step="0.01" value={settings.duplicateThreshold} onChange={(value) => setSettings({ ...settings, duplicateThreshold: value })} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <NumberField label="Report cap" value={settings.singleReportDeltaCap} onChange={(value) => setSettings({ ...settings, singleReportDeltaCap: value })} />
            <NumberField label="Daily cap" value={settings.dailyProfileDeltaCap} onChange={(value) => setSettings({ ...settings, dailyProfileDeltaCap: value })} />
            <NumberField label="Cooldown hours" value={settings.reportCooldownHours} onChange={(value) => setSettings({ ...settings, reportCooldownHours: value })} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{platforms.map((platform) => <label key={platform} className="admin-check capitalize"><input type="checkbox" checked={settings.enabledPlatforms.includes(platform)} onChange={() => togglePlatform(platform)} />{platform}</label>)}</div>
        </section>
      </div>
      <div className="mt-6 flex justify-end"><button disabled={pending} onClick={save} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-[12px] font-black uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50"><Save size={15} /> Save settings</button></div>
    </div>
  );
}
