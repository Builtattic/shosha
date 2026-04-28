import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { claimDecisionSchema, idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as claimsRepo from '@/lib/repos/claimRequests';
import * as usersRepo from '@/lib/repos/users';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can decide claims.', 403);
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No claim exists for that id.', 404);
  const json = await request.json().catch(() => null);
  const parsed = claimDecisionSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const claim = await claimsRepo.findById(id.data);
  if (!claim) return fail('not_found', 'No claim exists for that id.', 404);
  const updated = await claimsRepo.update(id.data, {
    status: parsed.data.verdict,
    reviewedAt: new Date().toISOString(),
    reviewedBy: user!._id
  });

  if (parsed.data.verdict === 'approved') {
    await accountsRepo.update(claim.accountId, { claimed: true, claimedBy: claim.userId });
    await usersRepo.addClaimedAccount(claim.userId, claim.accountId);
  }

  return ok(updated);
}
