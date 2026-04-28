import { ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import * as eventsRepo from '@/lib/repos/events';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return ok({ user: null, claimedAccounts: [], recentEvents: [] });

    const [claimedAccounts, recentEvents] = await Promise.all([
      Promise.all((user.claimedAccounts ?? []).slice(0, 10).map((id) => accountsRepo.findById(id))).catch(() => []),
      eventsRepo.listByReporter(user._id, 10).catch(() => [])
    ]);

    return ok({
      user,
      claimedAccounts: claimedAccounts.filter(Boolean),
      recentEvents
    });
  } catch (err) {
    console.error('[GET /api/me]', err);
    return ok({ user: null, claimedAccounts: [], recentEvents: [] });
  }
}
