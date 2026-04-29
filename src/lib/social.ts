import type { Platform } from '@/types';

type SocialPost = {
  externalId: string;
  content: string;
  likes: string;
  replies: string;
  mediaUrl?: string;
  permalink?: string;
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
  citations?: string[];
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

export class SocialFetchError extends Error {
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
      `https://api.x.com/2/users/${user.data.id}/tweets?max_results=10&exclude=retweets,replies&tweet.fields=created_at,public_metrics`,
      { headers: { Authorization: `Bearer ${token}` } },
      'x'
    );
    posts =
      timeline.data?.map((post) => ({
        externalId: post.id,
        content: post.text,
        likes: formatCount(post.public_metrics?.like_count),
        replies: formatCount(post.public_metrics?.reply_count),
        permalink: `https://x.com/${user.data!.username}/status/${post.id}`,
        capturedAt: post.created_at ? new Date(post.created_at) : new Date()
      })) ?? [];
  } catch {
    posts = [];
  }

  if (posts.length === 0) {
    // X returned the profile but not posts (token scope or empty timeline). Try Gemini grounding to fill posts.
    try {
      const grounded = await fetchProfileViaGemini('x', handle, {
        displayName: user.data.name,
        bio: user.data.description ?? '',
        avatarUrl: user.data.profile_image_url,
        verified: user.data.verified,
        followers: formatCount(user.data.public_metrics?.followers_count)
      });
      posts = grounded.posts;
    } catch {
      // fall through; we'll throw below if still empty
    }
  }

  if (posts.length === 0) {
    throw new SocialFetchError(
      `Found @${handle} on X but could not retrieve any recent public posts.`,
      'no_posts',
      502
    );
  }

  return {
    platform: 'x',
    username: user.data.username.toLowerCase(),
    displayName: user.data.name,
    bio: user.data.description ?? '',
    avatarUrl: user.data.profile_image_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.data.name)}`,
    verified: Boolean(user.data.verified),
    followers: formatCount(user.data.public_metrics?.followers_count),
    sourceUrl: `https://x.com/${user.data.username}`,
    posts
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
    'media.limit(10){id,caption,comments_count,like_count,media_type,media_url,permalink,timestamp}'
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
          permalink?: string;
          timestamp?: string;
        }>;
      };
    };
  }>(url, {}, 'instagram');

  const profile = result.business_discovery;
  if (!profile) {
    throw new SocialFetchError(`No Instagram Business or Creator account was found for @${handle}.`, 'social_not_found', 404);
  }

  const posts: SocialPost[] =
    profile.media?.data?.map((post) => ({
      externalId: post.id,
      content: post.caption ?? '',
      likes: formatCount(post.like_count),
      replies: formatCount(post.comments_count),
      mediaUrl: post.media_url,
      permalink: post.permalink,
      capturedAt: post.timestamp ? new Date(post.timestamp) : new Date()
    })) ?? [];

  if (posts.length === 0) {
    throw new SocialFetchError(
      `Found @${handle} on Instagram but no recent media is publicly visible.`,
      'no_posts',
      502
    );
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
    sourceUrl: `https://www.instagram.com/${profile.username}/`,
    posts
  };
}

const PLATFORM_DOMAIN: Record<Platform, string> = {
  x: 'x.com OR twitter.com',
  instagram: 'instagram.com',
  facebook: 'facebook.com',
  youtube: 'youtube.com',
  tiktok: 'tiktok.com',
  linkedin: 'linkedin.com',
  website: ''
};

function extractJsonObject(text: string): unknown {
  // Strip code fences first
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  // Find the largest balanced { ... } block
  const start = candidate.indexOf('{');
  if (start === -1) return {};
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < candidate.length; i += 1) {
    const ch = candidate[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        const slice = candidate.slice(start, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          return {};
        }
      }
    }
  }
  return {};
}

