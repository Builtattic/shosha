import { fail, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as usersRepo from '@/lib/repos/users';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in to unfollow.', 401);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No dossier exists for that id.', 404);

  const account = await accountsRepo.findById(id.data);
  if (!account) return fail('not_found', 'No dossier exists for that id.', 404);

  const accountIds = user.followingAccounts ?? [];
  await usersRepo.update(user._id, {
    followingAccounts: accountIds.filter((entryId) => entryId !== account._id),
  });

  if (account.claimedBy && account.claimedBy !== user._id) {
    await usersRepo.update(user._id, {
      following: (user.following ?? []).filter((entryId) => entryId !== account.claimedBy),
    });

    const owner = await usersRepo.findById(account.claimedBy);
    if (owner) {
      await usersRepo.update(owner._id, {
        followers: (owner.followers ?? []).filter((entryId) => entryId !== user._id),
      });
    }
  }

  return ok({ following: false });
}
