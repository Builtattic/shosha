import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as auditsRepo from '@/lib/repos/auditRequests';
import { z } from 'zod';

const auditDecisionSchema = z.object({
  verdict: z.enum(['completed', 'rejected']),
  note: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can decide audits.', 403);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No audit found for that id.', 404);

  const json = await request.json().catch(() => null);
  const parsed = auditDecisionSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const audit = await auditsRepo.findById(id.data);
  if (!audit) return fail('not_found', 'No audit found for that id.', 404);

  const updated = await auditsRepo.update(id.data, {
    status: parsed.data.verdict,
    updatedAt: new Date().toISOString(),
  });
  await adminActionsRepo.create({ actor: user!, action: `audit.${parsed.data.verdict}`, entityType: 'audit', entityId: id.data, before: audit, after: updated });
  return ok(updated);
}
