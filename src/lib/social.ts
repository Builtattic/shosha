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
  sourceUrl?: string;
  posts: SocialPost[];
};

export type SocialProfileSeed = {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  followers?: string;
  verified?: boolean;
  sourceUrl?: string;
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
  return username
    .trim()
    .replace(/^@/, '')
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9_.-]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function mockSocialProfile(platform: Platform, rawUsername: string): SocialProfile {
  const username = cleanHandle(rawUsername);
  const seed = hashSeed(`${platform}:${username}`);
  const followersBase = (seed % 9000) + 250;
  const followers = followersBase >= 1000 ? `${(followersBase / 1000).toFixed(1)}k` : String(followersBase);
  const displayName = username
    .replace(/[._]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) || username;
  const avatarUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName)}`;
  const bios = [
    'Public profile under live observation by the local Shosha emulator.',
    'Local mock dossier — connect a real X / Instagram token to swap in live data.',
    'Mocked record. Receipts, captures, and filings still work end-to-end.'
  ];
  const sampleContents = [
    `Heads down on a community drop today — full thread later. (mock for @${username})`,
    `Posted the public response and the receipts. We will keep adding context. (mock for @${username})`,
    `Quiet weekend, big follow-ups landing Monday. Notes coming. (mock for @${username})`
  ];

  return {
    platform,
    username,
    displayName,
    bio: bios[seed % bios.length],
    avatarUrl,
    verified: seed % 5 === 0,
    followers,
    posts: sampleContents.map((content, index) => ({
      externalId: `mock-${platform}-${username}-${index}`,
      content,
      likes: String(((seed + index * 7) % 4000) + 50),
      replies: String(((seed + index * 3) % 250) + 5),
      capturedAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000)
    }))
  };
}

function seededSocialProfile(platform: Platform, rawUsername: string, seed?: SocialProfileSeed): SocialProfile {
  const fallback = mockSocialProfile(platform, rawUsername);
  const username = cleanHandle(rawUsername);
  const displayName = seed?.displayName?.trim() || fallback.displayName;
  return {
    ...fallback,
    platform,
    username,
    displayName,
    bio: seed?.bio?.trim() || fallback.bio,
    avatarUrl: seed?.avatarUrl || fallback.avatarUrl,
    verified: seed?.verified ?? fallback.verified,
    followers: seed?.followers || fallback.followers,
    sourceUrl: seed?.sourceUrl,
    posts: [
      {
        externalId: `profile-${platform}-${username}`,
        content: seed?.sourceUrl
          ? `Public profile candidate captured from ${seed.sourceUrl}.`
          : `Public profile candidate captured for @${username}.`,
        likes: 'unknown',
        replies: 'unknown',
        mediaUrl: seed?.avatarUrl,
        capturedAt: new Date()
      },
      ...fallback.posts.slice(0, 2)
    ]
  };
}

function platformConfigured(platform: Platform): boolean {
  if (platform === 'x') return Boolean(process.env.X_BEARER_TOKEN);
  if (platform === 'instagram') {
    return Boolean(process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID);
  }
  return false;
}

async function fetchProfileViaGemini(platform: Platform, username: string, seed?: SocialProfileSeed): Promise<SocialProfile> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new SocialFetchError('Add GEMINI_API_KEY to enable AI-powered profile fetching.', 'gemini_not_configured', 503);

  const handle = cleanHandle(username);
  const model = process.env.GEMINI_DISCOVERY_MODEL || 'gemini-2.5-flash';
  
  const prompt = `Search for the public ${platform} profile of "@${handle}" (or their likely real identity if the handle is slightly different). 
Return ONLY strict JSON representing their profile. Include recent posts if you can find them.
Shape:
{
  "displayName": "Full Name",
  "bio": "Their public bio",
  "followers": "e.g. '1.2M' or '50k'",
  "verified": true/false,
  "posts": [
    {
      "content": "Text of a recent post or description of recent activity",
      "likes": "10k",
      "replies": "500"
    }
  ]
}
If you cannot find the account, return an empty bio.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });

  if (!response.ok) {
    throw new SocialFetchError('Gemini API failed to fetch the profile.', 'gemini_error', 502);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? '').join('\n') ?? '';
  
  let parsed: any = {};
  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = fenced?.[1] ?? text;
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      parsed = JSON.parse(raw.slice(start, end + 1));
    }
  } catch {
    parsed = {};
  }

  const displayName = parsed.displayName || seed?.displayName || handle;
  
  return {
    platform,
    username: handle,
    displayName,
    bio: parsed.bio || seed?.bio || `AI-generated profile summary for @${handle} on ${platform}.`,
    avatarUrl: seed?.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
    verified: Boolean(parsed.verified || seed?.verified),
    followers: parsed.followers || seed?.followers || 'unknown',
    sourceUrl: seed?.sourceUrl,
    posts: (parsed.posts || []).map((p: any, i: number) => ({
      externalId: `ai-${platform}-${handle}-${i}`,
      content: p.content || 'Content not available.',
      likes: p.likes || 'unknown',
      replies: p.replies || 'unknown',
      capturedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    }))
  };
}

export async function fetchSocialProfile(platform: Platform, username: string, seed?: SocialProfileSeed) {
  if (platform !== 'x' && platform !== 'instagram') {
    return seededSocialProfile(platform, username, seed);
  }
  
  if (!platformConfigured(platform)) {
    if (process.env.GEMINI_API_KEY) {
      try {
        const aiProfile = await fetchProfileViaGemini(platform, username, seed);
        if (aiProfile.posts.length === 0) {
           aiProfile.posts = seededSocialProfile(platform, username, seed).posts;
        }
        return aiProfile;
      } catch (err) {
        return seededSocialProfile(platform, username, seed);
      }
    }
    return seededSocialProfile(platform, username, seed);
  }
  
  try {
    return await (platform === 'x' ? fetchXProfile(username) : fetchInstagramProfile(username));
  } catch (error) {
    if (seed?.sourceUrl) return seededSocialProfile(platform, username, seed);
    throw error;
  }
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
