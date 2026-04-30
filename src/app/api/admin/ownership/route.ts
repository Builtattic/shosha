import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser, isSuperAdmin } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as usersRepo from '@/lib/repos/users';
import { z } from 'zod';

const schema = z.object({ accountId: idSchema, userId: idSchema });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) return fail('forbidden', 'Only super admins can assign ownership.', 403);
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);
  const [account, owner] = await Promise.all([accountsRepo.findById(parsed.data.accountId), usersRepo.findById(parsed.data.userId)]);
  if (!account) return fail('not_found', 'No account found for that id.', 404);
  if (!owner) return fail('not_found', 'No user found for that id.', 404);
  const updatedAccount = await accountsRepo.update(account._id, { claimed: true, claimedBy: owner._id });
  await usersRepo.addClaimedAccount(owner._id, account._id);
  await adminActionsRepo.create({ actor: user!, action: 'ownership.assign', entityType: 'ownership', entityId: account._id, before: account, after: { account: updatedAccount, owner } });
  return ok({ account: updatedAccount, user: await usersRepo.findById(owner._id) });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) return fail('forbidden', 'Only super admins can revoke ownership.', 403);
  const json = await request.json().catch(() => null);
  const parsed = z.object({ accountId: idSchema }).safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);
  const account = await accountsRepo.findById(parsed.data.accountId);
  if (!account) return fail('not_found', 'No account found for that id.', 404);
  const owner = account.claimedBy ? await usersRepo.findById(account.claimedBy) : null;
  const updatedAccount = await accountsRepo.update(account._id, { claimed: false, claimedBy: null });
  if (owner) await usersRepo.update(owner._id, { claimedAccounts: (owner.claimedAccounts ?? []).filter((id) => id !== account._id) });
  await adminActionsRepo.create({ actor: user!, action: 'ownership.revoke', entityType: 'ownership', entityId: account._id, before: { account, owner }, after: updatedAccount });
  return ok({ account: updatedAccount });
}
