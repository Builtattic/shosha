import { ok, fail } from '@/lib/api';
import { adminDb } from '@/lib/firebase-admin';

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

    const snap = await adminDb.collection('bubbles')
      .where('archived', '==', false)
      .orderBy(orderField, 'desc')
      .limit(limit)
      .get();

    const bubbles = snap.docs.map(doc => ({
      _id: doc.id,
      ...doc.data()
    }));

    return ok({ items: bubbles });
  } catch (err: any) {
    return fail('server-error', err.message || 'Failed to fetch bubble leaderboard', 500);
  }
}
