import { ok } from '@/lib/api';
import { cached } from '@/lib/cache';
import { deriveProfileMetrics } from '@/lib/profileData';
import * as accountsRepo from '@/lib/repos/accounts';

function avatarFor(account: accountsRepo.AccountRecord) {
  return (
    account.avatarUrl ||
    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(account.displayName || account.username)}`
  );
}

export async function GET() {
  const items = await cached('shosha:v1:impact:rising-makers', 60, async () => {
    const accounts = await accountsRepo.listEvery().catch(() => []);
    const eligible = accounts
      .filter((account) => !account.archived)
      .map((account) => ({ account, metrics: deriveProfileMetrics(account) }))
      .filter(({ metrics }) => metrics.weeklyDelta > 0)
      .sort((a, b) => b.metrics.weeklyDelta - a.metrics.weeklyDelta)
      .slice(0, 8);

    return eligible
      .map((account) => ({
        id: account.account._id,
        displayName: account.account.displayName.replace(/^@/, ''),
        avatarUrl: avatarFor(account.account),
        weeklyDelta: account.metrics.weeklyDelta,
      }));
  });

  return ok(items);
}
