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
    return accounts
      .filter((account) => !account.archived)
      .map((account) => ({
        id: account._id,
        displayName: account.displayName.replace(/^@/, ''),
        avatarUrl: avatarFor(account),
        weeklyDelta: deriveProfileMetrics(account).weeklyDelta,
      }))
      .sort((a, b) => b.weeklyDelta - a.weeklyDelta)
      .slice(0, 8);
  });

  return ok(items);
}
