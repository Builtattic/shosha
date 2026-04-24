import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { anonymousTag } from '@/lib/anonymous';
import { connectDb } from '@/lib/db';
import { adjudicateReport } from '@/lib/gemini';
import { fail, fromZod, ok } from '@/lib/api';
import { assertLimit, getRequestKey, rateLimits } from '@/lib/ratelimit';
import { objectIdSchema, reportCreateSchema } from '@/lib/validators';
import { serializeDoc } from '@/lib/utils';
import { Account } from '@/models/Account';
import { Report } from '@/models/Report';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');

  await connectDb();
  if (accountId) {
    const id = objectIdSchema.safeParse(accountId);
    if (!id.success) return fail('validation_error', 'Invalid account id.', 422);
    const reports = await Report.find({ accountId: id.data, status: { $in: ['approved', 'ai_reviewed'] } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return ok(serializeDoc(reports));
  }

  if (!isAdmin(session)) return fail('forbidden', 'The tribunal archive is restricted.', 403);
  const reports = await Report.find({}).sort({ createdAt: -1 }).limit(100).lean();
  return ok(serializeDoc(reports));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const key = session ? session.user.id : getRequestKey(request);
  const limiter = session ? rateLimits.reportUser : rateLimits.reportAnon;
  const limit = await assertLimit(limiter, key);
  if (!limit.allowed) return fail('rate_limited', 'The filing desk is cooling down for this account.', 429);

  const json = await request.json().catch(() => null);
  const parsed = reportCreateSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  await connectDb();
  const account = await Account.findById(parsed.data.accountId);
  if (!account) return fail('not_found', 'No dossier exists for that report.', 404);

  const report = await Report.create({
    ...parsed.data,
    reporterId: session?.user.id ?? null,
    anonymousTag: session?.user.username ?? anonymousTag(request),
    status: 'pending_ai'
  });

  const verdict = await adjudicateReport({
    description: parsed.data.description,
    feelings: parsed.data.feelings,
    type: parsed.data.type,
    accountDisplayName: account.displayName,
    platform: account.platform,
    mediaDescription: `${parsed.data.media.type} proof was uploaded.`
  });

  report.aiVerdict = verdict;
  report.status = verdict.abuseFlags.length > 0 ? 'flagged' : 'ai_reviewed';
  await report.save();

  return ok(serializeDoc(report), 201);
}
