import { fail, fromZod, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { accountCreateSchema } from '@/lib/validators';
import { averageBreakdown, BASE_SCORE } from '@/lib/scoring';
import { fetchSocialProfile, socialErrorResponse } from '@/lib/social';
import * as accountsRepo from '@/lib/repos/accounts';

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

  let profile;
  try {
    profile = await fetchSocialProfile(parsed.data.platform, parsed.data.username, {
      displayName: parsed.data.displayName,
      bio: parsed.data.bio,
      avatarUrl: parsed.data.avatarUrl,
      followers: parsed.data.followers,
      verified: parsed.data.verified,
      sourceUrl: parsed.data.sourceUrl
    });
  } catch (error) {
    const response = socialErrorResponse(error);
    return fail(response.code, response.message, response.status);
  }

  const displayName = parsed.data.displayName ?? profile.displayName;
  const account = await accountsRepo.create({
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
    socialLinks: parsed.data.socialLinks as never,
    evidenceSummary: parsed.data.evidenceSummary,
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

  return ok(account, 201);
}
