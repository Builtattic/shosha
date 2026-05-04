import { fail, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import * as reportsRepo from '@/lib/repos/reports';
import * as accountsRepo from '@/lib/repos/accounts';
import * as interactionsRepo from '@/lib/repos/reportInteractions';
import { discoverReports } from '@/lib/shoshaDiscovery';
import { redactPublicReporter } from '@/lib/reportPrivacy';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '30')));

  if (!q) return fail('validation_error', 'Provide a search query.', 422);

  const user = await getCurrentUser();
  const matches = await reportsRepo.search(q, limit);
  if (matches.length === 0) {
    const discovered = await discoverReports(q);
    if (discovered.length === 0) return ok([]);
    return ok(discovered);
  }

  const accountIds = Array.from(new Set(matches.map((r) => r.accountId)));
  const accounts = await Promise.all(accountIds.map((id) => accountsRepo.findById(id)));
  const accountMap = new Map(
    accounts.filter((a): a is NonNullable<typeof a> => Boolean(a)).map((a) => [a._id, a])
  );

  const viewerStates = await Promise.all(
    matches.map((r) =>
      user ? interactionsRepo.getViewerState(r._id, user._id) : Promise.resolve({ vote: null, bookmarked: false })
    )
  );

  return ok(
    matches
      .map((report, idx) => {
        const account = accountMap.get(report.accountId);
        if (!account) return null;
        return {
          ...redactPublicReporter(report),
          account,
          viewer: viewerStates[idx]
        };
      })
      .filter(Boolean)
  );
}
