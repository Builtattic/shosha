import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { claimDecisionSchema, idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as claimsRepo from '@/lib/repos/claimRequests';
import * as usersRepo from '@/lib/repos/users';
import * as notificationsRepo from '@/lib/repos/notifications';

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

  const account = await accountsRepo.findById(claim.accountId);

  if (parsed.data.verdict === 'approved') {
    const patch: Partial<accountsRepo.AccountRecord> = { claimed: true, claimedBy: claim.userId };
    if (account && account.profileKind === 'public_figure') {
      patch.trustBadge = true;
    }
    await accountsRepo.update(claim.accountId, patch);
    await usersRepo.addClaimedAccount(claim.userId, claim.accountId);
  }

  await adminActionsRepo.create({ actor: user!, action: `claim.${parsed.data.verdict}`, entityType: 'claim', entityId: id.data, before: claim, after: updated });

  if (claim.userId) {
    const accountName = account?.displayName || account?.username || 'an account';
    const approved = parsed.data.verdict === 'approved';
    await notificationsRepo.create({
      userId: claim.userId,
      kind: approved ? 'claim_approved' : 'claim_rejected',
      title: approved ? 'Claim approved' : 'Claim rejected',
      body: approved
        ? `Your ownership claim on ${accountName} was approved. The dossier now shows your reputation profile.`
        : `Your ownership claim on ${accountName} was rejected.${parsed.data.note ? ` Note: ${parsed.data.note}` : ''}`,
      link: `/account/${claim.accountId}`,
      meta: { claimId: id.data, accountId: claim.accountId }
    });
  }

  return ok(updated);
}
