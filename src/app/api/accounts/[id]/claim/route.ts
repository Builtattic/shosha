import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDb } from '@/lib/db';
import { fail, fromZod, ok } from '@/lib/api';
import { assertLimit, rateLimits } from '@/lib/ratelimit';
import { claimSchema, objectIdSchema } from '@/lib/validators';
import { serializeDoc } from '@/lib/utils';
import { Account } from '@/models/Account';
import { ClaimRequest } from '@/models/ClaimRequest';
import { User } from '@/models/User';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return fail('unauthorized', 'Sign in before claiming a dossier.', 401);
  const id = objectIdSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No dossier exists for that id.', 404);
  const limit = await assertLimit(rateLimits.claim, session.user.id);
  if (!limit.allowed) return fail('rate_limited', 'Claim attempts are paused for today.', 429);

  const json = await request.json().catch(() => null);
  const parsed = claimSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  await connectDb();
  const account = await Account.findById(id.data);
  if (!account) return fail('not_found', 'No dossier exists for that id.', 404);

  const bioCode = `shosha-${Math.random().toString(36).slice(2, 6)}`;
  const autoApprove = parsed.data.proofType === 'bio_code';
  const claim = await ClaimRequest.create({
    userId: session.user.id,
    accountId: id.data,
    proofType: parsed.data.proofType,
    proofPayload: {
      ...parsed.data.proofPayload,
      ...(parsed.data.proofType === 'bio_code' ? { code: bioCode, expiresAt: new Date(Date.now() + 10 * 60_000) } : {})
    },
    status: autoApprove ? 'approved' : 'pending',
    reviewedAt: autoApprove ? new Date() : null,
    reviewedBy: autoApprove ? session.user.id : null
  });

  if (autoApprove) {
    account.claimed = true;
    account.claimedBy = session.user.id as any;
    await account.save();
    await User.findByIdAndUpdate(session.user.id, { $addToSet: { claimedAccounts: account._id } });
  }

  return ok(serializeDoc(claim), 201);
}
