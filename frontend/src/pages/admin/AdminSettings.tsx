import { useEffect, useState } from 'react';
import { getAdminSettings, updateAdminSettings } from '@/api/admin';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/providers/AuthProvider';

type SiteSettings = {
  allowAiReviewedInFeed: boolean;
  allowFlaggedInFeed: boolean;
  liveFeedEnabled: boolean;
  feedRankingMode: string;
  enabledPlatforms: string[];
  scoreImpactMin: number;
  scoreImpactMax: number;
  uploadMaxBytes: number;
  disputeThreshold: number;
  duplicateThreshold: number;
  singleReportDeltaCap: number;
  dailyProfileDeltaCap: number;
  reportCooldownHours: number;
};

const CAMEL_TO_SNAKE: Record<keyof SiteSettings, string> = {
  allowAiReviewedInFeed: 'allow_ai_reviewed_in_feed',
  allowFlaggedInFeed: 'allow_flagged_in_feed',
  liveFeedEnabled: 'live_feed_enabled',
  feedRankingMode: 'feed_ranking_mode',
  enabledPlatforms: 'enabled_platforms',
  scoreImpactMin: 'score_impact_min',
  scoreImpactMax: 'score_impact_max',
  uploadMaxBytes: 'upload_max_bytes',
  disputeThreshold: 'dispute_threshold',
  duplicateThreshold: 'duplicate_threshold',
  singleReportDeltaCap: 'single_report_delta_cap',
  dailyProfileDeltaCap: 'daily_profile_delta_cap',
  reportCooldownHours: 'report_cooldown_hours',
};

const PLATFORMS = ['x', 'instagram', 'facebook', 'youtube', 'tiktok', 'linkedin', 'reddit', 'snapchat', 'website'];

function toSiteSettings(raw: Record<string, unknown>): SiteSettings {
  return {
    allowAiReviewedInFeed: Boolean(raw.allowAiReviewedInFeed),
    allowFlaggedInFeed: Boolean(raw.allowFlaggedInFeed),
    liveFeedEnabled: Boolean(raw.liveFeedEnabled),
    feedRankingMode: String(raw.feedRankingMode ?? 'smart'),
    enabledPlatforms: Array.isArray(raw.enabledPlatforms) ? (raw.enabledPlatforms as string[]) : PLATFORMS,
    scoreImpactMin: Number(raw.scoreImpactMin ?? -10),
    scoreImpactMax: Number(raw.scoreImpactMax ?? 10),
    uploadMaxBytes: Number(raw.uploadMaxBytes ?? 26214400),
    disputeThreshold: Number(raw.disputeThreshold ?? 3),
    duplicateThreshold: Number(raw.duplicateThreshold ?? 0.86),
    singleReportDeltaCap: Number(raw.singleReportDeltaCap ?? 3000),
    dailyProfileDeltaCap: Number(raw.dailyProfileDeltaCap ?? 5000),
    reportCooldownHours: Number(raw.reportCooldownHours ?? 24),
  };
}

export default function AdminSettings() {
  const toast = useToast();
  const { profile } = useAuth();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [initial, setInitial] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit = profile?.role === 'SUPER_ADMIN';

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAdminSettings();
        const parsed = toSiteSettings(data);
        if (mounted) {
          setSettings(parsed);
          setInitial(parsed);
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function togglePlatform(platform: string) {
    if (!settings || !canEdit) return;
    setSettings((prev) => {
      if (!prev) return prev;
      const enabled = prev.enabledPlatforms.includes(platform)
        ? prev.enabledPlatforms.filter((p) => p !== platform)
        : [...prev.enabledPlatforms, platform];
      return { ...prev, enabledPlatforms: enabled };
    });
  }

  async function handleSave() {
    if (!settings || !initial || !canEdit) return;
    setSaving(true);
    try {
      const partial: Record<string, unknown> = {};
      (Object.keys(CAMEL_TO_SNAKE) as (keyof SiteSettings)[]).forEach((key) => {
        if (JSON.stringify(settings[key]) !== JSON.stringify(initial[key])) {
          partial[CAMEL_TO_SNAKE[key]] = settings[key];
        }
      });
      if (Object.keys(partial).length === 0) {
        toast.push('No changes to save.');
        return;
      }
      const updated = await updateAdminSettings(partial);
      const parsed = toSiteSettings(updated);
      setSettings(parsed);
      setInitial(parsed);
      toast.push('Settings saved.');
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Settings update failed.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-muted" />;
  }

  if (error || !settings) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        {error ?? 'Settings unavailable'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wide">Site Settings</h2>
        <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-muted-foreground">
          Feed, scoring, platform controls
        </span>
      </div>

      {!canEdit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Settings editing requires Super Admin access. View only.
        </div>
      )}

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Feed behavior</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={!canEdit}
                checked={settings.allowAiReviewedInFeed}
                onChange={(e) => setSettings({ ...settings, allowAiReviewedInFeed: e.target.checked })}
              />
              Show AI-reviewed reports publicly
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={!canEdit}
                checked={settings.allowFlaggedInFeed}
                onChange={(e) => setSettings({ ...settings, allowFlaggedInFeed: e.target.checked })}
              />
              Show flagged reports publicly
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={!canEdit}
                checked={settings.liveFeedEnabled}
                onChange={(e) => setSettings({ ...settings, liveFeedEnabled: e.target.checked })}
              />
              Enable external live feed inserts
            </label>
            <select
              disabled={!canEdit}
              value={settings.feedRankingMode}
              onChange={(e) => setSettings({ ...settings, feedRankingMode: e.target.value })}
              className="h-11 w-full rounded-xl border border-border px-3 text-sm"
            >
              <option value="smart">Smart ranking</option>
              <option value="recent">Recent first</option>
            </select>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Limits</h3>
            {(
              [
                ['scoreImpactMin', 'Impact min'],
                ['scoreImpactMax', 'Impact max'],
                ['uploadMaxBytes', 'Upload max bytes'],
                ['disputeThreshold', 'Dispute threshold'],
                ['duplicateThreshold', 'Duplicate threshold'],
                ['singleReportDeltaCap', 'Report cap'],
                ['dailyProfileDeltaCap', 'Daily cap'],
                ['reportCooldownHours', 'Cooldown hours'],
              ] as [keyof SiteSettings, string][]
            ).map(([key, label]) => (
              <label key={key} className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground">{label}</span>
                <input
                  type="number"
                  disabled={!canEdit}
                  step={key === 'duplicateThreshold' ? '0.01' : '1'}
                  value={settings[key] as number}
                  onChange={(e) => setSettings({ ...settings, [key]: Number(e.target.value) })}
                  className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                />
              </label>
            ))}
          </section>
        </div>

        <section className="mt-8 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Platforms</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PLATFORMS.map((platform) => (
              <label key={platform} className="flex items-center gap-2 text-sm capitalize">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={settings.enabledPlatforms.includes(platform)}
                  onChange={() => togglePlatform(platform)}
                />
                {platform}
              </label>
            ))}
          </div>
        </section>

        {canEdit && (
          <div className="mt-6 flex justify-end">
            <Button disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
