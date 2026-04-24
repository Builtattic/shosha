import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { connectDb } from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { serializeDoc } from '@/lib/utils';
import { AuditRequest } from '@/models/AuditRequest';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return fail('forbidden', 'Only tribunal staff can inspect audits.', 403);
  await connectDb();
  const audits = await AuditRequest.find({ status: { $in: ['pending', 'in_progress'] } })
    .populate('accountId')
    .populate('userId', 'username email')
    .sort({ createdAt: 1 })
    .lean();
  return ok(serializeDoc(audits));
}
