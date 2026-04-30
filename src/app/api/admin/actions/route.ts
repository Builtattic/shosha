import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import * as adminActionsRepo from '@/lib/repos/adminActions';

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can inspect admin activity.', 403);
  return ok(await adminActionsRepo.list(300));
}
