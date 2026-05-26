import { ok } from '@/lib/api';
import { cached } from '@/lib/cache';
import { deriveProfileMetrics } from '@/lib/profileData';
import * as accountsRepo from '@/lib/repos/accounts';
import { BASE_SCORE } from '@/lib/scoring';

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  const data = await cached('shosha:v1:people:trending', 60, async () => {
    const accounts = await accountsRepo.listTop(50).catch(() => []);
    const activeAccounts = accounts.filter((account) => !account.archived);
    const momentumAccounts = activeAccounts
      .map((account) => ({ account, weeklyDelta: deriveProfileMetrics(account).weeklyDelta }))
      .filter((candidate) => candidate.weeklyDelta > 0)
      .sort((a, b) => b.weeklyDelta - a.weeklyDelta)
      .slice(0, 10)
      .map((candidate) => candidate.account);

    const eligible = momentumAccounts.length < 3 ? activeAccounts.slice(0, 10) : momentumAccounts;

    const items = eligible.map((account) => ({
      id: account._id,
      name: account.displayName.replace(/^@/, ''),
      handle: account.username.replace(/^@/, ''),
      avatar:
        account.avatarUrl ||
        `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(account.displayName || account.username)}`,
      platform: account.platform,
      role: account.role || account.profileKind || 'Public Profile',
      score: account.displayScore ?? account.score ?? BASE_SCORE,
      verified: Boolean(account.verified),
      claimedBy: account.claimedBy ?? null,
    }));

    return { items };
  });

  return ok(data);
}
