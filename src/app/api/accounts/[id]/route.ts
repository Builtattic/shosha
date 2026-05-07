import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUserReadOnly, isAdmin, requireUser } from '@/lib/auth';
import { accountPatchSchema, idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as usersRepo from '@/lib/repos/users';
import { canViewProfileField } from '@/lib/profilePrivacy';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No dossier exists for that id.', 404);
  const account = await accountsRepo.findById(id.data);
  if (!account) return fail('not_found', 'No dossier exists for that id.', 404);

  if (account.platform !== 'website') return ok(account);

  const [viewer, linkedUser] = await Promise.all([
    getCurrentUserReadOnly().catch(() => null),
    account.claimedBy
      ? usersRepo.findById(account.claimedBy).catch(() => null)
      : usersRepo.findByUsername(account.username).catch(() => null),
  ]);
  if (!linkedUser) return ok(account);

  return ok({
    ...account,
    followers: String((linkedUser.followers ?? []).length),
    region: canViewProfileField(linkedUser, viewer, 'location') ? account.region : undefined,
    sourceUrl: canViewProfileField(linkedUser, viewer, 'website') ? account.sourceUrl : undefined,
    socialLinks: canViewProfileField(linkedUser, viewer, 'socialLinks') ? account.socialLinks : undefined,
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser();
  } catch {
    return fail('unauthorized', 'Sign in before editing a dossier.', 401);
  }
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No dossier exists for that id.', 404);
  const existing = await accountsRepo.findById(id.data);
  if (!existing) return fail('not_found', 'No dossier exists for that id.', 404);
  if (!isAdmin(user) && existing.claimedBy !== user._id) {
    return fail('forbidden', 'You do not have permission to edit this dossier.', 403);
  }
  const json = await request.json().catch(() => null);
  const parsed = accountPatchSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const account = await accountsRepo.update(id.data, parsed.data);
  if (!account) return fail('not_found', 'No dossier exists for that id.', 404);
  return ok(account);
}
