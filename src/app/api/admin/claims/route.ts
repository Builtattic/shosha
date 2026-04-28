import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import * as claimsRepo from '@/lib/repos/claimRequests';
import * as usersRepo from '@/lib/repos/users';

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can inspect claims.', 403);

  const claims = await claimsRepo.listPending();
  const accountIds = Array.from(new Set(claims.map((c) => c.accountId)));
  const userIds = Array.from(new Set(claims.map((c) => c.userId)));
  const [accounts, users] = await Promise.all([
    Promise.all(accountIds.map((id) => accountsRepo.findById(id))),
    Promise.all(userIds.map((id) => usersRepo.findById(id)))
  ]);
  const accountMap = new Map(accounts.filter(Boolean).map((a) => [a!._id, a!]));
  const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));
  return ok(
    claims.map((claim) => ({
      ...claim,
      account: accountMap.get(claim.accountId) ?? null,
      user: userMap.get(claim.userId) ?? null
    }))
  );
}
