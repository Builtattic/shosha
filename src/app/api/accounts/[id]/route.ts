import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDb } from '@/lib/db';
import { fail, fromZod, ok } from '@/lib/api';
import { accountPatchSchema, objectIdSchema } from '@/lib/validators';
import { serializeDoc } from '@/lib/utils';
import { Account } from '@/models/Account';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = objectIdSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No dossier exists for that id.', 404);

  await connectDb();
  const account = await Account.findById(id.data).lean();
  if (!account) return fail('not_found', 'No dossier exists for that id.', 404);
  return ok(serializeDoc(account));
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return fail('unauthorized', 'Sign in before editing a dossier.', 401);
  const id = objectIdSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No dossier exists for that id.', 404);
  const json = await request.json().catch(() => null);
  const parsed = accountPatchSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  await connectDb();
  const account = await Account.findByIdAndUpdate(id.data, parsed.data, { new: true }).lean();
  if (!account) return fail('not_found', 'No dossier exists for that id.', 404);
  return ok(serializeDoc(account));
}
