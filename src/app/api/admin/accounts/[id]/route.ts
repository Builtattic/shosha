import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import { z } from 'zod';

const updateAccountSchema = z.object({
  score: z.number().optional(),
  verified: z.boolean().optional(),
  displayName: z.string().min(1).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can modify accounts.', 403);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No account found for that id.', 404);

  const json = await request.json().catch(() => null);
  const parsed = updateAccountSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const updated = await accountsRepo.update(id.data, parsed.data);
  if (!updated) return fail('not_found', 'No account found for that id.', 404);
  return ok(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can delete accounts.', 403);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No account found for that id.', 404);

  await accountsRepo.deleteById(id.data);
  return ok({ deleted: id.data });
}
