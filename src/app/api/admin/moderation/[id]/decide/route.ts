import { z } from 'zod';
import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as moderationRequestsRepo from '@/lib/repos/moderationRequests';
import * as notificationsRepo from '@/lib/repos/notifications';
import * as reportsRepo from '@/lib/repos/reports';

const schema = z.object({
  verdict: z.enum(['approved', 'rejected']),
  note: z.string().max(500).default(''),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can decide moderation requests.', 403);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No moderation request exists for that id.', 404);

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const before = await moderationRequestsRepo.findById(id.data);
  if (!before) return fail('not_found', 'No moderation request exists for that id.', 404);
  if (before.status !== 'pending') return fail('already_decided', 'This moderation request is already decided.', 409);

  const reportBefore = await reportsRepo.findById(before.reportId);
  let reportAfter = reportBefore;
  if (parsed.data.verdict === 'approved' && reportBefore) {
    reportAfter = await reportsRepo.update(reportBefore._id, { visibility: 'hidden' });
  }

  const decidedAt = new Date().toISOString();
  const updated = await moderationRequestsRepo.update(before._id, {
    status: parsed.data.verdict,
    reviewedBy: user!._id,
    reviewedAt: decidedAt,
    reviewNote: parsed.data.note,
  });

  await adminActionsRepo.create({
    actor: user!,
    action: 'moderation.decide',
    entityType: 'moderationRequest',
    entityId: before._id,
    before: { request: before, report: reportBefore },
    after: { request: updated, report: reportAfter },
  });

  await notificationsRepo.create({
    userId: before.requestedBy,
    kind: 'moderation_resolved',
    title: parsed.data.verdict === 'approved' ? 'Moderation request approved' : 'Moderation request rejected',
    body: parsed.data.verdict === 'approved'
      ? 'Your filing was hidden after moderator review.'
      : 'A moderator reviewed your request and kept the filing visible.',
    link: `/account/${before.accountId}`,
    meta: { moderationRequestId: before._id, reportId: before.reportId, accountId: before.accountId },
  });

  return ok({ request: updated, report: reportAfter });
}
