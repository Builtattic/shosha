import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin, isSuperAdmin } from '@/lib/auth';
import { listAdminDataCollections } from '@/lib/adminData';

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can inspect data.', 403);
  const collections = await listAdminDataCollections();
  return ok({ collections, canWrite: isSuperAdmin(user) });
}
