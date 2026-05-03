import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { disputeCreateSchema } from '@/lib/validators';
import * as disputesRepo from '@/lib/repos/disputes';
import * as reportsRepo from '@/lib/repos/reports';
import * as accountsRepo from '@/lib/repos/accounts';
import * as notificationsRepo from '@/lib/repos/notifications';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in to view your disputes.', 401);

  const disputes = await disputesRepo.listForUser(user._id, 50);
  if (disputes.length === 0) return ok([]);

  // Hydrate each dispute with the report + account it references.
  const reports = await Promise.all(disputes.map((d) => reportsRepo.findById(d.reportId)));
  const accountIds = Array.from(
    new Set(disputes.map((d) => d.accountId).concat(reports.filter(Boolean).map((r) => r!.accountId)))
  );
  const accounts = await Promise.all(accountIds.map((id) => accountsRepo.findById(id)));
  const accountMap = new Map(
    accounts.filter((a): a is NonNullable<typeof a> => Boolean(a)).map((a) => [a._id, a])
  );

  return ok(
    disputes.map((d, idx) => ({
      ...d,
      report: reports[idx]
        ? {
            _id: reports[idx]!._id,
            type: reports[idx]!.type,
            description: reports[idx]!.description,
            status: reports[idx]!.status,
            createdAt: reports[idx]!.createdAt
          }
        : null,
      account: accountMap.get(d.accountId)
        ? {
            _id: accountMap.get(d.accountId)!._id,
            displayName: accountMap.get(d.accountId)!.displayName,
            username: accountMap.get(d.accountId)!.username,
            avatarUrl: accountMap.get(d.accountId)!.avatarUrl,
            platform: accountMap.get(d.accountId)!.platform
          }
        : null
    }))
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in to file a dispute.', 401);

  const json = await request.json().catch(() => null);
  const parsed = disputeCreateSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const report = await reportsRepo.findById(parsed.data.reportId);
  if (!report) return fail('not_found', 'No filing exists for that id.', 404);
  if (report.status === 'pending_ai' || report.status === 'flagged') {
    return fail('forbidden', 'This filing is still under review — disputes open after adjudication.', 403);
  }

  const account = await accountsRepo.findById(report.accountId);
  if (!account) return fail('not_found', 'No account exists for that filing.', 404);

  // Only the verified owner of the subject account may dispute filings on it.
  if (account.claimedBy !== user._id) {
    return fail(
      'forbidden',
      'Only the verified owner of this account can file disputes against its filings. Submit an ownership claim first.',
      403
    );
  }

  const dispute = await disputesRepo.create({
    userId: user._id,
    accountId: account._id,
    reportId: report._id,
    disputeType: parsed.data.disputeType,
    reason: parsed.data.reason,
    evidenceUrl: parsed.data.evidenceUrl
  });

  // Optional: notify the original reporter that their filing is being disputed.
  if (report.reporterId && report.reporterId !== user._id) {
    await notificationsRepo.create({
      userId: report.reporterId,
      kind: 'dispute_resolved',
      title: 'Your filing is being disputed',
      body: `The owner of ${account.displayName || account.username} has filed a dispute against your filing. A moderator will review.`,
      link: `/account/${account._id}`,
      meta: { reportId: report._id, disputeId: dispute._id }
    });
  }

  return ok(dispute, 201);
}
