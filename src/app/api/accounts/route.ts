import { fail, fromZod, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { accountCreateSchema } from '@/lib/validators';
import { averageBreakdown, BASE_SCORE } from '@/lib/scoring';
import { fetchSocialProfile, socialErrorResponse, type SocialProfile } from '@/lib/social';
import * as accountsRepo from '@/lib/repos/accounts';

function toAbsoluteUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function deriveUsernameFromUrl(url: string, fallback: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/^\//, '').split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last.replace(/^@/, '').slice(0, 100);
  } catch {
    /* ignore */
  }
  return fallback;
}

export async function GET() {
  const accounts = await accountsRepo.listTop(50);
  return ok(accounts);
}

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch {
    return fail('unauthorized', 'Sign in before opening a new dossier.', 401);
  }

  const json = await request.json().catch(() => null);
  const parsed = accountCreateSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const existing = await accountsRepo.findByPlatformUsername(parsed.data.platform, parsed.data.username);
  if (existing) return ok(existing, 200);

  const effectiveSource = parsed.data.sourceUrl ?? parsed.data.socialUrl;

  if (effectiveSource) {
    const byUrl = await accountsRepo.findBySocialUrl(effectiveSource);
    if (byUrl) return ok(byUrl, 200);
  }

  if (parsed.data.displayName) {
    const byName = await accountsRepo.findByDisplayName(parsed.data.displayName);
    if (byName && !byName.claimedBy) {
      if (effectiveSource) {
        const mergedSocial = {
          ...(byName.socialLinks ?? {}),
          [parsed.data.platform]: {
            ...(byName.socialLinks?.[parsed.data.platform] ?? {}),
            url: effectiveSource,
            username: parsed.data.username,
            displayName: parsed.data.displayName ?? byName.displayName,
            followers: parsed.data.followers ?? byName.followers,
            verified: parsed.data.verified ?? byName.verified,
            lastCheckedAt: new Date().toISOString()
          }
        };
        await accountsRepo.update(byName._id, { socialLinks: mergedSocial as never });
        const refreshed = await accountsRepo.findById(byName._id);
        return ok(refreshed!, 200);
      }
      return ok(byName, 200);
    }
  }

  let profile: SocialProfile;
  const fallbackProfile = () => {
    const displayName = parsed.data.displayName ?? parsed.data.username;
    return {
      platform: parsed.data.platform,
      username: parsed.data.username,
      displayName,
      bio: parsed.data.bio ?? '',
      avatarUrl:
        parsed.data.avatarUrl ??
        `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
      verified: parsed.data.verified ?? false,
      followers: parsed.data.followers ?? 'unknown',
      sourceUrl: effectiveSource,
      posts: []
    };
  };

  if (parsed.data.skipDiscovery && parsed.data.displayName) {
    profile = fallbackProfile();
  } else {
    try {
      profile = await fetchSocialProfile(parsed.data.platform, parsed.data.username, {
        displayName: parsed.data.displayName,
        bio: parsed.data.bio,
        avatarUrl: parsed.data.avatarUrl,
        followers: parsed.data.followers,
        verified: parsed.data.verified,
        sourceUrl: effectiveSource
      });
    } catch (error) {
      if (parsed.data.displayName || effectiveSource) {
        profile = fallbackProfile();
      } else {
        const response = socialErrorResponse(error);
        return fail(response.code, response.message, response.status);
      }
    }
  }

  const displayName = parsed.data.displayName ?? profile.displayName;
  const sourceUrl = profile.sourceUrl ?? effectiveSource;
  const socialLinks = {
    ...(parsed.data.socialLinks ?? {}),
    ...(sourceUrl
      ? {
          [profile.platform]: {
            url: sourceUrl,
            username: profile.username,
            displayName,
            followers: profile.followers,
            verified: profile.verified,
            lastCheckedAt: new Date().toISOString()
          }
        }
      : {})
  };

  let account = await accountsRepo.create({
    platform: profile.platform,
    username: profile.username,
    displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    verified: profile.verified,
    followers: profile.followers,
    profileId: parsed.data.profileId,
    profileKind: parsed.data.profileKind ?? 'standard',
    claimable: parsed.data.claimable ?? true,
    credibility: parsed.data.credibility ?? 80,
    enrichmentStatus: parsed.data.enrichmentStatus ?? 'none',
    role: parsed.data.role,
    region: parsed.data.region,
    quote: parsed.data.quote,
    socialLinks: socialLinks as never,
    evidenceSummary: parsed.data.evidenceSummary,
    email: parsed.data.email,
    score: BASE_SCORE,
    scoreHistory: [{ t: new Date().toISOString(), s: BASE_SCORE, cause: 'seed' }],
    breakdown: averageBreakdown(),
    posts: profile.posts.map((post) => ({
      externalId: post.externalId,
      content: post.content,
      likes: post.likes,
      replies: post.replies,
      mediaUrl: post.mediaUrl,
      capturedAt: post.capturedAt instanceof Date ? post.capturedAt.toISOString() : String(post.capturedAt)
    })),
    claimed: false,
    claimedBy: null
  });

  const extras = parsed.data.additionalSocialLinks;
  if (extras?.length) {
    const merged = { ...(account.socialLinks ?? {}) } as Record<string, { url: string; username?: string; lastCheckedAt?: string }>;
    for (const row of extras) {
      const url = toAbsoluteUrl(row.url);
      const username = deriveUsernameFromUrl(url, parsed.data.username);
      merged[row.platform] = {
        ...merged[row.platform],
        url,
        username,
        lastCheckedAt: new Date().toISOString()
      };
    }
    const updated = await accountsRepo.update(account._id, { socialLinks: merged as never });
    account = updated!;
  }

  return ok(account, 201);
}
