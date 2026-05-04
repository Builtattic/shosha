import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { averageBreakdown, BASE_SCORE } from '@/lib/scoring';
import { accountCreateSchema, idSchema } from '@/lib/validators';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as accountsRepo from '@/lib/repos/accounts';

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can list accounts.', 403);
  const accounts = await accountsRepo.listAll(500);
  return ok(accounts);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can create accounts.', 403);
  const json = await request.json().catch(() => null);
  const parsed = accountCreateSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const trimmedProfileId = parsed.data.profileId?.trim();
  let accountId: string;
  if (trimmedProfileId) {
    const idParsed = idSchema.safeParse(trimmedProfileId);
    if (!idParsed.success) return fail('invalid_input', 'Profile ID must be a safe id (letters, numbers, _.-).', 400);
    accountId = trimmedProfileId;
    const existsById = await accountsRepo.findById(accountId);
    if (existsById) return ok(existsById, 200);
  } else {
    const existing = await accountsRepo.findByPlatformUsername(parsed.data.platform, parsed.data.username);
    if (existing) return ok(existing, 200);
    accountId = accountsRepo.deriveId(parsed.data.platform, parsed.data.username);
  }

  const socialLinks = {
    ...(parsed.data.socialLinks ?? {}),
    ...(parsed.data.sourceUrl
      ? {
          [parsed.data.platform]: {
            url: parsed.data.sourceUrl,
            username: parsed.data.username,
            displayName: parsed.data.displayName ?? parsed.data.username,
            followers: parsed.data.followers ?? '0',
            verified: parsed.data.verified ?? false,
            lastCheckedAt: new Date().toISOString()
          }
        }
      : {})
  };

  const credibility = parsed.data.credibility ?? 80;
  const profileCompletion = parsed.data.profileCompletion ?? credibility;

  const account = await accountsRepo.createWithId(accountId, {
    platform: parsed.data.platform,
    username: parsed.data.username,
    displayName: parsed.data.displayName ?? parsed.data.username,
    bio: parsed.data.bio ?? '',
    avatarUrl: parsed.data.avatarUrl ?? '',
    verified: parsed.data.verified ?? false,
    followers: parsed.data.followers ?? '0',
    profileId: parsed.data.profileId?.trim() || undefined,
    profileKind: parsed.data.profileKind ?? 'standard',
    claimable: parsed.data.claimable ?? true,
    credibility,
    profileCompletion,
    enrichmentStatus: parsed.data.enrichmentStatus ?? 'none',
    role: parsed.data.role,
    region: parsed.data.region,
    quote: parsed.data.quote,
    email: parsed.data.email,
    phone: parsed.data.phone,
    dob: parsed.data.dob,
    age: parsed.data.age,
    cityCountry: parsed.data.cityCountry,
    profileUserType: parsed.data.profileUserType,
    reach: parsed.data.reach ?? parsed.data.followers,
    educationWorkbook: parsed.data.educationWorkbook,
    specializedFieldWorkbook: parsed.data.specializedFieldWorkbook,
    managementWorkbook: parsed.data.managementWorkbook,
    disability: parsed.data.disability,
    lifestyle: parsed.data.lifestyle,
    socialPostCount: parsed.data.socialPostCount,
    opposedPosts: parsed.data.opposedPosts,
    aiFlaggedPosts: parsed.data.aiFlaggedPosts,
    disputedPosts: parsed.data.disputedPosts,
    disputesLost: parsed.data.disputesLost,
    socialLinks: socialLinks as never,
    evidenceSummary: parsed.data.evidenceSummary,
    score: BASE_SCORE,
    scoreHistory: [{ t: new Date().toISOString(), s: BASE_SCORE, cause: 'seed' }],
    breakdown: averageBreakdown(),
    posts: [],
    claimed: false,
    claimedBy: null,
  });
  await adminActionsRepo.create({ actor: user!, action: 'account.create', entityType: 'account', entityId: account._id, after: account }).catch(() => {});
  return ok(account, 201);
}
