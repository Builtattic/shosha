import { z } from 'zod';
import { fail, fromZod, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { sendDeletionRequestEmail } from '@/lib/email';
import * as deletionRequestsRepo from '@/lib/repos/deletionRequests';
import * as notificationsRepo from '@/lib/repos/notifications';
import * as usersRepo from '@/lib/repos/users';

export const runtime = 'nodejs';

const ADMIN_ROLES: usersRepo.UserRole[] = ['moderator', 'editor', 'admin', 'super_admin'];

const deletionSchema = z.object({
  reason: z.enum([
    'Privacy concerns',
    'Duplicate account',
    'Incorrect profile',
    'Impersonation',
    'Do not want public profile',
    'Harassment or safety concerns',
    'Other',
  ]),
  details: z.string().max(1000).optional(),
  attachmentUrls: z.array(z.string().url()).max(5).optional(),
});

export async function POST(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail('unauthorized', 'Sign in to request profile deletion.', 401);
  }

  const json = await request.json().catch(() => null);
  const parsed = deletionSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const existing = await deletionRequestsRepo.findByUser(user._id);
  const pending = existing.find((item) => item.status === 'pending');
  if (pending) {
    return fail('conflict', 'You already have a pending deletion request under review.', 409);
  }

  const record = await deletionRequestsRepo.create({
    userId: user._id,
    userSnapshot: {
      username: user.username,
      email: user.email,
      name: user.name,
    },
    reason: parsed.data.reason,
    details: parsed.data.details,
    attachmentUrls: parsed.data.attachmentUrls ?? [],
    status: 'pending',
  });

  void sendDeletionRequestEmail({
    username: user.username,
    email: user.email,
    reason: record.reason,
    details: record.details,
    attachmentUrls: record.attachmentUrls,
    requestId: record._id,
    createdAt: record.createdAt,
  });

  const admins = (await Promise.all(ADMIN_ROLES.map((role) => usersRepo.listByRole(role)))).flat();
  await Promise.all(
    admins.map((admin) =>
      notificationsRepo.create({
        userId: admin._id,
        kind: 'deletion_requested',
        title: 'Profile Deletion Request',
        body: `${user.username} has requested account deletion.`,
        link: '/admin/deletion-requests',
        meta: { deletionRequestId: record._id, requestedBy: user._id },
      })
    )
  );

  return ok({ success: true, requestId: record._id });
}
