import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as reportsRepo from '@/lib/repos/reports';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can dismiss abuse flags.', 403);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No report found for that id.', 404);

  const report = await reportsRepo.findById(id.data);
  if (!report) return fail('not_found', 'No report found for that id.', 404);

  // Clear abuse flags and mark as reviewed
  const updated = await reportsRepo.update(id.data, {
    aiVerdict: report.aiVerdict
      ? { ...report.aiVerdict, abuseFlags: [] }
      : null,
    status: 'ai_reviewed',
  });
  await adminActionsRepo.create({ actor: user!, action: 'abuse.dismiss', entityType: 'report', entityId: id.data, before: report, after: updated });
  return ok(updated);
}
