import { fail, fromZod, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { auditRequestSchema, idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as auditsRepo from '@/lib/repos/auditRequests';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail('unauthorized', 'Sign in before requesting an audit.', 401);
  }
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No dossier exists for that id.', 404);
  const json = await request.json().catch(() => null);
  const parsed = auditRequestSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const account = await accountsRepo.findById(id.data);
  if (!account) return fail('not_found', 'No dossier exists for that id.', 404);
  if (user.role !== 'admin' && account.claimedBy !== user._id) {
    return fail('forbidden', 'Only the claimed owner can request this audit.', 403);
  }

  const audit = await auditsRepo.create({
    userId: user._id,
    accountId: id.data,
    reason: parsed.data.reason
  });

  return ok(audit, 201);
}
