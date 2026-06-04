// lib/feed.ts
// Shared feed utilities: type re-exports, timestamp helper, toFeedItem mapper.
// Imported by Dashboard, PostDetailModal, and any other page that renders feeds.

import type { FeedReport, FeedItemProps } from '@/types/feed';

export type { FeedReport };

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert an ISO date string to a compact relative time label. */
export function timestamp(value?: string): string {
  if (!value) return 'just now';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Map a raw FeedReport (API/mock shape) to the FeedItemProps expected by
 * the <FeedItem> component.
 */
export function toFeedItem(report: FeedReport): FeedItemProps {
  return {
    id: report._id,
    user: {
      name: report.account.displayName.replace(/^@/, ''),
      handle: report.account.username.replace(/^@/, ''),
      avatar: report.account.avatarUrl ?? '',
      isVerified: Boolean(report.account.verified),
      accountId: report.account._id,
      platform: report.account.platform,
    },
    reporter: report.reporter
      ? {
          name: report.reporter.name || report.reporter.username.replace(/^@/, ''),
          handle: report.reporter.username.replace(/^@/, ''),
          avatar: report.reporter.photoUrl ?? '',
          isVerified:
            report.reporter.role === 'admin' || report.reporter.role === 'moderator',
        }
      : undefined,
    timestamp: timestamp(report.createdAt),
    type: report.type,
    title: report.description,
    location: 'Global',
    media: report.media
      ? { type: report.media.type, url: report.media.url, thumbUrl: report.media.thumbUrl }
      : undefined,
    category: report.category,
    deed: report.deed,
    disputeStatus: report.disputeStatus,
    reportScore: report.reportScore ?? report.baseScore,
    stats: report.stats ?? { aligns: 0, opposes: 0, comments: 0, shares: 0 },
    delta: report.adminDecision?.finalImpact ?? report.aiVerdict?.proposedImpact ?? 0,
    viewer: report.viewer,
    canRequestModeration: report.canRequestModeration,
  };
}
