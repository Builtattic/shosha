import { fail, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import * as disputesRepo from '@/lib/repos/disputes';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in required.', 401);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No dispute exists for that id.', 404);

  const dispute = await disputesRepo.findById(id.data);
  if (!dispute) return fail('not_found', 'No dispute exists for that id.', 404);
  if (dispute.userId !== user._id) return fail('forbidden', 'You can only withdraw your own disputes.', 403);
  if (dispute.status !== 'pending' && dispute.status !== 'under_review') {
    return fail('conflict', 'This dispute has already been resolved.', 409);
  }

  const updated = await disputesRepo.withdraw(id.data);
  return ok(updated);
}
