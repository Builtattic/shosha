import { adminDb } from '@/lib/firebase/admin';
import type { Platform, ReportStatus } from '@/types';

export type FeedRankingMode = 'smart' | 'recent';

export type SiteSettings = {
  allowAiReviewedInFeed: boolean;
  allowFlaggedInFeed: boolean;
  feedRankingMode: FeedRankingMode;
  enabledPlatforms: Platform[];
  scoreImpactMin: number;
  scoreImpactMax: number;
  uploadMaxBytes: number;
  liveFeedEnabled: boolean;
  disputeThreshold: number;
  duplicateThreshold: number;
  singleReportDeltaCap: number;
  dailyProfileDeltaCap: number;
  reportCooldownHours: number;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  allowAiReviewedInFeed: false,
  allowFlaggedInFeed: false,
  feedRankingMode: 'smart',
  enabledPlatforms: ['x', 'instagram', 'facebook', 'youtube', 'tiktok', 'linkedin', 'reddit', 'snapchat', 'website'],
  scoreImpactMin: -10,
  scoreImpactMax: 10,
  uploadMaxBytes: 25 * 1024 * 1024,
  liveFeedEnabled: false,
  disputeThreshold: 3,
  duplicateThreshold: 0.86,
  singleReportDeltaCap: 3000,
  dailyProfileDeltaCap: 5000,
  reportCooldownHours: 24,
};

function ref() {
  return adminDb().ref('siteSettings').child('current');
}

export async function get(): Promise<SiteSettings> {
  const snap = await ref().once('value');
  const value = snap.exists() ? snap.val() : {};
  return {
    ...DEFAULT_SITE_SETTINGS,
    ...value,
    enabledPlatforms: Array.isArray(value.enabledPlatforms) ? value.enabledPlatforms : DEFAULT_SITE_SETTINGS.enabledPlatforms,
  };
}

export async function update(partial: Partial<SiteSettings>): Promise<SiteSettings> {
  const current = await get();
  const next = { ...current, ...partial };
  await ref().set({ ...next, updatedAt: new Date().toISOString() });
  return next;
}

export function publicFeedStatuses(settings: SiteSettings): ReportStatus[] {
  const statuses: ReportStatus[] = ['approved'];
  if (settings.allowAiReviewedInFeed) statuses.push('ai_reviewed');
  if (settings.allowFlaggedInFeed) statuses.push('flagged');
  return statuses;
}
