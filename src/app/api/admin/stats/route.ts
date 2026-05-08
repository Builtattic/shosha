import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { cached } from '@/lib/cache';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can inspect stats.', 403);

  const data = await cached('shosha:v1:admin:stats', 20, async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [accountsTracked, filingsTotal, filingsLast7, queueDepth, decided] = await Promise.all([
      accountsRepo.count(),
      reportsRepo.count(),
      reportsRepo.countSince(sevenDaysAgo),
      reportsRepo.countByStatus(['ai_reviewed', 'pending_ai', 'flagged']),
      reportsRepo.listDecided()
    ]);

    const agreed = decided.filter((report) => {
      const proposed = Number(report.aiVerdict?.proposedImpact ?? 0);
      const finalImpact = Number(report.adminDecision?.finalImpact ?? 0);
      if (report.status === 'rejected') return proposed === 0 || report.aiVerdict?.valid === false;
      return Math.sign(proposed) === Math.sign(finalImpact);
    }).length;

    return {
      accountsTracked,
      filingsTotal,
      filingsLast7,
      queueDepth,
      aiAgreementRate: decided.length ? Math.round((agreed / decided.length) * 100) : 0
    };
  });

  return ok(data);
}
