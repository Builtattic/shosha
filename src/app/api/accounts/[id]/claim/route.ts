import { fail, fromZod, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { assertLimit, rateLimits } from '@/lib/ratelimit';
import { claimSchema, idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as claimsRepo from '@/lib/repos/claimRequests';
import * as usersRepo from '@/lib/repos/users';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail('unauthorized', 'Sign in before claiming a dossier.', 401);
  }
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No dossier exists for that id.', 404);
  const limit = await assertLimit(rateLimits.claim, user._id);
  if (!limit.allowed) return fail('rate_limited', 'Claim attempts are paused for today.', 429);

  const json = await request.json().catch(() => null);
  const parsed = claimSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const account = await accountsRepo.findById(id.data);
  if (!account) return fail('not_found', 'No dossier exists for that id.', 404);

  const bioCode = `shosha-${Math.random().toString(36).slice(2, 6)}`;
  const autoApprove = parsed.data.proofType === 'bio_code';
  const claim = await claimsRepo.create({
    userId: user._id,
    accountId: id.data,
    proofType: parsed.data.proofType,
    proofPayload: {
      ...parsed.data.proofPayload,
      ...(parsed.data.proofType === 'bio_code'
        ? { code: bioCode, expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() }
        : {})
    },
    status: autoApprove ? 'approved' : 'pending',
    reviewedAt: autoApprove ? new Date().toISOString() : null,
    reviewedBy: autoApprove ? user._id : null
  });

  if (autoApprove) {
    await accountsRepo.update(id.data, { claimed: true, claimedBy: user._id });
    await usersRepo.addClaimedAccount(user._id, id.data);
  }

  return ok(claim, 201);
}
