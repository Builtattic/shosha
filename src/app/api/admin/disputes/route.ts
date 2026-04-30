import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import * as disputesRepo from '@/lib/repos/disputes';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import * as usersRepo from '@/lib/repos/users';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can view disputes.', 403);

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const statuses =
    statusParam && statusParam !== 'all'
      ? (statusParam.split(',') as disputesRepo.DisputeStatus[])
      : (['pending', 'under_review', 'accepted', 'rejected', 'withdrawn'] as disputesRepo.DisputeStatus[]);

  const disputes = await disputesRepo.listByStatus(statuses, 200);
  if (disputes.length === 0) return ok([]);

  const userIds = Array.from(new Set(disputes.map((d) => d.userId)));
  const accountIds = Array.from(new Set(disputes.map((d) => d.accountId)));
  const reportIds = Array.from(new Set(disputes.map((d) => d.reportId)));

  const [users, accounts, reports] = await Promise.all([
    Promise.all(userIds.map((id) => usersRepo.findById(id))),
    Promise.all(accountIds.map((id) => accountsRepo.findById(id))),
    Promise.all(reportIds.map((id) => reportsRepo.findById(id)))
  ]);

  const userMap = new Map(users.filter((u): u is NonNullable<typeof u> => Boolean(u)).map((u) => [u._id, u]));
  const accountMap = new Map(accounts.filter((a): a is NonNullable<typeof a> => Boolean(a)).map((a) => [a._id, a]));
  const reportMap = new Map(reports.filter((r): r is NonNullable<typeof r> => Boolean(r)).map((r) => [r._id, r]));

  return ok(
    disputes.map((d) => ({
      ...d,
      filer: userMap.get(d.userId)
        ? {
            _id: d.userId,
            name: userMap.get(d.userId)!.name ?? userMap.get(d.userId)!.username ?? 'Unknown',
            username: userMap.get(d.userId)!.username
          }
        : null,
      account: accountMap.get(d.accountId)
        ? {
            _id: d.accountId,
            displayName: accountMap.get(d.accountId)!.displayName,
            username: accountMap.get(d.accountId)!.username,
            platform: accountMap.get(d.accountId)!.platform
          }
        : null,
      report: reportMap.get(d.reportId)
        ? {
            _id: d.reportId,
            type: reportMap.get(d.reportId)!.type,
            description: reportMap.get(d.reportId)!.description,
            status: reportMap.get(d.reportId)!.status
          }
        : null
    }))
  );
}
