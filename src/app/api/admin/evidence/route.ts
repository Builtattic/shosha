import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import * as evidenceRepo from '@/lib/repos/evidenceProposals';

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can inspect Shosha evidence.', 403);
  return ok(await evidenceRepo.listPending(150));
}
