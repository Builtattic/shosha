import { fail, ok } from '@/lib/api';
import { getCurrentUser, isSuperAdmin } from '@/lib/auth';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import { replayAllLedgers, replayUserLedger } from '@/lib/services/ledgerReplay';
import { replayAccountLedger, replayAllAccountLedgers } from '@/lib/services/accountScoreReplay';

// POST /api/admin/score/replay
//   body: { userId?: string, accountId?: string }.
//   If omitted, replays every account/profile ledger and every user's claimed-account ledger.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) return fail('forbidden', 'Super admins only.', 403);

  const body = await req.json().catch(() => ({}));
  const userId = typeof body?.userId === 'string' ? body.userId : null;
  const accountId = typeof body?.accountId === 'string' ? body.accountId : null;

  try {
    if (accountId) {
      const result = await replayAccountLedger(accountId);
      if (!result) return fail('not_found', 'Account not found.', 404);
      await adminActionsRepo.create({ actor: user!, action: 'score.replay.account', entityType: 'score', entityId: accountId, after: result });
      return ok({ accountResults: [result], userResults: [] });
    }
    if (userId) {
      const result = await replayUserLedger(userId);
      if (!result) return fail('not_found', 'User not found.', 404);
      await adminActionsRepo.create({ actor: user!, action: 'score.replay.user', entityType: 'score', entityId: userId, after: result });
      return ok({ accountResults: [], userResults: [result] });
    }
    const [accountResults, userResults] = await Promise.all([
      replayAllAccountLedgers(),
      replayAllLedgers(),
    ]);
    await adminActionsRepo.create({ actor: user!, action: 'score.replay.all', entityType: 'score', entityId: 'all', after: { accountResults: accountResults.length, userResults: userResults.length } });
    return ok({ accountResults, userResults });
  } catch (err) {
    console.error('[POST /api/admin/score/replay]', err);
    return fail('internal', 'Replay failed.', 500);
  }
}
