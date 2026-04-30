import { fail, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import * as notificationsRepo from '@/lib/repos/notifications';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in required.', 401);
  await notificationsRepo.markAllRead(user._id);
  return ok({ ok: true });
}
