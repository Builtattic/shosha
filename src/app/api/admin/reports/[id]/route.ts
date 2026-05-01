import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser, isAdmin, isSuperAdmin } from '@/lib/auth';
import { idSchema, mediaSchema, reportStatusSchema, reportTypeSchema, reportVisibilitySchema } from '@/lib/validators';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as reportsRepo from '@/lib/repos/reports';
import { z } from 'zod';

const patchSchema = z.object({
  type: reportTypeSchema.optional(),
  description: z.string().min(10).max(500).optional(),
  feelings: z.string().max(500).optional(),
  media: mediaSchema.optional(),
  status: reportStatusSchema.optional(),
  visibility: reportVisibilitySchema.optional(),
  pinned: z.boolean().optional(),
  featured: z.boolean().optional(),
  aiVerdict: z.any().nullable().optional(),
  adminDecision: z.any().nullable().optional(),
  stats: z.object({
    aligns: z.number().int().nonnegative(),
    opposes: z.number().int().nonnegative(),
    comments: z.number().int().nonnegative(),
    shares: z.number().int().nonnegative(),
  }).partial().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can modify reports.', 403);
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No report found for that id.', 404);
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);
  const before = await reportsRepo.findById(id.data);
  if (!before) return fail('not_found', 'No report found for that id.', 404);
  if (parsed.data.status && parsed.data.status !== before.status) {
    return fail(
      'status_locked',
      'Report status changes must use the review workflow so ledger and profile scores stay connected.',
      409
    );
  }
  const patch: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.stats) patch.stats = { ...(before.stats ?? { aligns: 0, opposes: 0, comments: 0, shares: 0 }), ...parsed.data.stats };
  const updated = await reportsRepo.update(id.data, patch);
  await adminActionsRepo.create({ actor: user!, action: 'report.update', entityType: 'report', entityId: id.data, before, after: updated });
  return ok(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) return fail('forbidden', 'Only super admins can delete reports.', 403);
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No report found for that id.', 404);
  const before = await reportsRepo.findById(id.data);
  if (!before) return fail('not_found', 'No report found for that id.', 404);
  await reportsRepo.deleteById(id.data);
  await adminActionsRepo.create({ actor: user!, action: 'report.delete', entityType: 'report', entityId: id.data, before, after: null });
  return ok({ deleted: id.data });
}
