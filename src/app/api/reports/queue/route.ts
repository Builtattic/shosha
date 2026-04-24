import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { connectDb } from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { serializeDoc } from '@/lib/utils';
import { Report } from '@/models/Report';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return fail('forbidden', 'Only tribunal staff can read the queue.', 403);

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const platform = searchParams.get('platform');
  const sort: Record<string, 1 | -1> =
    searchParams.get('sort') === 'confidence' ? { 'aiVerdict.confidence': -1 } : { createdAt: 1 };
  const query: Record<string, unknown> = { status: { $in: ['ai_reviewed', 'pending_ai', 'flagged'] } };
  if (type === 'positive' || type === 'negative') query.type = type;

  await connectDb();
  const reports = await Report.find(query)
    .populate({ path: 'accountId', match: platform ? { platform } : undefined })
    .sort(sort)
    .limit(100)
    .lean();
  return ok(serializeDoc(reports.filter((report) => report.accountId)));
}
