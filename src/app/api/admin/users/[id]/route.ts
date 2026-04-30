import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser, isSuperAdmin } from '@/lib/auth';
import { idSchema, userRoleSchema } from '@/lib/validators';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as usersRepo from '@/lib/repos/users';
import { z } from 'zod';

const updateUserSchema = z.object({
  role: userRoleSchema.optional(),
  reporterScore: z.number().min(0).max(100).optional(),
  claimedAccounts: z.array(idSchema).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) return fail('forbidden', 'Only super admins can modify users.', 403);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No user found for that id.', 404);

  const json = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const before = await usersRepo.findById(id.data);
  if (!before) return fail('not_found', 'No user found for that id.', 404);
  const updated = await usersRepo.update(id.data, parsed.data);
  if (!updated) return fail('not_found', 'No user found for that id.', 404);
  await adminActionsRepo.create({ actor: user!, action: 'user.update', entityType: 'user', entityId: id.data, before, after: updated });
  return ok(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) return fail('forbidden', 'Only super admins can delete users.', 403);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No user found for that id.', 404);

  // Prevent self-deletion
  if (user!._id === id.data) return fail('forbidden', 'Cannot delete your own account.', 403);

  const before = await usersRepo.findById(id.data);
  const { adminDb } = await import('@/lib/firebase/admin');
  await adminDb().ref('users').child(id.data).remove();
  await adminActionsRepo.create({ actor: user!, action: 'user.delete', entityType: 'user', entityId: id.data, before, after: null });
  return ok({ deleted: id.data });
}
