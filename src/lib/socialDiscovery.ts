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
  reason?: string;
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

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
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
        try {
          return JSON.parse(candidate.slice(start, i + 1));
        } catch {
          return {};
        }
      }
    }
  }
  return {};
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

  const platform =
    item.platform && ['x', 'instagram', 'facebook', 'youtube', 'tiktok', 'linkedin', 'website'].includes(item.platform)
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

export async function discoverSocialAccounts(query: string): Promise<SocialDiscoveryResult> {
  const cleaned = cleanQuery(query);
  if (cleaned.length < 2) {
    return { candidates: [], sources: [], searchQueries: [], grounded: false };
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return {
      candidates: [],
      sources: [],
      searchQueries: [],
      grounded: false,
      reason: 'discovery_unavailable'
    };
  }

  const primary = process.env.GEMINI_DISCOVERY_MODEL || 'gemini-2.5-pro';
  const fallback = 'gemini-2.5-flash';

  const prompt = `You are a research analyst. Find ALL likely public social accounts for this person/brand/query: "${cleaned}".

PROCEDURE:
1. Use Google Search to look across Instagram, X (twitter.com or x.com), Facebook, YouTube, TikTok, LinkedIn, and personal websites/Wikipedia.
2. For each platform, find the canonical official profile URL. Open candidate URLs with the url_context tool to confirm the page belongs to the right person/brand.
3. Reject fan pages, parody, hashtag pages, scraper mirrors, and unrelated same-handle accounts.
4. Set confidence based on how clearly the source page confirms the identity:
   - 0.9–1.0: official verified, or a personal site that links to the handle.
   - 0.6–0.85: strong contextual evidence (matching photo, bio, news article links).
   - 0.3–0.55: plausible but unconfirmed.
   - <0.3: do not include.

RULES:
- Never invent URLs. Each sourceUrl must be a real page returned by search/url_context.
- Each candidate must include a real "reason" citing the evidence (e.g. "Linked from official Wikipedia article" or "Bio matches news coverage").
- Prefer profile pages over post URLs. Strip tracking params from URLs.

Return ONLY a JSON object matching the schema:
{
  "candidates": [
    {
      "platform": "instagram|facebook|x|youtube|tiktok|linkedin|website",
      "username": "handle-or-page-slug",
      "displayName": "public display name",
      "sourceUrl": "https://...",
      "bio": "short public descriptor",
      "followers": "1.2M",
      "verified": true,
      "confidence": 0.92,
      "reason": "Evidence-based justification"
    }
  ]
}`;

  // Use ONLY google_search; url_context fails on auth-walled platforms.
  // responseSchema is incompatible with grounding tools — rely on prompt + manual JSON extraction.
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.2
    }
  };

  let response: Response;
  try {
    response = await callGemini(primary, body, key);
    if (!response.ok && (response.status === 429 || response.status >= 500)) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      response = await callGemini(primary, body, key);
    }
    if (!response.ok && response.status >= 500 && primary !== fallback) {
      response = await callGemini(fallback, body, key);
    }
  } catch (err) {
    console.error('[socialDiscovery] network failure', err);
    return { candidates: [], sources: [], searchQueries: [], grounded: false, reason: 'gemini_network_error' };
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    console.error('[socialDiscovery] gemini error', response.status, errBody.slice(0, 500));
    return { candidates: [], sources: [], searchQueries: [], grounded: false, reason: 'gemini_error' };
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('\n') ?? '';

  const parsed = extractJsonObject(text) as { candidates?: unknown[] };

  const unique = new Map<string, SocialDiscoveryCandidate>();
  for (const item of parsed.candidates ?? []) {
    const candidate = normalizeCandidate(item, cleaned);
    if (candidate) {
      unique.set(`${candidate.platform}:${candidate.username}`, candidate);
    }
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
}
