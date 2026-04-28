import type { Platform } from '@/types';

export type SocialDiscoveryCandidate = {
  platform: Platform;
  username: string;
  displayName: string;
  sourceUrl: string;
  bio: string;
  followers?: string;
  verified?: boolean;
  confidence: number;
  reason: string;
};

export type SocialDiscoveryResult = {
  candidates: SocialDiscoveryCandidate[];
  sources: Array<{ uri: string; title: string }>;
  searchQueries: string[];
  grounded: boolean;
};

const supportedHosts: Array<{ platform: Platform; patterns: RegExp[] }> = [
  { platform: 'instagram', patterns: [/instagram\.com/i] },
  { platform: 'facebook', patterns: [/(facebook|fb)\.com/i] },
  { platform: 'x', patterns: [/(^|\.)x\.com/i, /twitter\.com/i] },
  { platform: 'youtube', patterns: [/youtube\.com/i, /youtu\.be/i] },
  { platform: 'tiktok', patterns: [/tiktok\.com/i] },
  { platform: 'linkedin', patterns: [/linkedin\.com/i] }
];

function cleanQuery(query: string) {
  return query.trim().replace(/^@/, '').replace(/\s+/g, ' ').slice(0, 80);
}

function platformFromUrl(url: string): Platform {
  const match = supportedHosts.find((entry) => entry.patterns.some((pattern) => pattern.test(url)));
  return match?.platform ?? 'website';
}

export function usernameFromUrl(url: string, fallback: string) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const username =
      parsed.hostname.includes('youtube.com') && parts[0] === 'channel'
        ? parts[1] ?? fallback
        : parsed.hostname.includes('linkedin.com') && parts.length >= 2
          ? parts.slice(0, 2).join('-')
          : parts[0] ?? fallback;
    return username.replace(/^@/, '');
  } catch {
    return fallback;
  }
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('Gemini returned no JSON.');
  return JSON.parse(raw.slice(start, end + 1));
}

function normalizeCandidate(input: unknown, fallbackQuery: string): SocialDiscoveryCandidate | null {
  const item = input as Partial<SocialDiscoveryCandidate>;
  if (!item.sourceUrl || typeof item.sourceUrl !== 'string') return null;
  let sourceUrl: string;
  try {
    sourceUrl = new URL(item.sourceUrl).toString();
  } catch {
    return null;
  }

  const platform = item.platform && ['x', 'instagram', 'facebook', 'youtube', 'tiktok', 'linkedin', 'website'].includes(item.platform)
    ? item.platform
    : platformFromUrl(sourceUrl);
  const username = String(item.username || usernameFromUrl(sourceUrl, fallbackQuery))
    .replace(/^@/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '-')
    .slice(0, 100);
  if (!username) return null;

  return {
    platform,
    username,
    displayName: String(item.displayName || username).slice(0, 120),
    sourceUrl,
    bio: String(item.bio || '').slice(0, 280),
    followers: item.followers ? String(item.followers).slice(0, 24) : undefined,
    verified: Boolean(item.verified),
    confidence: Math.max(0, Math.min(1, Number(item.confidence ?? 0.5))),
    reason: String(item.reason || 'Matched from public search results.').slice(0, 200)
  };
}

function heuristicCandidates(query: string, reason = 'Set GEMINI_API_KEY to rank real public search results.'): SocialDiscoveryResult {
  const handle = cleanQuery(query).toLowerCase().replace(/[^a-z0-9_.-]+/g, '');
  if (!handle) return { candidates: [], sources: [], searchQueries: [], grounded: false };
  const candidates: SocialDiscoveryCandidate[] = ([
    ['instagram', `https://www.instagram.com/${handle}/`],
    ['x', `https://x.com/${handle}`],
    ['facebook', `https://www.facebook.com/${handle}`],
    ['youtube', `https://www.youtube.com/@${handle}`],
    ['tiktok', `https://www.tiktok.com/@${handle}`],
    ['linkedin', `https://www.linkedin.com/in/${handle}`]
  ] as Array<[Platform, string]>).map(([platform, sourceUrl]) => ({
    platform,
    username: handle,
    displayName: handle.replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    sourceUrl,
    bio: 'Candidate generated locally while Gemini search results are unavailable.',
    confidence: 0.25,
    reason
  }));
  return { candidates, sources: [], searchQueries: [], grounded: false };
}

export async function discoverSocialAccounts(query: string): Promise<SocialDiscoveryResult> {
  const cleaned = cleanQuery(query);
  if (cleaned.length < 2) return { candidates: [], sources: [], searchQueries: [], grounded: false };

  const key = process.env.GEMINI_API_KEY;
  if (!key) return heuristicCandidates(cleaned);

  const model = process.env.GEMINI_DISCOVERY_MODEL || 'gemini-2.5-flash';
  const prompt = `Find likely official or most relevant public social media accounts for this person/brand/query: "${cleaned}".

Search across Instagram, Facebook, X/Twitter, YouTube, TikTok, LinkedIn, and official websites.
Return only strict JSON with this shape:
{
  "candidates": [
    {
      "platform": "instagram|facebook|x|youtube|tiktok|linkedin|website",
      "username": "handle-or-page-slug",
      "displayName": "public display name",
      "sourceUrl": "https://...",
      "bio": "short public descriptor",
      "followers": "public follower/subscriber count if visible",
      "verified": true,
      "confidence": 0.0,
      "reason": "why this is likely the right account"
    }
  ]
}
Rank exact official profiles first. Do not invent URLs. Prefer profile pages over posts, hashtag pages, fan pages, or scraper mirrors.`;

  try {
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

    if (!response.ok) return heuristicCandidates(cleaned, 'Gemini Search grounding was unavailable, so this is a local handle guess.');
    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('\n') ?? '';
    const parsed = extractJson(text) as { candidates?: unknown[] };
    const unique = new Map<string, SocialDiscoveryCandidate>();
    for (const item of parsed.candidates ?? []) {
      const candidate = normalizeCandidate(item, cleaned);
      if (candidate) unique.set(`${candidate.platform}:${candidate.username}`, candidate);
    }

    const grounding = payload?.candidates?.[0]?.groundingMetadata;
    const sources =
      grounding?.groundingChunks
        ?.map((chunk: { web?: { uri?: string; title?: string } }) => ({
          uri: chunk.web?.uri,
          title: chunk.web?.title
        }))
        .filter((source: { uri?: string; title?: string }) => source.uri && source.title) ?? [];

    return {
      candidates: Array.from(unique.values()).sort((a, b) => b.confidence - a.confidence).slice(0, 8),
      sources,
      searchQueries: grounding?.webSearchQueries ?? [],
      grounded: Boolean(grounding)
    };
  } catch {
    return heuristicCandidates(cleaned, 'Gemini Search grounding failed, so this is a local handle guess.');
  }
}
