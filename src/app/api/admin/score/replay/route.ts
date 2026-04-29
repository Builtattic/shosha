import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { replayAllLedgers, replayUserLedger } from '@/lib/services/ledgerReplay';

// POST /api/admin/score/replay
//   body: { userId?: string }  → if omitted, replays every user's ledger.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Admins only.', 403);

  const body = await req.json().catch(() => ({}));
  const userId = typeof body?.userId === 'string' ? body.userId : null;

  try {
    if (userId) {
      const result = await replayUserLedger(userId);
      if (!result) return fail('not_found', 'User not found.', 404);
      return ok({ results: [result] });
    }
    const results = await replayAllLedgers();
    return ok({ results });
  } catch (err) {
    console.error('[POST /api/admin/score/replay]', err);
    return fail('internal', 'Replay failed.', 500);
  }
}
