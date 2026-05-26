import { z } from 'zod';
import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { adminDb } from '@/lib/firebase/admin';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as deletionRequestsRepo from '@/lib/repos/deletionRequests';
import * as notificationsRepo from '@/lib/repos/notifications';
import * as usersRepo from '@/lib/repos/users';
import { idSchema } from '@/lib/validators';

export const runtime = 'nodejs';

const schema = z.object({
  verdict: z.enum(['approved', 'rejected']),
  note: z.string().max(500).optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can decide deletion requests.', 403);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No deletion request exists for that id.', 404);

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const before = await deletionRequestsRepo.findById(id.data);
  if (!before) return fail('not_found', 'No deletion request exists for that id.', 404);
  if (before.status !== 'pending') return fail('already_decided', 'This deletion request is already decided.', 409);

  const beforeUser = await usersRepo.findById(before.userId);
  const now = new Date().toISOString();
  const reviewNote = parsed.data.note ?? '';

  const updated = await deletionRequestsRepo.update(before._id, {
    status: parsed.data.verdict,
    reviewedBy: user!._id,
    reviewedAt: now,
    reviewNote,
  });

  let afterUser = beforeUser;
  if (parsed.data.verdict === 'approved') {
    const anonymizedUsername = `deleted_${before.userId.slice(0, 8)}`;
    await adminDb()
      .ref(`users/${before.userId}`)
      .update({
        name: 'Deleted User',
        username: anonymizedUsername,
        email: `deleted_${before.userId}@noshosha.com`,
        bio: null,
        photoUrl: null,
        headline: null,
        websiteUrl: null,
        igUrl: null,
        tiktokUrl: null,
        xUrl: null,
        linkedinUrl: null,
        redditUrl: null,
        ytUrl: null,
        fbUrl: null,
        snapchatUrl: null,
        deletionApprovedAt: now,
        updatedAt: now,
      });
    afterUser = await usersRepo.findById(before.userId);

    await notificationsRepo.create({
      userId: before.userId,
      kind: 'deletion_resolved',
      title: 'Profile Removal Approved',
      body: 'Your profile removal request has been approved. Your profile has been anonymized.',
      link: '/profile',
      meta: { deletionRequestId: before._id, verdict: 'approved' },
    });
  } else {
    await notificationsRepo.create({
      userId: before.userId,
      kind: 'deletion_resolved',
      title: 'Profile Removal Request Rejected',
      body: reviewNote
        ? `Your request was reviewed: ${reviewNote}`
        : 'Your profile removal request was not approved at this time.',
      link: '/profile',
      meta: { deletionRequestId: before._id, verdict: 'rejected' },
    });
  }

  await adminActionsRepo.create({
    actor: user!,
    action: 'deletion-request.decide',
    entityType: 'deletionRequest',
    entityId: before._id,
    before: { request: before, user: beforeUser },
    after: { request: updated, user: afterUser },
  });

  return ok({ success: true });
}
