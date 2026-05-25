import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import * as issueReportsRepo from '@/lib/repos/issueReports';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) return fail('forbidden', 'Admin only.', 403);

  const json = await request.json().catch(() => null);
  const parsed = z
    .object({
      status: z.enum(['open', 'in_progress', 'resolved', 'dismissed']),
    })
    .safeParse(json);

  if (!parsed.success) return fail('validation_error', 'Invalid status.', 422);

  await issueReportsRepo.update(params.id, { status: parsed.data.status });
  return ok({ success: true });
}
