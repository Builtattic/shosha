import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { runFullAudit } from '@/lib/gemini';
import { idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as auditsRepo from '@/lib/repos/auditRequests';
import * as reportsRepo from '@/lib/repos/reports';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can run audits.', 403);
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No audit exists for that id.', 404);

  const audit = await auditsRepo.findById(id.data);
  if (!audit) return fail('not_found', 'No audit exists for that id.', 404);
  const account = await accountsRepo.findById(audit.accountId);
  if (!account) return fail('not_found', 'No dossier exists for that audit.', 404);

  await auditsRepo.update(id.data, { status: 'in_progress' });
  const approvedReports = await reportsRepo.listForAccount(account._id, ['approved'], 200);
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

  const updatedAccount = await accountsRepo.update(account._id, {
    score: result.newScore,
    breakdown: result.breakdown,
    scoreHistory: [...account.scoreHistory, { t: new Date().toISOString(), s: result.newScore, cause: 'audit' }]
  });
  const updatedAudit = await auditsRepo.update(id.data, { status: 'completed' });

  return ok({ audit: updatedAudit, account: updatedAccount, summary: result.summary });
}
