import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import * as moderationRequestsRepo from '@/lib/repos/moderationRequests';
import * as reportsRepo from '@/lib/repos/reports';
import * as usersRepo from '@/lib/repos/users';

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can inspect moderation requests.', 403);

  const requests = await moderationRequestsRepo.listAll(200);
  const [reports, accounts, requesters] = await Promise.all([
    Promise.all(requests.map((item) => reportsRepo.findById(item.reportId))),
    Promise.all(Array.from(new Set(requests.map((item) => item.accountId))).map((id) => accountsRepo.findById(id))),
    Promise.all(Array.from(new Set(requests.map((item) => item.requestedBy))).map((id) => usersRepo.findById(id))),
  ]);
  const reportMap = new Map(reports.filter(Boolean).map((item) => [item!._id, item!]));
  const accountMap = new Map(accounts.filter(Boolean).map((item) => [item!._id, item!]));
  const requesterMap = new Map(requesters.filter(Boolean).map((item) => [item!._id, item!]));

  return ok(
    requests.map((item) => ({
      ...item,
      report: reportMap.get(item.reportId) ?? null,
      account: accountMap.get(item.accountId) ?? null,
      requester: requesterMap.get(item.requestedBy) ?? null,
    }))
  );
}
