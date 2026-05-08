import { ok, fail } from '@/lib/api';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * Inter-Bubble Ranking: Cross-bubble leaderboards.
 * Returns bubbles ranked by their collective score or member count.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const sortBy = url.searchParams.get('sortBy') || 'score'; // 'score' or 'members'

    const orderField = sortBy === 'members' ? 'memberCount' : 'score';

    const snap = await adminDb()
      .ref('bubbles')
      .orderByChild(orderField)
      .limitToLast(limit)
      .once('value');

    const bubbles: Record<string, unknown>[] = [];
    snap.forEach((child) => {
      const val = child.val();
      if (!val?.archived) {
        bubbles.push({ _id: child.key, ...val });
      }
    });
    // Reverse since RTDB returns ascending order
    bubbles.reverse();

    return ok({ items: bubbles });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch bubble leaderboard';
    return fail('server-error', message, 500);
  }
}
