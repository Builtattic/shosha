import { ok, fail } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import * as usersRepo from '@/lib/repos/users';
import { calcCredibility } from '@/lib/credibility';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Must be signed in', 401);
  if (!isAdmin(user)) return fail('forbidden', 'Admin only.', 403);

  // Mark verification on any claimed website account so the public profile reflects it.
  const claimed = await accountsRepo.listClaimedBy(user._id);
  const websiteAccount = claimed.find(a => a.platform === 'website');
  if (websiteAccount) {
    await accountsRepo.update(websiteAccount._id, {
      trustBadge: true,
      credibility: 100,
    });
  }

  // Promote the AppUser: trustBadge + recompute credibility (now uncapped to 100).
  const merged = { ...user, trustBadge: true } as Record<string, unknown>;
  const cred = calcCredibility({
    name: merged.name as string | undefined,
    username: merged.username as string | undefined,
    phone: merged.phone as string | undefined,
    dob: merged.dob as string | undefined,
    city: merged.city as string | undefined,
    country: merged.country as string | undefined,
    occupationRole: merged.occupationRole as string | undefined,
    networkSize: merged.networkSize as string | undefined,
    education: merged.education as string | undefined,
    specializedField: merged.specializedField as string | undefined,
    managesMoneyPeopleSystem: merged.managesMoneyPeopleSystem as string | undefined,
    physicalIntellectualLimitations: merged.physicalIntellectualLimitations as string | undefined,
    igUrl: merged.igUrl as string | undefined,
    tiktokUrl: merged.tiktokUrl as string | undefined,
    xUrl: merged.xUrl as string | undefined,
    linkedinUrl: merged.linkedinUrl as string | undefined,
    redditUrl: merged.redditUrl as string | undefined,
    ytUrl: merged.ytUrl as string | undefined,
    fbUrl: merged.fbUrl as string | undefined,
    snapchatUrl: merged.snapchatUrl as string | undefined,
    photoUrl: merged.photoUrl as string | undefined,
    bio: merged.bio as string | undefined,
    quote: merged.quote as string | undefined,
    trustBadge: true,
  });

  await usersRepo.update(user._id, {
    trustBadge: true,
    trustBadgeAt: new Date().toISOString(),
    credibility: cred.total,
  });

  return ok({ success: true, credibility: cred.total });
}
