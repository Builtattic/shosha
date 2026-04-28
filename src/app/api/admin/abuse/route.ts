import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can inspect abuse signals.', 403);

  const reports = await reportsRepo.listAll(500);
  const flagged = reports.filter((r) => (r.aiVerdict?.abuseFlags?.length ?? 0) > 0).slice(0, 100);
  const accountIds = Array.from(new Set(flagged.map((r) => r.accountId)));
  const accounts = await Promise.all(accountIds.map((id) => accountsRepo.findById(id)));
  const accountMap = new Map(accounts.filter(Boolean).map((a) => [a!._id, a!]));
  return ok(flagged.map((r) => ({ ...r, account: accountMap.get(r.accountId) ?? null })));
}
