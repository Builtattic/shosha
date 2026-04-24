import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { connectDb } from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { serializeDoc } from '@/lib/utils';
import { Report } from '@/models/Report';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return fail('forbidden', 'Only tribunal staff can inspect abuse signals.', 403);
  await connectDb();
  const reports = await Report.find({ 'aiVerdict.abuseFlags.0': { $exists: true } })
    .populate('accountId')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return ok(serializeDoc(reports));
}
