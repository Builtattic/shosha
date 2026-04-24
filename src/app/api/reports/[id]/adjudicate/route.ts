import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { connectDb } from '@/lib/db';
import { fail, fromZod, ok } from '@/lib/api';
import { applyImpact } from '@/lib/scoring';
import { adjudicateSchema, objectIdSchema } from '@/lib/validators';
import { clamp, serializeDoc } from '@/lib/utils';
import { Account } from '@/models/Account';
import { Report } from '@/models/Report';
import { User } from '@/models/User';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return fail('forbidden', 'Only tribunal staff can decide a filing.', 403);
  const id = objectIdSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No filing exists for that id.', 404);
  const json = await request.json().catch(() => null);
  const parsed = adjudicateSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  await connectDb();
  const report = await Report.findById(id.data);
  if (!report) return fail('not_found', 'No filing exists for that id.', 404);
  const account = await Account.findById(report.accountId);
  if (!account) return fail('not_found', 'No dossier exists for that filing.', 404);

  report.adminDecision = {
    adminId: session!.user.id as any,
    verdict: parsed.data.verdict,
    finalImpact: parsed.data.verdict === 'approved' ? parsed.data.finalImpact : 0,
    note: parsed.data.note,
    decidedAt: new Date()
  };
  report.status = parsed.data.verdict === 'approved' ? 'approved' : 'rejected';

  if (parsed.data.verdict === 'approved') {
    applyImpact(
      account,
      parsed.data.finalImpact,
      'report',
      report.aiVerdict?.categoryTags.filter((tag) =>
        ['authenticity', 'engagement', 'community', 'content', 'impact'].includes(tag)
      ) ?? []
    );
    await account.save();
  }

  if (report.reporterId) {
    const delta = parsed.data.verdict === 'approved' ? 2 : -3;
    const reporter = await User.findById(report.reporterId);
    if (reporter) {
      reporter.reporterScore = clamp(reporter.reporterScore + delta);
      await reporter.save();
    }
  }

  await report.save();
  return ok(serializeDoc({ report, account }));
}
