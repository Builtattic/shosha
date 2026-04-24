import bcrypt from 'bcrypt';
import { connectDb } from '@/lib/db';
import { fail, fromZod, ok } from '@/lib/api';
import { getRequestKey, assertLimit, rateLimits } from '@/lib/ratelimit';
import { signupSchema } from '@/lib/validators';
import { User } from '@/models/User';

export async function POST(request: Request) {
  const limit = await assertLimit(rateLimits.signup, getRequestKey(request));
  if (!limit.allowed) return fail('rate_limited', 'Too many signup attempts. Return after the file cools.', 429);

  const json = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  await connectDb();
  const existing = await User.findOne({
    $or: [{ username: parsed.data.username }, { email: parsed.data.email }]
  });
  if (existing) return fail('duplicate_user', 'That identity is already in the archive.', 409);

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await User.create({
    username: parsed.data.username,
    email: parsed.data.email,
    passwordHash
  });

  return ok({ id: user._id.toString(), username: user.username, email: user.email }, 201);
}
