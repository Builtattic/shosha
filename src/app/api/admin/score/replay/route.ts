import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { replayAllLedgers, replayUserLedger } from '@/lib/services/ledgerReplay';
import { replayAccountLedger, replayAllAccountLedgers } from '@/lib/services/accountScoreReplay';

// POST /api/admin/score/replay
//   body: { userId?: string, accountId?: string }.
//   If omitted, replays every account/profile ledger and every user's claimed-account ledger.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Admins only.', 403);

  const body = await req.json().catch(() => ({}));
  const userId = typeof body?.userId === 'string' ? body.userId : null;
  const accountId = typeof body?.accountId === 'string' ? body.accountId : null;

  try {
    if (accountId) {
      const result = await replayAccountLedger(accountId);
      if (!result) return fail('not_found', 'Account not found.', 404);
      return ok({ accountResults: [result], userResults: [] });
    }
    if (userId) {
      const result = await replayUserLedger(userId);
      if (!result) return fail('not_found', 'User not found.', 404);
      return ok({ accountResults: [], userResults: [result] });
    }
    const [accountResults, userResults] = await Promise.all([
      replayAllAccountLedgers(),
      replayAllLedgers(),
    ]);
    return ok({ accountResults, userResults });
  } catch (err) {
    console.error('[POST /api/admin/score/replay]', err);
    return fail('internal', 'Replay failed.', 500);
  }
}
