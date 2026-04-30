import { fail, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { replayUserLedger } from '@/lib/services/ledgerReplay';
import { replayAccountLedger } from '@/lib/services/accountScoreReplay';

// POST /api/me/score/replay — recompute the current user's ledger from their
// claimed accounts' approved reports using the new Δ formula.
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail('unauthorized', 'Sign in to recalculate your score.', 401);
    const [userResult, accountResults] = await Promise.all([
      replayUserLedger(user._id),
      Promise.all((user.claimedAccounts ?? []).map((accountId) => replayAccountLedger(accountId).catch(() => null))),
    ]);
    if (!userResult) return fail('not_found', 'User not found.', 404);
    return ok({ userResult, accountResults: accountResults.filter(Boolean) });
  } catch (err) {
    console.error('[POST /api/me/score/replay]', err);
    return fail('internal', 'Could not replay ledger.', 500);
  }
}