async function callGemini(model: string, body: unknown, key: string) {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key
    },
    body: JSON.stringify(body),
    cache: 'no-store'
  });
}

async function geminiWithRetry(primaryModel: string, fallbackModel: string, body: unknown, key: string): Promise<Response> {
  let response = await callGemini(primaryModel, body, key);
  if (response.ok) return response;

  if (response.status === 429 || response.status >= 500) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    response = await callGemini(primaryModel, body, key);
    if (response.ok) return response;
  }

  if (response.status >= 500 && primaryModel !== fallbackModel) {
    response = await callGemini(fallbackModel, body, key);
  }
  return response;
}

export async function fetchProfileViaGemini(
  platform: Platform,
  username: string,
  seed?: SocialProfileSeed
): Promise<SocialProfile> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new SocialFetchError('Add GEMINI_API_KEY to enable AI-powered profile fetching.', 'gemini_not_configured', 503);
  }

  const handle = cleanHandle(username);
  const primary = process.env.GEMINI_DISCOVERY_MODEL || 'gemini-2.5-pro';
  const fallback = 'gemini-2.5-flash';
  const platformDomain = PLATFORM_DOMAIN[platform];
  const platformLabel = platform === 'website' ? 'public personal website' : platform;

  const knownDisplayName = seed?.displayName ? ` (display name hint: "${seed.displayName}")` : '';
  const knownSource = seed?.sourceUrl ? `\nKnown source URL hint: ${seed.sourceUrl}` : '';

  const prompt = `You are a research analyst. Use Google Search grounding to gather REAL public information about the ${platformLabel} account "@${handle}"${knownDisplayName}.

PROCEDURE:
1. ${platformDomain ? `Run multiple Google Searches: \`site:${platformDomain} ${handle}\`, \`"${handle}" ${platform}\`, \`"@${handle}" bio\`, and the person's likely real name once you spot it.` : `Search for "${handle}" official website, Wikipedia, and recent news.`}
2. From the Google Search results (titles, snippets, knowledge graph cards, your own grounded knowledge), assemble:
   - displayName (the real public name shown on their profile or in news)
   - bio (a concise factual description from the search snippets, NOT paraphrased platitudes)
   - followers count if any snippet mentions one (e.g. "1.2M followers")
   - verified status if a snippet or knowledge card confirms it
   - avatarUrl if a search result image URL is available
   - sourceUrl: the canonical profile URL on ${platformLabel}
3. For posts: list the most recent 5-10 things this account has publicly said/posted that are reported in news articles, blog posts, or quoted in search snippets. Each "content" must be an actual quote or paraphrased headline of real recent activity from the snippets, NOT invented.
4. Cross-reference Wikipedia, news, and other sources to enrich.${knownSource}

CRITICAL RULES:
- Use ONLY information present in your Google Search grounding results. If a fact is not in the snippets/knowledge graph, omit the field entirely.
- Never invent post text, follower counts, or URLs.
- For "posts": each item should be a real quote, news-reported statement, or paraphrased recent public action — never a generic placeholder. If you cannot find at least one real recent activity, return posts: [] and only fill bio/displayName.
- If the account does not seem to exist at all, return {"displayName":"","bio":"","posts":[]}.
- Return ONLY JSON matching the schema, no prose.

