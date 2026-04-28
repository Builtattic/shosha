import { fail, fromZod, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { accountPatchSchema, idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No dossier exists for that id.', 404);
  const account = await accountsRepo.findById(id.data);
  if (!account) return fail('not_found', 'No dossier exists for that id.', 404);
  return ok(account);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
  } catch {
    return fail('unauthorized', 'Sign in before editing a dossier.', 401);
  }
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No dossier exists for that id.', 404);
  const json = await request.json().catch(() => null);
  const parsed = accountPatchSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const account = await accountsRepo.update(id.data, parsed.data);
  if (!account) return fail('not_found', 'No dossier exists for that id.', 404);
  return ok(account);
}
