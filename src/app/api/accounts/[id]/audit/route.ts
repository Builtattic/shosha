import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDb } from '@/lib/db';
import { fail, fromZod, ok } from '@/lib/api';
import { auditRequestSchema, objectIdSchema } from '@/lib/validators';
import { serializeDoc } from '@/lib/utils';
import { Account } from '@/models/Account';
import { AuditRequest } from '@/models/AuditRequest';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return fail('unauthorized', 'Sign in before requesting an audit.', 401);
  const id = objectIdSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No dossier exists for that id.', 404);
  const json = await request.json().catch(() => null);
  const parsed = auditRequestSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  await connectDb();
  const account = await Account.findById(id.data);
  if (!account) return fail('not_found', 'No dossier exists for that id.', 404);
  if (session.user.role !== 'admin' && account.claimedBy?.toString() !== session.user.id) {
    return fail('forbidden', 'Only the claimed owner can request this audit.', 403);
  }

  const audit = await AuditRequest.create({
    userId: session.user.id,
    accountId: id.data,
    reason: parsed.data.reason
  });

  return ok(serializeDoc(audit), 201);
}