Return JSON:
{
  "displayName": "Full Name",
  "bio": "factual public bio drawn from search results",
  "followers": "1.2M",
  "verified": true,
  "avatarUrl": "https://...",
  "sourceUrl": "https://${platformDomain ? platformDomain.split(' ')[0] : 'example.com'}/${handle}",
  "posts": [
    { "content": "Actual quote or news-reported recent activity", "likes": "12k", "replies": "300", "permalink": "https://...", "capturedAt": "2026-04-20T10:30:00Z" }
  ]
}`;

  // Use ONLY google_search — url_context fails on auth-walled platforms (IG, FB, TikTok, LinkedIn).
  // Google Search grounding gives us indexed snippets which is what those platforms expose publicly anyway.
  // NOTE: responseSchema is incompatible with grounding tools in v1beta; we rely on prompt + manual JSON extraction.
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.3
    }
  };

  const response = await geminiWithRetry(primary, fallback, body, key);

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    console.error('[gemini profile] failure', response.status, errBody.slice(0, 500));
    throw new SocialFetchError('Gemini grounding failed for this profile.', 'gemini_error', 502);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('\n') ?? '';

  const parsed = extractJsonObject(text) as {
    displayName?: string;
    bio?: string;
    followers?: string;
    verified?: boolean;
    avatarUrl?: string;
    sourceUrl?: string;
    posts?: Array<{ content?: string; likes?: string; replies?: string; permalink?: string; capturedAt?: string }>;
  };

  const posts: SocialPost[] = (parsed.posts ?? [])
    .filter((p) => typeof p.content === 'string' && p.content.trim().length > 0)
    .map((p, i) => {
      const captured = p.capturedAt ? new Date(p.capturedAt) : new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      return {
        externalId: p.permalink ? `gemini-${platform}-${handle}-${i}-${hashString(p.permalink)}` : `gemini-${platform}-${handle}-${i}`,
        content: p.content!.trim(),
        likes: p.likes && p.likes.trim() ? p.likes.trim() : 'unknown',
        replies: p.replies && p.replies.trim() ? p.replies.trim() : 'unknown',
        permalink: p.permalink,
        capturedAt: Number.isNaN(captured.valueOf()) ? new Date() : captured
      };
    });

  const bio = (parsed.bio ?? '').trim();
  const displayNameExtracted = (parsed.displayName ?? '').trim();
  // Only fail if we got literally nothing — no name, no bio, no posts.
  if (!bio && !displayNameExtracted && posts.length === 0) {
    throw new SocialFetchError(
      `Could not find a public ${platform} account for @${handle}. Try a more specific handle or include the person's name.`,
      'no_posts',
      404
    );
  }

  const grounding = payload?.candidates?.[0]?.groundingMetadata;
  const citations: string[] =
    grounding?.groundingChunks
      ?.map((chunk: { web?: { uri?: string } }) => chunk.web?.uri)
      .filter((uri: string | undefined): uri is string => Boolean(uri)) ?? [];

  const displayName = (parsed.displayName ?? '').trim() || seed?.displayName?.trim() || handle;
  const sourceUrl = parsed.sourceUrl?.trim() || seed?.sourceUrl;
  const avatarUrl =
    parsed.avatarUrl?.trim() ||
    seed?.avatarUrl ||
    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName)}`;

  return {
    platform,
    username: handle,
    displayName,
    bio: bio || seed?.bio?.trim() || '',
    avatarUrl,
    verified: Boolean(parsed.verified ?? seed?.verified),
    followers: (parsed.followers ?? '').trim() || seed?.followers?.trim() || 'unknown',
    sourceUrl,
    citations: citations.length ? Array.from(new Set(citations)).slice(0, 10) : undefined,
    posts
  };
}

function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export async function fetchSocialProfile(
  platform: Platform,
  username: string,
  seed?: SocialProfileSeed
): Promise<SocialProfile> {
  if (platform === 'x' && process.env.X_BEARER_TOKEN) {
    return fetchXProfile(username);
  }
  if (platform === 'instagram' && process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
    return fetchInstagramProfile(username);
  }
  // Every other case (IG without tokens, facebook, youtube, tiktok, linkedin, website) → strict Gemini grounding.
  return fetchProfileViaGemini(platform, username, seed);
}

export function socialErrorResponse(error: unknown) {
  if (error instanceof SocialFetchError) {
    return { code: error.code, message: error.message, status: error.status };
  }
  console.error('[social] unexpected lookup failure', error);
  return {
    code: 'social_lookup_failed',
    message: 'The live account lookup failed before a dossier could be opened.',
    status: 502
  };
}
