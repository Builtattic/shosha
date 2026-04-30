import { fail, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import * as interactionsRepo from '@/lib/repos/reportInteractions';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in to view bookmarks.', 401);

  const bookmarks = await interactionsRepo.listBookmarksForUser(user._id, 100);
  if (bookmarks.length === 0) return ok([]);

  const reports = await Promise.all(bookmarks.map((b) => reportsRepo.findById(b.reportId)));
  const live = reports.filter((r): r is NonNullable<typeof r> => Boolean(r));

  const accountIds = Array.from(new Set(live.map((r) => r.accountId)));
  const accounts = await Promise.all(accountIds.map((id) => accountsRepo.findById(id)));
  const accountMap = new Map(
    accounts.filter((a): a is NonNullable<typeof a> => Boolean(a)).map((a) => [a._id, a])
  );

  return ok(
    live
      .map((report) => {
        const account = accountMap.get(report.accountId);
        if (!account) return null;
        return {
          ...report,
          account,
          viewer: { vote: null, bookmarked: true }
        };
      })
      .filter(Boolean)
  );
}
