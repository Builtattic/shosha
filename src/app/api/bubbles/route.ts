import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import * as bubblesRepo from '@/lib/repos/bubbles';
import * as usersRepo from '@/lib/repos/users';

const createBubbleSchema = z.object({
  name: z.string().min(2).max(80),
  tagline: z.string().max(120).optional(),
  description: z.string().min(10).max(500),
  type: z.enum(['family', 'friend_group', 'college_group', 'work_group', 'company', 'sports_group', 'other']),
  category: z.string().max(80).optional(),
  coverImageUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  visibility: z.enum(['public', 'private']).default('public'),
  sourceLinks: z.array(z.string().url()).max(8).optional(),
  invitedUsernames: z.array(z.string().min(1).max(120)).max(25).optional(),
});

export async function GET() {
  const bubbles = await bubblesRepo.list(60);
  const withMembers = await Promise.all(
    bubbles.map(async (bubble) => {
      const members = await bubblesRepo.listMembers(bubble._id).catch(() => []);
      return { ...bubble, memberCount: members.length, topMembers: members.slice(0, 5) };
    })
  );
  return ok(withMembers);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in to create a bubble.', 401);
  const json = await request.json().catch(() => null);
  const parsed = createBubbleSchema.safeParse(json);
  if (!parsed.success) return fail('validation_error', parsed.error.errors[0]?.message ?? 'Invalid bubble.', 422);

  if (parsed.data.type === 'college_group' && !isAdmin(user)) {
    return fail('forbidden', 'College bubbles must be created by an admin profile.', 403);
  }

  const { invitedUsernames, ...bubbleInput } = parsed.data;
  const bubble = await bubblesRepo.create({
    ...bubbleInput,
    createdBy: user._id,
    createdByAdmin: isAdmin(user),
  });
  if (invitedUsernames?.length) {
    const uniqueUsernames = Array.from(new Set(invitedUsernames.map((name) => name.trim().toLowerCase()).filter(Boolean)));
    await Promise.all(uniqueUsernames.map(async (username) => {
      const invitee = await usersRepo.findByUsername(username).catch(() => null);
      if (invitee && invitee._id !== user._id) {
        await bubblesRepo.requestJoin(bubble._id, invitee._id).catch(() => null);
      }
    }));
  }
  return ok(bubble, 201);
}
