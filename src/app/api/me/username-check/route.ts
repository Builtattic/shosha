import { ok, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { userUsernameSchema } from '@/lib/validators';
import * as usersRepo from '@/lib/repos/users';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in to continue.', 401);

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('username') ?? '';

  const parsed = userUsernameSchema.safeParse(raw);
  if (!parsed.success) {
    return ok({
      available: false,
      error: parsed.error.errors[0]?.message ?? 'Invalid username',
    });
  }

  const normalized = parsed.data;

  // Same username as current user — always available
  if (user.username?.toLowerCase() === normalized) {
    return ok({ available: true, username: normalized });
  }

  const existing = await usersRepo.findByUsername(normalized);
  if (existing) {
    return ok({ available: false, error: 'Username is already taken' });
  }

  return ok({ available: true, username: normalized });
}
