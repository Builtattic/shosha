import { fail, ok } from '@/lib/api';
import { getCurrentUserReadOnly } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as usersRepo from '@/lib/repos/users';

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
    isAccountDossier: false as const,
  };
}

function serializeFollowedAccount(account: accountsRepo.AccountRecord) {
  return {
    _id: account._id,
    name: account.displayName || account.username,
    username: account.username || account.platform,
    photoUrl: account.avatarUrl || null,
    headline: account.platform ? `${account.platform} profile` : null,
    followersCount: 0,
    isSelf: false,
    isFollowing: true,
    isAccountDossier: true as const,
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

  if (type === 'following') {
    const userIds = Array.from(new Set((target.following ?? []).filter(Boolean)));
    const accountIds = Array.from(new Set((target.followingAccounts ?? []).filter(Boolean)));
    const total = userIds.length + accountIds.length;
    const userSlice = userIds.slice(0, limit);
    const remaining = Math.max(0, limit - userSlice.length);
    const accountSlice = accountIds.slice(0, remaining);
    const [userRows, accountRows] = await Promise.all([
      Promise.all(userSlice.map((id) => usersRepo.findById(id))),
      Promise.all(accountSlice.map((id) => accountsRepo.findById(id))),
    ]);
    const users = [
      ...userRows.filter(Boolean).map((u) => serializeUser(u!, viewer)),
      ...accountRows.filter(Boolean).map((a) => serializeFollowedAccount(a!)),
    ];
    return ok({ type, total, users });
  }

  const ids = Array.from(new Set((target.followers ?? []).filter(Boolean))).slice(0, limit);
  const users = await Promise.all(ids.map((id) => usersRepo.findById(id)));

  return ok({
    type,
    total: (target.followers ?? []).length,
    users: users.filter(Boolean).map((user) => serializeUser(user!, viewer)),
  });
}
