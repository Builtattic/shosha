import { ok, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import * as usersRepo from '@/lib/repos/users';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in to follow.', 401);

  const targetId = params.id;
  if (targetId === user._id) return fail('bad_request', 'Cannot follow yourself.', 400);

  const target = await usersRepo.findById(targetId);
  if (!target) return fail('not_found', 'User not found.', 404);

  const myFollowing = user.following ?? [];
  if (!myFollowing.includes(targetId)) {
    await usersRepo.update(user._id, { following: [...myFollowing, targetId] });
  }

  const theirFollowers = target.followers ?? [];
  if (!theirFollowers.includes(user._id)) {
    await usersRepo.update(targetId, { followers: [...theirFollowers, user._id] });
  }

  return ok({ following: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in to unfollow.', 401);

  const targetId = params.id;
  const target = await usersRepo.findById(targetId);
  if (!target) return fail('not_found', 'User not found.', 404);

  await usersRepo.update(user._id, {
    following: (user.following ?? []).filter((id) => id !== targetId)
  });

  await usersRepo.update(targetId, {
    followers: (target.followers ?? []).filter((id) => id !== user._id)
  });

  return ok({ following: false });
}
