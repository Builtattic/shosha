import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { connectDb } from '@/lib/db';
import { fail, fromZod, ok } from '@/lib/api';
import { claimDecisionSchema, objectIdSchema } from '@/lib/validators';
import { serializeDoc } from '@/lib/utils';
import { Account } from '@/models/Account';
import { ClaimRequest } from '@/models/ClaimRequest';
import { User } from '@/models/User';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return fail('forbidden', 'Only tribunal staff can decide claims.', 403);
  const id = objectIdSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No claim exists for that id.', 404);
  const json = await request.json().catch(() => null);
  const parsed = claimDecisionSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  await connectDb();
  const claim = await ClaimRequest.findById(id.data);
  if (!claim) return fail('not_found', 'No claim exists for that id.', 404);
  claim.status = parsed.data.verdict;
  claim.reviewedAt = new Date();
  claim.reviewedBy = session!.user.id as any;
  await claim.save();

  if (parsed.data.verdict === 'approved') {
    await Account.findByIdAndUpdate(claim.accountId, { claimed: true, claimedBy: claim.userId });
    await User.findByIdAndUpdate(claim.userId, { $addToSet: { claimedAccounts: claim.accountId } });
  }

  return ok(serializeDoc(claim));
}
