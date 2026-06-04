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

/** Raw report shape returned by the /api/feed endpoint */
export interface FeedReport {
  _id: string;
  type: 'positive' | 'negative';
  description: string;
  media?: { type: 'image' | 'video'; url: string; thumbUrl?: string };
  createdAt?: string;
  stats?: { aligns: number; opposes: number; comments: number; shares: number };
  aiVerdict?: { proposedImpact?: number } | null;
  adminDecision?: { finalImpact?: number } | null;
  category?: string;
  deed?: string;
  disputeStatus?: string;
  reportScore?: number;
  baseScore?: number;
  canRequestModeration?: boolean;
  viewer?: FeedItemViewer;
  account: {
    _id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    verified?: boolean;
    score: number;
    platform?: string;
  };
  reporter?: {
    username: string;
    name?: string;
    photoUrl?: string;
    role?: string;
  } | null;
}
