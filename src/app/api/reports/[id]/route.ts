import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDb } from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { objectIdSchema } from '@/lib/validators';
import { serializeDoc } from '@/lib/utils';
import { Report } from '@/models/Report';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = objectIdSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No filing exists for that id.', 404);
  const session = await getServerSession(authOptions);

  await connectDb();
  const report = await Report.findById(id.data).populate('accountId').lean();
  if (!report) return fail('not_found', 'No filing exists for that id.', 404);
  if (!session && !['approved', 'ai_reviewed'].includes(String(report.status))) {
    return fail('forbidden', 'That filing is still under seal.', 403);
  }
  return ok(serializeDoc(report));
}
