import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { disputeDecisionSchema, idSchema } from '@/lib/validators';
import * as disputesRepo from '@/lib/repos/disputes';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as notificationsRepo from '@/lib/repos/notifications';
import * as accountsRepo from '@/lib/repos/accounts';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can decide disputes.', 403);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No dispute exists for that id.', 404);

  const json = await request.json().catch(() => null);
  const parsed = disputeDecisionSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const dispute = await disputesRepo.findById(id.data);
  if (!dispute) return fail('not_found', 'No dispute exists for that id.', 404);
  if (dispute.status === 'withdrawn') return fail('conflict', 'Dispute already withdrawn.', 409);

  const updated = await disputesRepo.decide(id.data, {
    adminId: user!._id,
    verdict: parsed.data.verdict,
    note: parsed.data.note
  });

  await adminActionsRepo.create({
    actor: user!,
    action: `dispute.${parsed.data.verdict}`,
    entityType: 'dispute',
    entityId: id.data,
    before: dispute,
    after: updated
  });

  // Notify the filer of the resolution.
  const account = await accountsRepo.findById(dispute.accountId);
  const accountLabel = account?.displayName || account?.username || 'an account';
  await notificationsRepo.create({
    userId: dispute.userId,
    kind: 'dispute_resolved',
    title: parsed.data.verdict === 'accepted' ? 'Dispute accepted' : 'Dispute rejected',
    body:
      parsed.data.verdict === 'accepted'
        ? `Your dispute on a filing about ${accountLabel} was accepted. A moderator will reverse the score impact.`
        : `Your dispute on a filing about ${accountLabel} was rejected.${parsed.data.note ? ` Note: ${parsed.data.note}` : ''}`,
    link: `/disputes`,
    meta: { disputeId: id.data, reportId: dispute.reportId, accountId: dispute.accountId }
  });

  return ok(updated);
}
