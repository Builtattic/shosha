import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDb } from '@/lib/db';
import { fail, fromZod, ok } from '@/lib/api';
import { accountCreateSchema } from '@/lib/validators';
import { averageBreakdown } from '@/lib/scoring';
import { fetchSocialProfile, socialErrorResponse } from '@/lib/social';
import { serializeDoc } from '@/lib/utils';
import { Account } from '@/models/Account';

export async function GET() {
  await connectDb();
  const accounts = await Account.find({}).sort({ score: -1 }).limit(50).lean();
  return ok(serializeDoc(accounts));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail('unauthorized', 'Sign in before opening a new dossier.', 401);

  const json = await request.json().catch(() => null);
  const parsed = accountCreateSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  await connectDb();
  const existing = await Account.findOne({
    platform: parsed.data.platform,
    username: parsed.data.username
  }).lean();
  if (existing) return ok(serializeDoc(existing), 200);

  let profile;
  try {
    profile = await fetchSocialProfile(parsed.data.platform, parsed.data.username);
  } catch (error) {
    const response = socialErrorResponse(error);
    return fail(response.code, response.message, response.status);
  }

  const displayName = parsed.data.displayName ?? profile.displayName;
  const account = await Account.create({
    platform: profile.platform,
    username: profile.username,
    displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    verified: profile.verified,
    followers: profile.followers,
    score: 60,
    scoreHistory: [{ t: new Date(), s: 60, cause: 'seed' }],
    breakdown: averageBreakdown(),
    posts: profile.posts
  });

  return ok(serializeDoc(account), 201);
}
