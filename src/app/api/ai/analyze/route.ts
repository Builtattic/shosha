import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { adjudicateReport } from '@/lib/gemini';
import { fail, ok } from '@/lib/api';
import { reportCreateSchema } from '@/lib/validators';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return fail('forbidden', 'Only tribunal staff can run direct analysis.', 403);
  const json = await request.json().catch(() => null);
  const parsed = reportCreateSchema.safeParse(json);
  if (!parsed.success) return fail('validation_error', 'Analysis payload is incomplete.', 422);
  const verdict = await adjudicateReport({
    description: parsed.data.description,
    feelings: parsed.data.feelings,
    type: parsed.data.type,
    accountDisplayName: parsed.data.accountId,
    platform: 'unknown'
  });
  return ok(verdict);
}
