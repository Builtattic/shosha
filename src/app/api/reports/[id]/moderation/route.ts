import { z } from 'zod';
import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import * as reportsRepo from '@/lib/repos/reports';
import * as moderationRequestsRepo from '@/lib/repos/moderationRequests';
import * as notificationsRepo from '@/lib/repos/notifications';
import * as usersRepo from '@/lib/repos/users';

const schema = z.object({
  reason: z.string().min(10).max(1000),
  evidenceUrl: z.string().url().max(500).optional().or(z.literal('')),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in to request moderation.', 401);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No filing exists for that id.', 404);

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const report = await reportsRepo.findById(id.data);
  if (!report) return fail('not_found', 'No filing exists for that id.', 404);
  if (report.reporterId !== user._id) {
    return fail('forbidden', 'Only the reporter can request moderation for this filing.', 403);
  }

  const existing = await moderationRequestsRepo.listByReport(report._id);
  const pending = existing.find((item) => item.requestedBy === user._id && item.status === 'pending');
  if (pending) return ok(pending, 200);

  const created = await moderationRequestsRepo.create({
    reportId: report._id,
    accountId: report.accountId,
    requestedBy: user._id,
    reason: parsed.data.reason,
    evidenceLinks: parsed.data.evidenceUrl ? [parsed.data.evidenceUrl] : [],
  });

  const admins = (await usersRepo.listAll(500)).filter((item) =>
    ['moderator', 'editor', 'admin', 'super_admin'].includes(item.role)
  );
  await Promise.all(
    admins.map((admin) =>
      notificationsRepo.create({
        userId: admin._id,
        kind: 'moderation_requested',
        title: 'Moderation request submitted',
        body: `${user.name || user.username} requested review of a filing.`,
        link: '/admin/moderation',
        meta: { moderationRequestId: created._id, reportId: report._id, accountId: report.accountId },
      })
    )
  );

  return ok(created, 201);
}
