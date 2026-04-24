import { connectDb } from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { assertLimit, getRequestKey, rateLimits } from '@/lib/ratelimit';
import { searchSchema } from '@/lib/validators';
import { serializeDoc } from '@/lib/utils';
import { Account } from '@/models/Account';

export async function GET(request: Request) {
  const limit = await assertLimit(rateLimits.search, getRequestKey(request));
  if (!limit.allowed) return fail('rate_limited', 'The index needs a minute before another search.', 429);

  const { searchParams } = new URL(request.url);
  const parsed = searchSchema.safeParse({ q: searchParams.get('q') ?? '' });
  if (!parsed.success) return fail('validation_error', 'Search query is too long.', 422);

  await connectDb();
  const q = parsed.data.q.trim().toLowerCase();
  const query = q
    ? {
        $or: [
          { username: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
          { displayName: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
        ]
      }
    : {};
  const accounts = await Account.find(query).sort({ score: -1 }).limit(20).lean();
  return ok(serializeDoc(accounts));
}
