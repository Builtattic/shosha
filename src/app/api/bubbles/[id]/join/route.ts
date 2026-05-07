import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import * as bubblesRepo from '@/lib/repos/bubbles';

const voteSchema = z.object({
  targetUserId: z.string().min(1).max(200).optional(),
  vote: z.enum(['approve', 'reject']).optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No bubble exists for that id.', 404);

  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in to join this bubble.', 401);

  const bubble = await bubblesRepo.findById(id.data);
  if (!bubble) return fail('not_found', 'No bubble exists for that id.', 404);

  const json = await request.json().catch(() => ({}));
  const parsed = voteSchema.safeParse(json);
  if (!parsed.success) return fail('validation_error', 'Invalid join action.', 422);

  if (parsed.data.targetUserId && parsed.data.vote) {
    const result = await bubblesRepo.voteJoinRequest({
      bubbleId: bubble._id,
      targetUserId: parsed.data.targetUserId,
      voterId: user._id,
      vote: parsed.data.vote,
    });
    if (!result) return fail('forbidden', 'Only members can vote on join requests.', 403);
    return ok(result);
  }

  const requestRecord = await bubblesRepo.requestJoin(bubble._id, user._id);
  return ok(requestRecord);
}
