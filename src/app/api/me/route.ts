import { ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return ok({ user: null, claimedAccounts: [], recentEvents: [] });

    const [claimedAccounts, myReports] = await Promise.all([
      Promise.all((user.claimedAccounts ?? []).slice(0, 10).map((id) => accountsRepo.findById(id))).catch(() => []),
      reportsRepo.listByReporter(user._id, 10).catch(() => [])
    ]);

    // Map reports into the shape the profile UI expects (eventType, description, timestamp, status).
    const recentEvents = myReports.map((report) => ({
      _id: report._id,
      eventType: report.type,
      description: report.description,
      subjectId: report.accountId,
      timestamp: report.createdAt ?? new Date().toISOString(),
      status: report.status,
      aiVerdict: report.aiVerdict,
      adminDecision: report.adminDecision
    }));

    return ok({
      user,
      claimedAccounts: claimedAccounts.filter(Boolean),
      recentEvents
    });
  } catch (err) {
    console.error('[GET /api/me]', err);
    return ok({ user: null, claimedAccounts: [], recentEvents: [] });
  }
}
