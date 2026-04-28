import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import * as reportsRepo from '@/lib/repos/reports';
import * as accountsRepo from '@/lib/repos/accounts';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can read the queue.', 403);

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const platform = searchParams.get('platform');
  const sort = searchParams.get('sort') === 'confidence' ? 'confidence' : 'date';
  const reports = await reportsRepo.listQueue({
    type: type === 'positive' || type === 'negative' ? type : undefined,
    sort
  });

  const accountIds = Array.from(new Set(reports.map((r) => r.accountId)));
  const accounts = await Promise.all(accountIds.map((id) => accountsRepo.findById(id)));
  const accountMap = new Map(accounts.filter(Boolean).map((a) => [a!._id, a!]));
  const enriched = reports
    .map((r) => ({ ...r, account: accountMap.get(r.accountId) ?? null }))
    .filter((r) => r.account !== null && (!platform || r.account?.platform === platform));
  return ok(enriched);
}
