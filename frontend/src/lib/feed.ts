import type { FeedFilter, FeedReport, FeedItemProps } from '@/types/feed';

export type { FeedReport };

export function filterFeedReports(reports: FeedReport[], filter: FeedFilter): FeedReport[] {
  switch (filter) {
    case 'top':
      return [...reports].sort((a, b) => Math.abs(b.base_score ?? 0) - Math.abs(a.base_score ?? 0));
    case 'following':
      // TODO: filter by followed accounts when follow graph is exposed in feed
      return reports;
    case 'near':
      return [];
    case 'for_you':
    default:
      return reports;
  }
}

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

function mapViewerVote(vote: 'ALIGN' | 'OPPOSE' | null | undefined): 'align' | 'oppose' | null {
  if (vote === 'ALIGN') return 'align';
  if (vote === 'OPPOSE') return 'oppose';
  return null;
}

export function toFeedItem(report: FeedReport): FeedItemProps {
  const account = report.account;
  const firstMedia = report.media[0];
  const proposedImpact =
    typeof report.ai_verdict?.proposed_impact === 'number'
      ? report.ai_verdict.proposed_impact
      : typeof report.ai_verdict?.proposedImpact === 'number'
        ? report.ai_verdict.proposedImpact
        : 0;

  return {
    id: report.id,
    user: {
      name: (account?.display_name ?? account?.handle ?? 'Unknown').replace(/^@/, ''),
      handle: (account?.handle ?? '').replace(/^@/, ''),
      avatar: '',
      isVerified: false,
      accountId: account?.id,
      platform: account?.platform,
    },
    reporter: report.reporter
      ? {
          name: report.reporter.display_name || report.reporter.username.replace(/^@/, ''),
          handle: report.reporter.username.replace(/^@/, ''),
          avatar: report.reporter.photo_url ?? '',
          isVerified: false,
        }
      : undefined,
    timestamp: timestamp(report.created_at),
    type: report.type,
    title: report.title || report.description,
    description: report.description,
    evidenceSourceUrl: report.evidence_source_url ?? undefined,
    media: firstMedia
      ? {
          type: firstMedia.media_type,
          url: firstMedia.url,
          thumbUrl: firstMedia.thumbnail_url ?? undefined,
          count: report.media.length > 1 ? report.media.length : undefined,
        }
      : undefined,
    category: report.category,
    deed: report.deed ?? undefined,
    reportScore: report.report_score ?? report.base_score ?? undefined,
    stats: report.stats,
    delta: proposedImpact,
    viewer: report.viewer
      ? {
          vote: mapViewerVote(report.viewer.vote),
          bookmarked: report.viewer.bookmarked,
        }
      : undefined,
    canRequestModeration: report.can_request_moderation,
    publicAnonymous: report.public_anonymous,
  };
}
