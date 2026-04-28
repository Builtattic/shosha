import { fail, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import * as reportsRepo from '@/lib/repos/reports';
import * as accountsRepo from '@/lib/repos/accounts';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No filing exists for that id.', 404);
  const user = await getCurrentUser();

  const report = await reportsRepo.findById(id.data);
  if (!report) return fail('not_found', 'No filing exists for that id.', 404);
  if (!user && !['approved', 'ai_reviewed'].includes(report.status)) {
    return fail('forbidden', 'That filing is still under seal.', 403);
  }
  const account = await accountsRepo.findById(report.accountId);
  return ok({ ...report, account });
}
