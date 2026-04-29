import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import * as usersRepo from '@/lib/repos/users';
import { z } from 'zod';

const updateUserSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  reporterScore: z.number().min(0).max(100).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can modify users.', 403);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No user found for that id.', 404);

  const json = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const updated = await usersRepo.update(id.data, parsed.data);
  if (!updated) return fail('not_found', 'No user found for that id.', 404);
  return ok(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can delete users.', 403);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No user found for that id.', 404);

  // Prevent self-deletion
  if (user!._id === id.data) return fail('forbidden', 'Cannot delete your own account.', 403);

  const { adminDb } = await import('@/lib/firebase/admin');
  await adminDb().ref('users').child(id.data).remove();
  return ok({ deleted: id.data });
}
