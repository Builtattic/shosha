import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { averageBreakdown, BASE_SCORE } from '@/lib/scoring';
import { accountCreateSchema } from '@/lib/validators';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as accountsRepo from '@/lib/repos/accounts';

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can list accounts.', 403);
  const accounts = await accountsRepo.listAll(500);
  return ok(accounts);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can create accounts.', 403);
  const json = await request.json().catch(() => null);
  const parsed = accountCreateSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const existing = await accountsRepo.findByPlatformUsername(parsed.data.platform, parsed.data.username);
  if (existing) return ok(existing, 200);

  const account = await accountsRepo.create({
    platform: parsed.data.platform,
    username: parsed.data.username,
    displayName: parsed.data.displayName ?? parsed.data.username,
    bio: parsed.data.bio ?? '',
    avatarUrl: parsed.data.avatarUrl ?? '',
    verified: parsed.data.verified ?? false,
    followers: parsed.data.followers ?? '0',
    score: BASE_SCORE,
    scoreHistory: [{ t: new Date().toISOString(), s: BASE_SCORE, cause: 'seed' }],
    breakdown: averageBreakdown(),
    posts: [],
    claimed: false,
    claimedBy: null,
  });
  await adminActionsRepo.create({ actor: user!, action: 'account.create', entityType: 'account', entityId: account._id, after: account });
  return ok(account, 201);
}
