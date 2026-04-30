import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import { scanPublicEvidence } from '@/lib/shoshaEvidence';
import * as accountsRepo from '@/lib/repos/accounts';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as evidenceRepo from '@/lib/repos/evidenceProposals';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can run Shosha evidence scans.', 403);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No profile exists for that id.', 404);

  const account = await accountsRepo.findById(id.data);
  if (!account) return fail('not_found', 'No profile exists for that id.', 404);

  await accountsRepo.update(account._id, { enrichmentStatus: 'pending' });
  const proposals = await scanPublicEvidence(account);
  const created = [];
  for (const proposal of proposals) {
    created.push(await evidenceRepo.create({ ...proposal, createdByAdminId: user!._id }));
  }
  const updated = await accountsRepo.update(account._id, {
    enrichmentStatus: created.length ? 'reviewed' : 'stale',
    evidenceSummary: created.length ? `${created.length} Shosha evidence proposals pending review.` : 'No source-backed evidence proposals were found.'
  });

  await adminActionsRepo.create({
    actor: user!,
    action: 'evidence.scan',
    entityType: 'evidence',
    entityId: account._id,
    before: account,
    after: { account: updated, proposals: created }
  });

  return ok({ proposals: created, account: updated }, 201);
}
