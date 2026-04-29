import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import * as usersRepo from '@/lib/repos/users';

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can list users.', 403);
  const users = await usersRepo.listAll(500);
  return ok(users);
}
