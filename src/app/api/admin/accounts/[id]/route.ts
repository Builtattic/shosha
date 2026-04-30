import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser, isAdmin, isSuperAdmin } from '@/lib/auth';
import { idSchema, platformSchema } from '@/lib/validators';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as accountsRepo from '@/lib/repos/accounts';
import { z } from 'zod';

const updateAccountSchema = z.object({
  score: z.number().optional(),
  verified: z.boolean().optional(),
  displayName: z.string().min(1).optional(),
  platform: platformSchema.optional(),
  username: z.string().min(1).max(100).optional(),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().or(z.literal('')).optional(),
  followers: z.string().max(24).optional(),
  claimed: z.boolean().optional(),
  claimedBy: z.string().nullable().optional(),
  profileId: z.string().min(1).max(40).optional(),
  profileKind: z.enum(['standard', 'public_figure']).optional(),
  claimable: z.boolean().optional(),
  credibility: z.number().min(0).max(100).optional(),
  enrichmentStatus: z.enum(['none', 'pending', 'reviewed', 'stale']).optional(),
  role: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  quote: z.string().max(280).optional(),
  evidenceSummary: z.string().max(500).optional(),
  socialLinks: z.record(z.unknown()).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can modify accounts.', 403);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No account found for that id.', 404);

  const json = await request.json().catch(() => null);
  const parsed = updateAccountSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const before = await accountsRepo.findById(id.data);
  if (!before) return fail('not_found', 'No account found for that id.', 404);
  const updated = await accountsRepo.update(id.data, parsed.data);
  if (!updated) return fail('not_found', 'No account found for that id.', 404);
  await adminActionsRepo.create({ actor: user!, action: 'account.update', entityType: 'account', entityId: id.data, before, after: updated });
  return ok(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) return fail('forbidden', 'Only super admins can delete accounts.', 403);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No account found for that id.', 404);

  const before = await accountsRepo.findById(id.data);
  await accountsRepo.deleteById(id.data);
  await adminActionsRepo.create({ actor: user!, action: 'account.delete', entityType: 'account', entityId: id.data, before, after: null });
  return ok({ deleted: id.data });
}
