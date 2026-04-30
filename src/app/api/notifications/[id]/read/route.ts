import { fail, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import * as notificationsRepo from '@/lib/repos/notifications';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in required.', 401);
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'Notification not found.', 404);
  await notificationsRepo.markRead(user._id, id.data);
  return ok({ id: id.data, read: true });
}
