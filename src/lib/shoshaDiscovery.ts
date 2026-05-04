import type { Platform } from '@/types';
import { generateGroundedJson } from '@/lib/gemini';

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
  { platform: 'linkedin', patterns: [/linkedin\.com/i] },
  { platform: 'reddit', patterns: [/reddit\.com/i] },
  { platform: 'snapchat', patterns: [/snapchat\.com/i] }
];

const platformValues: Platform[] = ['x', 'instagram', 'facebook', 'youtube', 'tiktok', 'linkedin', 'reddit', 'snapchat', 'website'];

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
          : parsed.hostname.includes('reddit.com') && ['u', 'user'].includes(parts[0])
            ? parts[1] ?? fallback
            : parsed.hostname.includes('snapchat.com') && parts[0] === 'add'
              ? parts[1] ?? fallback
              : parts[0] ?? fallback;
    return username.replace(/^@/, '');
  } catch {
    return fallback;
  }
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

  const platform = item.platform && platformValues.includes(item.platform) ? item.platform : platformFromUrl(sourceUrl);
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

export async function discoverSocialAccounts(query: string): Promise<SocialDiscoveryResult> {
  const cleaned = cleanQuery(query);
  if (cleaned.length < 2) {
    return { candidates: [], sources: [], searchQueries: [], grounded: false };
  }

  const prompt = `You are Shosha discovery. Find likely official public social accounts for this person, brand, or query: "${cleaned}".

Search across Instagram, X/Twitter, Facebook, YouTube, TikTok, LinkedIn, Reddit, Snapchat, personal websites, and Wikipedia.

Rules:
- Never invent URLs.
- Prefer canonical profile URLs over post URLs.
- Reject fan pages, hashtag pages, scraper mirrors, parody pages, and unrelated same-name profiles.
- Include only candidates with confidence >= 0.3.
- Use source evidence in "reason".
- Do not include private emails, phone numbers, DOB, age, disability, or private addresses.

Return only JSON:
{
  "candidates": [
    {
      "platform": "instagram|facebook|x|youtube|tiktok|linkedin|reddit|snapchat|website",
      "username": "handle-or-page-slug",
      "displayName": "public display name",
      "sourceUrl": "https://...",
      "bio": "short public descriptor",
      "followers": "1.2M",
      "verified": true,
      "confidence": 0.92,
      "reason": "evidence-based justification"
    }
  ]
}`;

  try {
    const result = await generateGroundedJson(prompt);
    const parsed = result.json as { candidates?: unknown[] };
    const unique = new Map<string, SocialDiscoveryCandidate>();
    for (const item of parsed.candidates ?? []) {
      const candidate = normalizeCandidate(item, cleaned);
      if (candidate) {
        unique.set(`${candidate.platform}:${candidate.username}`, candidate);
      }
    }

    return {
      candidates: Array.from(unique.values()).sort((a, b) => b.confidence - a.confidence).slice(0, 10),
      sources: result.sources,
      searchQueries: result.searchQueries,
      grounded: result.grounded
    };
  } catch (error) {
    console.error('[shosha-discovery] lookup failed', error);
    return { candidates: [], sources: [], searchQueries: [], grounded: false, reason: 'discovery_unavailable' };
  }
}

export type DiscoveredReport = {
  _id: string;
  type: 'positive' | 'negative';
  description: string;
  evidenceSourceUrl?: string;
  account: {
    _id: string;
    platform: Platform;
    username: string;
    displayName: string;
    verified: boolean;
  };
  reporter?: { username: string; name: string };
  category: string;
  deed: string;
  reportScore: number;
  aiVerdict?: { proposedImpact: number };
  createdAt: string;
};

export async function discoverReports(query: string): Promise<DiscoveredReport[]> {
  const cleaned = cleanQuery(query);
  if (cleaned.length < 2) return [];

  const prompt = `You are Shosha discovery. Find recent news, controversies, or notable actions involving the person or entity: "${cleaned}".

Rules:
- Search the web for actual events.
- Generate a summary as a "report".
- Categorize as positive (good deeds, philanthropy) or negative (controversy, legal issues, bad behavior).
- "account.platform" must be one of: instagram, facebook, x, youtube, tiktok, linkedin, reddit, snapchat, website.
- Include evidenceSourceUrl if available.

Return only JSON:
{
  "reports": [
    {
      "type": "positive|negative",
      "description": "Short headline/summary of the event",
      "evidenceSourceUrl": "https://news.example.com/...",
      "account": {
        "platform": "website",
        "username": "handle-or-slug",
        "displayName": "Person Name",
        "verified": true
      },
      "category": "controversy|philanthropy|business|community|etc",
      "deed": "short 2-3 word deed",
      "reportScore": 5
    }
  ]
}`;

  try {
    const result = await generateGroundedJson(prompt);
    const parsed = result.json as { reports?: any[] };
    if (!parsed.reports || !Array.isArray(parsed.reports)) return [];

    return parsed.reports.map((r, i) => ({
      _id: `discovery-${Date.now()}-${i}`,
      type: r.type === 'positive' ? 'positive' : 'negative',
      description: String(r.description || 'Discovered event').slice(0, 200),
      evidenceSourceUrl: r.evidenceSourceUrl ? String(r.evidenceSourceUrl) : undefined,
      account: {
        _id: `discovered-acc-${Date.now()}-${i}`,
        platform: platformValues.includes(r.account?.platform) ? r.account.platform : 'website',
        username: String(r.account?.username || cleaned).replace(/^@/, ''),
        displayName: String(r.account?.displayName || cleaned),
        verified: Boolean(r.account?.verified),
      },
      reporter: { username: 'shosha_ai', name: 'Shosha Discovery' },
      category: String(r.category || 'News').slice(0, 30),
      deed: String(r.deed || 'Event').slice(0, 30),
      reportScore: Number(r.reportScore) || 0,
      aiVerdict: { proposedImpact: Number(r.reportScore) || 0 },
      createdAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[shosha-discovery] report lookup failed', error);
    return [];
  }
}
