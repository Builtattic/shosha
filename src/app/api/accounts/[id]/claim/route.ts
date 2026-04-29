import { fail, fromZod, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { assertLimit, rateLimits } from '@/lib/ratelimit';
import { claimSchema, idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as claimsRepo from '@/lib/repos/claimRequests';

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
  if (account.claimed) return fail('already_claimed', 'This account has already been claimed.', 409);

  const claim = await claimsRepo.create({
    userId: user._id,
    accountId: id.data,
    proofType: parsed.data.proofType,
    proofPayload: parsed.data.proofPayload,
    status: 'pending',
    reviewedAt: null,
    reviewedBy: null
  });

  return ok(claim, 201);
}
