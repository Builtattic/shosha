import type { ReportStatus, ReportType } from '@/types/report';

export interface FeedItemViewer {
  vote: 'align' | 'oppose' | null;
  bookmarked: boolean;
}

export interface FeedItemProps {
  id: string;
  user: {
    name: string;
    handle: string;
    avatar: string;
    isVerified: boolean;
    platform?: string;
    accountId?: string;
    followers?: string;
  };
  timestamp: string;
  type: 'positive' | 'negative';
  title: string;
  description?: string;
  reportScore?: number;
  evidenceSourceUrl?: string;
  links?: Array<{ url: string; title?: string }>;
  media?: {
    type: 'image' | 'video';
    url: string;
    thumbUrl?: string;
    count?: number;
  };
  category?: string;
  deed?: string;
  disputeStatus?: string;
  location?: string;
  stats: {
    aligns: number;
    opposes: number;
    comments: number;
    shares: number;
  };
  delta: number;
  credibility?: number;
  viewer?: FeedItemViewer;
  reporter?: {
    name: string;
    handle: string;
    avatar: string;
    isVerified: boolean;
  };
  canRequestModeration?: boolean;
  publicAnonymous?: boolean;
}

export type FeedFilter = 'for_you' | 'following' | 'top' | 'near';

/** V2 adapter shape for feed/report list items */
export interface FeedReport {
  id: string;
  type: ReportType;
  title: string;
  description: string;
  deed: string | null;
  base_score: number | null;
  status: ReportStatus;
  created_at: string;
  is_irl: boolean;
  evidence_source_url: string | null;
  public_anonymous: boolean;
  media: Array<{
    url: string;
    thumbnail_url: string | null;
    media_type: 'image' | 'video';
  }>;
  stats: {
    aligns: number;
    opposes: number;
    comments: number;
    shares: number;
  };
  viewer: {
    vote: 'ALIGN' | 'OPPOSE' | null;
    bookmarked: boolean;
  } | null;
  account: {
    id: string;
    platform: string;
    handle: string;
    display_name: string | null;
    score: number;
  } | null;
  reporter: {
    id: string;
    username: string;
    display_name: string | null;
    photo_url: string | null;
  } | null;
  can_request_moderation: boolean;
  category?: string;
  dispute_status?: string;
  report_score?: number | null;
  ai_verdict?: Record<string, unknown> | null;
}
