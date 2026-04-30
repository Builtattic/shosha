import { generateGroundedJson } from '@/lib/gemini';
import type { AccountRecord, AccountSocialLink } from '@/lib/repos/accounts';
import type { Platform } from '@/types';

const platforms: Platform[] = ['x', 'instagram', 'facebook', 'youtube', 'tiktok', 'linkedin', 'reddit', 'snapchat', 'website'];

type RawEnrichment = {
  bio?: string;
  role?: string;
  region?: string;
  quote?: string;
  avatarUrl?: string;
  followers?: string;
  verified?: boolean;
  evidenceSummary?: string;
  socialLinks?: Partial<Record<Platform, Partial<AccountSocialLink>>>;
};

function cleanString(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : undefined;
}

function cleanUrl(value: unknown) {
  if (typeof value !== 'string') return undefined;
  try {
    return new URL(value).toString();
  } catch {
    return undefined;
  }
}

function normalizeSocialLinks(input: RawEnrichment['socialLinks']) {
  const links: Partial<Record<Platform, AccountSocialLink>> = {};
  if (!input || typeof input !== 'object') return links;

  for (const platform of platforms) {
    const raw = input[platform];
    const url = cleanUrl(raw?.url);
    if (!url) continue;
    const link: AccountSocialLink = {
      url,
      lastCheckedAt: new Date().toISOString(),
    };
    const username = cleanString(raw?.username, 100);
    const displayName = cleanString(raw?.displayName, 120);
    const followers = cleanString(raw?.followers, 24);
    const reason = cleanString(raw?.reason, 200);
    const sourceUrls = Array.isArray(raw?.sourceUrls)
      ? raw.sourceUrls.map(cleanUrl).filter((item): item is string => Boolean(item)).slice(0, 6)
      : [];
    if (username) link.username = username;
    if (displayName) link.displayName = displayName;
    if (followers) link.followers = followers;
    if (typeof raw?.verified === 'boolean') link.verified = raw.verified;
    if (Number.isFinite(Number(raw?.confidence))) link.confidence = Math.max(0, Math.min(1, Number(raw?.confidence)));
    if (reason) link.reason = reason;
    if (sourceUrls.length) link.sourceUrls = sourceUrls;
    links[platform] = link;
  }

  return links;
}

export function needsProfileEnrichment(account: AccountRecord) {
  return (
    account.profileKind === 'public_figure' &&
    account.enrichmentStatus !== 'reviewed' &&
    (!account.bio || !account.role || !account.region || !Object.keys(account.socialLinks ?? {}).length)
  );
}

export async function enrichPublicProfileDetails(account: AccountRecord): Promise<Partial<AccountRecord>> {
  const prompt = `You are Shosha profile enrichment. Use Google Search grounding to find public, source-backed details for this public profile.

Profile:
- Shosha ID: ${account.profileId ?? account._id}
- Name: ${account.displayName}
- Current username slug: ${account.username}

Search deeply across official websites, Wikipedia/Wikidata, news profiles, social platforms, and credible public sources.

Find:
- bio: dense factual one-paragraph public descriptor
- role: current public role/title/category
- region: broad public region/nationality/base only, never exact private address
- quote: a short public quote or defining public line only if source-backed
- avatarUrl: public image/profile image URL only if directly available in search grounding
- followers and verified status only when source-backed
- socialLinks for Instagram, X/Twitter, Facebook, YouTube, TikTok, LinkedIn, Reddit, Snapchat, and official website when likely official
- evidenceSummary: concise summary of what sources support

Rules:
- Public information only.
- Never include private contact data, private address, DOB, exact age, disability, family details, or speculation.
- Never invent URLs, followers, quotes, or verification.
- Prefer official/canonical social URLs.
- Mark each social link confidence from 0 to 1 and include sourceUrls where available.
- Return strict JSON only.

JSON schema:
{
  "bio": "string",
  "role": "string",
  "region": "string",
  "quote": "string",
  "avatarUrl": "https://...",
  "followers": "1.2M",
  "verified": true,
  "evidenceSummary": "string",
  "socialLinks": {
    "x": { "url": "https://x.com/...", "username": "handle", "displayName": "Name", "followers": "1.2M", "verified": true, "confidence": 0.9, "reason": "why official", "sourceUrls": ["https://..."] },
    "instagram": { "url": "https://www.instagram.com/...", "username": "handle", "displayName": "Name", "followers": "1.2M", "verified": true, "confidence": 0.9, "reason": "why official", "sourceUrls": ["https://..."] },
    "facebook": { "url": "https://www.facebook.com/...", "username": "page", "displayName": "Name", "followers": "1.2M", "verified": true, "confidence": 0.9, "reason": "why official", "sourceUrls": ["https://..."] },
    "youtube": { "url": "https://www.youtube.com/...", "username": "@handle", "displayName": "Name", "followers": "1.2M", "verified": true, "confidence": 0.9, "reason": "why official", "sourceUrls": ["https://..."] },
    "tiktok": { "url": "https://www.tiktok.com/@...", "username": "handle", "displayName": "Name", "followers": "1.2M", "verified": true, "confidence": 0.9, "reason": "why official", "sourceUrls": ["https://..."] },
    "linkedin": { "url": "https://www.linkedin.com/...", "username": "slug", "displayName": "Name", "followers": "1.2M", "verified": true, "confidence": 0.9, "reason": "why official", "sourceUrls": ["https://..."] },
    "reddit": { "url": "https://www.reddit.com/...", "username": "handle", "displayName": "Name", "followers": "1.2M", "verified": true, "confidence": 0.9, "reason": "why official", "sourceUrls": ["https://..."] },
    "snapchat": { "url": "https://www.snapchat.com/add/...", "username": "handle", "displayName": "Name", "followers": "1.2M", "verified": true, "confidence": 0.9, "reason": "why official", "sourceUrls": ["https://..."] },
    "website": { "url": "https://...", "displayName": "Official website", "confidence": 0.9, "reason": "why official", "sourceUrls": ["https://..."] }
  }
}`;

  const result = await generateGroundedJson(prompt, 75_000);
  const parsed = result.json as RawEnrichment;
  const patch: Partial<AccountRecord> = {
    enrichmentStatus: 'reviewed',
  };

  const bio = cleanString(parsed.bio, 280);
  const role = cleanString(parsed.role, 120);
  const region = cleanString(parsed.region, 120);
  const quote = cleanString(parsed.quote, 280);
  const avatarUrl = cleanUrl(parsed.avatarUrl);
  const followers = cleanString(parsed.followers, 24);
  const evidenceSummary = cleanString(parsed.evidenceSummary, 500);
  const socialLinks = normalizeSocialLinks(parsed.socialLinks);

  if (bio) patch.bio = bio;
  if (role) patch.role = role;
  if (region) patch.region = region;
  if (quote) patch.quote = quote;
  if (avatarUrl) patch.avatarUrl = avatarUrl;
  if (followers) patch.followers = followers;
  if (typeof parsed.verified === 'boolean') patch.verified = parsed.verified;
  if (evidenceSummary) patch.evidenceSummary = evidenceSummary;
  if (Object.keys(socialLinks).length) patch.socialLinks = { ...(account.socialLinks ?? {}), ...socialLinks };

  if (Object.keys(patch).length === 1) {
    patch.enrichmentStatus = 'stale';
    patch.evidenceSummary = result.grounded
      ? 'Gemini search ran, but no source-backed profile details were returned.'
      : 'Gemini search could not ground this profile.';
  }

  return patch;
}
