import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { connectDb } from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { runFullAudit } from '@/lib/gemini';
import { objectIdSchema } from '@/lib/validators';
import { serializeDoc } from '@/lib/utils';
import { Account } from '@/models/Account';
import { AuditRequest } from '@/models/AuditRequest';
import { Report } from '@/models/Report';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return fail('forbidden', 'Only tribunal staff can run audits.', 403);
  const id = objectIdSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No audit exists for that id.', 404);

  await connectDb();
  const audit = await AuditRequest.findById(id.data);
  if (!audit) return fail('not_found', 'No audit exists for that id.', 404);
  const account = await Account.findById(audit.accountId);
  if (!account) return fail('not_found', 'No dossier exists for that audit.', 404);

  audit.status = 'in_progress';
  await audit.save();
  const approvedReports = await Report.find({ accountId: account._id, status: 'approved' }).lean();
  const result = await runFullAudit({
    account: {
      score: account.score,
      displayName: account.displayName,
      platform: account.platform,
      breakdown: account.breakdown
    },
    approvedReports,
    recentPosts: account.posts
  });

  account.score = result.newScore;
  account.breakdown = result.breakdown;
  account.scoreHistory.push({ t: new Date(), s: result.newScore, cause: 'audit' });
  audit.status = 'completed';
  await account.save();
  await audit.save();

  return ok(serializeDoc({ audit, account, summary: result.summary }));
}
