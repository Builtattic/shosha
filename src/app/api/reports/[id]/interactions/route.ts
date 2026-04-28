import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { getCurrentUser, requireUser } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import * as interactionsRepo from '@/lib/repos/reportInteractions';

const interactionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.enum(['align', 'oppose']) }),
  z.object({ action: z.literal('comment'), text: z.string().min(1).max(280) }),
  z.object({ action: z.literal('share') }),
  z.object({ action: z.literal('bookmark') })
]);

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No filing exists for that id.', 404);
  const user = await getCurrentUser();
  const state = await interactionsRepo.getViewerState(id.data, user?._id);
  return ok(state);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No filing exists for that id.', 404);

  const json = await request.json().catch(() => null);
  const parsed = interactionSchema.safeParse(json);
  if (!parsed.success) return fail('validation_error', 'Invalid interaction payload.', 422);

  if (parsed.data.action === 'share') {
    const result = await interactionsRepo.addShare(id.data);
    if (!result) return fail('not_found', 'No filing exists for that id.', 404);
    return ok(result);
  }

  let user;
  try {
    user = await requireUser();
  } catch {
    return fail('unauthorized', 'Sign in to interact with this filing.', 401);
  }

  if (parsed.data.action === 'align' || parsed.data.action === 'oppose') {
    const result = await interactionsRepo.setVote(id.data, user._id, parsed.data.action);
    if (!result) return fail('not_found', 'No filing exists for that id.', 404);
    return ok(result);
  }

  if (parsed.data.action === 'comment') {
    const result = await interactionsRepo.addComment(id.data, user._id, parsed.data.text);
    if (!result) return fail('not_found', 'No filing exists for that id.', 404);
    return ok(result);
  }

  return ok(await interactionsRepo.toggleBookmark(id.data, user._id));
}
