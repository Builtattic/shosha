import { ok, fail } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { listTrustBadgePending } from '@/lib/repos/users';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) return fail('forbidden', 'Admin only.', 403);

  const pending = await listTrustBadgePending();
  return ok({ items: pending });
}
