import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import * as auditsRepo from '@/lib/repos/auditRequests';
import * as usersRepo from '@/lib/repos/users';

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can inspect audits.', 403);

  const audits = await auditsRepo.listPending();
  const accountIds = Array.from(new Set(audits.map((a) => a.accountId)));
  const userIds = Array.from(new Set(audits.map((a) => a.userId)));
  const [accounts, users] = await Promise.all([
    Promise.all(accountIds.map((id) => accountsRepo.findById(id))),
    Promise.all(userIds.map((id) => usersRepo.findById(id)))
  ]);
  const accountMap = new Map(accounts.filter(Boolean).map((a) => [a!._id, a!]));
  const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));
  const enriched = audits.map((audit) => ({
    ...audit,
    account: accountMap.get(audit.accountId) ?? null,
    user: userMap.get(audit.userId) ?? null
  }));
  return ok(enriched);
}
