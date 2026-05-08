import { ok, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Must be signed in', 401);

  const claimed = await accountsRepo.listClaimedBy(user._id);
  const websiteAccount = claimed.find(a => a.platform === 'website');

  if (websiteAccount) {
    await accountsRepo.update(websiteAccount._id, {
      trustBadge: true,
      credibility: 100
    });
  }

  return ok({ success: true });
}
