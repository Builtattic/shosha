import { ok } from '@/lib/api';
import { cached } from '@/lib/cache';
import * as accountsRepo from '@/lib/repos/accounts';
import { BASE_SCORE } from '@/lib/scoring';

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  const data = await cached('shosha:v1:people:trending', 60, async () => {
    const accounts = await accountsRepo.listTop(10).catch(() => []);
    const eligible = accounts.filter(a => !a.archived).slice(0, 10);

    const items = eligible.map(account => ({
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
