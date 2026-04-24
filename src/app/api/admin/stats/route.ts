import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { connectDb } from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { Account } from '@/models/Account';
import { Report } from '@/models/Report';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return fail('forbidden', 'Only tribunal staff can inspect stats.', 403);
  await connectDb();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [accountsTracked, filingsTotal, filingsLast7, queueDepth, decided] = await Promise.all([
    Account.countDocuments({}),
    Report.countDocuments({}),
    Report.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    Report.countDocuments({ status: { $in: ['ai_reviewed', 'pending_ai', 'flagged'] } }),
    Report.find({ status: { $in: ['approved', 'rejected'] }, aiVerdict: { $ne: null } }).lean()
  ]);
  const agreed = decided.filter((report) => {
    const proposed = Number(report.aiVerdict?.proposedImpact ?? 0);
    const finalImpact = Number(report.adminDecision?.finalImpact ?? 0);
    if (report.status === 'rejected') return proposed === 0 || report.aiVerdict?.valid === false;
    return Math.sign(proposed) === Math.sign(finalImpact);
  }).length;

  return ok({
    accountsTracked,
    filingsTotal,
    filingsLast7,
    queueDepth,
    aiAgreementRate: decided.length ? Math.round((agreed / decided.length) * 100) : 0
  });
}
