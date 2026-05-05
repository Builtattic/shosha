import { FeedItemProps } from '@/components/feed/FeedItem';

export type FeedReport = {
  _id: string;
  type: 'positive' | 'negative';
  description: string;
  media?: { type: 'image' | 'video'; url: string };
  createdAt?: string;
  stats?: FeedItemProps['stats'];
  aiVerdict?: { proposedImpact?: number } | null;
  adminDecision?: { finalImpact?: number } | null;
  category?: string;
  deed?: string;
  disputeStatus?: string;
  reportScore?: number;
  baseScore?: number;
  evidenceSourceUrl?: string;
  links?: Array<{ url: string; title?: string }>;
  canRequestModeration?: boolean;
  viewer?: FeedItemProps['viewer'];
  account: {
    _id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    verified?: boolean;
    platform?: string;
  };
  reporter?: {
    username: string;
    name?: string;
    photoUrl?: string;
    role?: string;
  } | null;
};

export function timestamp(value?: string) {
  if (!value) return 'just now';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes < 60) return minutes < 1 ? 'just now' : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

export function toFeedItem(report: FeedReport): FeedItemProps {
  return {
    id: report._id,
    user: {
      name: report.account.displayName.replace(/^@/, ''),
      handle: report.account.username.replace(/^@/, ''),
      avatar: report.account.avatarUrl ?? '',
      isVerified: Boolean(report.account.verified),
      platform: report.account.platform,
      accountId: report.account._id
    },
    reporter: report.reporter ? {
      name: report.reporter.name || report.reporter.username.replace(/^@/, ''),
      handle: report.reporter.username.replace(/^@/, ''),
      avatar: report.reporter.photoUrl ?? '',
      isVerified: report.reporter.role === 'admin' || report.reporter.role === 'moderator'
    } : undefined,
    timestamp: timestamp(report.createdAt),
    type: report.type,
    title: report.description,
    location: 'Global',
    media: report.media,
    category: report.category,
    deed: report.deed,
    disputeStatus: report.disputeStatus,
    reportScore: report.reportScore ?? report.baseScore,
    evidenceSourceUrl: report.evidenceSourceUrl,
    links: report.links,
    stats: report.stats ?? { aligns: 0, opposes: 0, comments: 0, shares: 0 },
    delta: report.adminDecision?.finalImpact ?? report.aiVerdict?.proposedImpact ?? 0,
    viewer: report.viewer,
    canRequestModeration: report.canRequestModeration
  };
}
