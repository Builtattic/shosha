import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDb } from '@/lib/db';
import { fail, fromZod, ok } from '@/lib/api';
import { accountCreateSchema } from '@/lib/validators';
import { averageBreakdown } from '@/lib/scoring';
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
  const displayName = parsed.data.displayName ?? `@${parsed.data.username}`;
  const account = await Account.create({
    platform: parsed.data.platform,
    username: parsed.data.username,
    displayName,
    bio: 'Public profile ingestion is scaffolded until Instagram and X API access is wired.',
    avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
    verified: false,
    followers: 'pending',
    score: 60,
    scoreHistory: [{ t: new Date(), s: 60, cause: 'seed' }],
    breakdown: averageBreakdown(),
    posts: [
      {
        externalId: `mock-${Date.now()}`,
        content: 'Profile capture placeholder. Live social ingestion is marked for a future phase.',
        likes: '0',
        replies: '0',
        capturedAt: new Date()
      }
    ]
  });

  return ok(serializeDoc(account), 201);
}
