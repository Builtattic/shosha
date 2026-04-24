import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { connectDb } from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { serializeDoc } from '@/lib/utils';
import { ClaimRequest } from '@/models/ClaimRequest';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return fail('forbidden', 'Only tribunal staff can inspect claims.', 403);
  await connectDb();
  const claims = await ClaimRequest.find({ status: 'pending' })
    .populate('accountId')
    .populate('userId', 'username email')
    .sort({ createdAt: 1 })
    .lean();
  return ok(serializeDoc(claims));
}
