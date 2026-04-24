import type { Platform } from '@/types';

type SocialPost = {
  externalId: string;
  content: string;
  likes: string;
  replies: string;
  mediaUrl?: string;
  capturedAt: Date;
};

export type SocialProfile = {
  platform: Platform;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  verified: boolean;
  followers: string;
  posts: SocialPost[];
};

class SocialFetchError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 502
  ) {
    super(message);
  }
}

function cleanHandle(username: string) {
  return username.trim().replace(/^@/, '').toLowerCase();
}

function formatCount(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'unknown';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return String(value);
}

async function fetchJson<T>(url: string, init: RequestInit, platform: Platform): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init.headers
    },
    cache: 'no-store'
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      json?.errors?.[0]?.detail ??
      json?.error?.message ??
      json?.title ??
      `The ${platform === 'x' ? 'X' : 'Instagram'} API refused the lookup.`;
    throw new SocialFetchError(detail, 'social_api_error', response.status);
  }
  return json as T;
}

async function fetchXProfile(username: string): Promise<SocialProfile> {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    throw new SocialFetchError('Add X_BEARER_TOKEN before tracking live X accounts.', 'x_not_configured', 503);
  }

  const handle = cleanHandle(username);
  const fields = 'created_at,description,verified,public_metrics,profile_image_url';
  const user = await fetchJson<{
    data?: {
      id: string;
      name: string;
      username: string;
      description?: string;
      verified?: boolean;
      profile_image_url?: string;
      public_metrics?: { followers_count?: number; tweet_count?: number };
    };
  }>(`https://api.x.com/2/users/by/username/${encodeURIComponent(handle)}?user.fields=${fields}`, {
    headers: { Authorization: `Bearer ${token}` }
  }, 'x');

  if (!user.data) {
    throw new SocialFetchError(`No X account was found for @${handle}.`, 'social_not_found', 404);
  }

  let posts: SocialPost[] = [];
  try {
    const timeline = await fetchJson<{
      data?: Array<{
        id: string;
        text: string;
        created_at?: string;
        public_metrics?: { like_count?: number; reply_count?: number };
      }>;
    }>(
      `https://api.x.com/2/users/${user.data.id}/tweets?max_results=5&exclude=retweets,replies&tweet.fields=created_at,public_metrics`,
      { headers: { Authorization: `Bearer ${token}` } },
      'x'
    );
    posts =
      timeline.data?.map((post) => ({
        externalId: post.id,
        content: post.text,
        likes: formatCount(post.public_metrics?.like_count),
        replies: formatCount(post.public_metrics?.reply_count),
        capturedAt: post.created_at ? new Date(post.created_at) : new Date()
      })) ?? [];
  } catch {
    posts = [];
  }

  return {
    platform: 'x',
    username: user.data.username.toLowerCase(),
    displayName: user.data.name,
    bio: user.data.description ?? '',
    avatarUrl: user.data.profile_image_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.data.name)}`,
    verified: Boolean(user.data.verified),
    followers: formatCount(user.data.public_metrics?.followers_count),
    posts:
      posts.length > 0
        ? posts
        : [
            {
              externalId: `x-${user.data.id}`,
              content: `Live profile metadata captured from X for @${user.data.username}. Recent posts were not available for this token.`,
              likes: 'unknown',
              replies: 'unknown',
              capturedAt: new Date()
            }
          ]
  };
}

async function fetchInstagramProfile(username: string): Promise<SocialProfile> {
  const token = process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN;
  const businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const version = process.env.META_GRAPH_VERSION || 'v22.0';
  if (!token || !businessAccountId) {
    throw new SocialFetchError(
      'Add INSTAGRAM_GRAPH_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID before tracking live Instagram accounts.',
      'instagram_not_configured',
      503
    );
  }

  const handle = cleanHandle(username);
  const fields = [
    'id',
    'username',
    'name',
    'biography',
    'profile_picture_url',
    'followers_count',
    'media_count',
    'media.limit(5){id,caption,comments_count,like_count,media_type,media_url,timestamp}'
  ].join(',');
  const url = `https://graph.facebook.com/${version}/${businessAccountId}?fields=business_discovery.username(${encodeURIComponent(
    handle
  )}){${fields}}&access_token=${encodeURIComponent(token)}`;
  const result = await fetchJson<{
    business_discovery?: {
      id: string;
      username: string;
      name?: string;
      biography?: string;
      profile_picture_url?: string;
      followers_count?: number;
      media?: {
        data?: Array<{
          id: string;
          caption?: string;
          comments_count?: number;
          like_count?: number;
          media_url?: string;
          timestamp?: string;
        }>;
      };
    };
  }>(url, {}, 'instagram');

  const profile = result.business_discovery;
  if (!profile) {
    throw new SocialFetchError(`No Instagram Business or Creator account was found for @${handle}.`, 'social_not_found', 404);
  }

  return {
    platform: 'instagram',
    username: profile.username.toLowerCase(),
    displayName: profile.name || `@${profile.username}`,
    bio: profile.biography ?? '',
    avatarUrl:
      profile.profile_picture_url ??
      `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(profile.name || profile.username)}`,
    verified: false,
    followers: formatCount(profile.followers_count),
    posts:
      profile.media?.data?.map((post) => ({
        externalId: post.id,
        content: post.caption || 'Instagram media without a caption.',
        likes: formatCount(post.like_count),
        replies: formatCount(post.comments_count),
        mediaUrl: post.media_url,
        capturedAt: post.timestamp ? new Date(post.timestamp) : new Date()
      })) ?? []
  };
}

export async function fetchSocialProfile(platform: Platform, username: string) {
  return platform === 'x' ? fetchXProfile(username) : fetchInstagramProfile(username);
}

export function socialErrorResponse(error: unknown) {
  if (error instanceof SocialFetchError) {
    return { code: error.code, message: error.message, status: error.status };
  }
  return {
    code: 'social_lookup_failed',
    message: 'The live account lookup failed before a dossier could be opened.',
    status: 502
  };
}
