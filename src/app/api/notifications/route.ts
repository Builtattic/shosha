import { ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return ok([
      {
        id: 'signed-out',
        title: 'Sign in to save your activity',
        body: 'Create reports, upload evidence, and track your filings from one account.'
      }
    ]);
  }

  const reports = await reportsRepo.listByReporter(user._id, 5);
  const accountIds = Array.from(new Set(reports.map((report) => report.accountId)));
  const accounts = await Promise.all(accountIds.map((id) => accountsRepo.findById(id)));
  const accountMap = new Map(accounts.filter(Boolean).map((account) => [account!._id, account!]));

  return ok(
    reports.length
      ? reports.map((report) => ({
          id: report._id,
          title: `${report.type === 'positive' ? 'Positive' : 'Negative'} report ${report.status.replace('_', ' ')}`,
          body: accountMap.get(report.accountId)?.displayName ?? report.description.slice(0, 80)
        }))
      : [
          {
            id: 'empty',
            title: 'No filings yet',
            body: 'Create your first report to start building the ledger.'
          }
        ]
  );
}
