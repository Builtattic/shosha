import { fail, ok } from '@/lib/api';
import { getCurrentUserReadOnly } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import * as usersRepo from '@/lib/repos/users';

type ConnectionType = 'followers' | 'following';

function serializeUser(user: usersRepo.AppUser, viewer: usersRepo.AppUser | null) {
  const viewerFollowing = new Set(viewer?.following ?? []);
  return {
    _id: user._id,
    name: user.name || user.username,
    username: user.username,
    photoUrl: user.photoUrl || null,
    headline: user.headline || user.category || null,
    followersCount: (user.followers ?? []).length,
    followingCount: (user.following ?? []).length,
    isSelf: viewer?._id === user._id,
    isFollowing: viewerFollowing.has(user._id),
  };
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const parsedId = idSchema.safeParse(params.id);
  if (!parsedId.success) return fail('validation_error', 'Invalid user id.', 422);

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') === 'following' ? 'following' : 'followers';
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 50), 1), 100);

  const [target, viewer] = await Promise.all([
    usersRepo.findById(parsedId.data),
    getCurrentUserReadOnly().catch(() => null),
  ]);
  if (!target) return fail('not_found', 'User not found.', 404);

  const ids = Array.from(new Set((target[type as ConnectionType] ?? []).filter(Boolean))).slice(0, limit);
  const users = await Promise.all(ids.map((id) => usersRepo.findById(id)));

  return ok({
    type,
    total: (target[type as ConnectionType] ?? []).length,
    users: users.filter(Boolean).map((user) => serializeUser(user!, viewer)),
  });
}
