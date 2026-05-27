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
  name: z.string().optional(),
  username: z.string().optional(),
  bio: z.string().optional(),
  photoUrl: z.string().optional(),
  headline: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  igUrl: z.string().optional(),
  tiktokUrl: z.string().optional(),
  xUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  redditUrl: z.string().optional(),
  ytUrl: z.string().optional(),
  fbUrl: z.string().optional(),
  snapchatUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) return fail('forbidden', 'Only super admins can modify users.', 403);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No user found for that id.', 404);

  const json = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);
  if (parsed.data.role && user?.role !== 'super_admin') {
    return fail('forbidden', 'Only super_admin can change roles.', 403);
  }

  const before = await usersRepo.findById(id.data);
  if (!before) return fail('not_found', 'No user found for that id.', 404);
  const { role, ...rest } = parsed.data;
  let updated = before;
  if (role) {
    const roleUpdated = await usersRepo.updateRole(id.data, role);
    if (!roleUpdated) return fail('not_found', 'No user found for that id.', 404);
    updated = roleUpdated;
  }
  if (Object.keys(rest).length) {
    const restUpdated = await usersRepo.update(id.data, rest);
    if (!restUpdated) return fail('not_found', 'No user found for that id.', 404);
    updated = restUpdated;
  }
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
