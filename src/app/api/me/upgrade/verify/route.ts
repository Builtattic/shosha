import crypto from 'crypto';
import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { razorpay } from '@/lib/razorpay';
import * as usersRepo from '@/lib/repos/users';

export const runtime = 'nodejs';

const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  selfieUrl: z.string().url(),
  docUrl: z.string().url(),
  docType: z.enum(['passport', 'license', 'national']),
});

function ownsUpload(url: string, userId: string): boolean {
  try {
    const decoded = decodeURIComponent(new URL(url).pathname);
    return decoded.includes(`uploads/${userId}/`);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in to continue.', 401);
  if (user.trustBadge) return fail('validation_error', 'Trust Badge already active.', 400);

  const json = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(json);
  if (!parsed.success) return fail('validation_error', 'Invalid payload.', 422);

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    selfieUrl,
    docUrl,
    docType,
  } = parsed.data;

  // Idempotency: replays of the same payment, or a still-pending submission,
  // should not silently overwrite trustBadgeSubmittedAt / clear a prior rejection.
  if (user.trustBadgePending) {
    return ok({ success: true, pending: true });
  }
  if (user.trustBadgePaymentId && user.trustBadgePaymentId === razorpay_payment_id) {
    return ok({ success: true, pending: true });
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return fail('forbidden', 'Payment verification failed.', 403);
  }

  // Bind the order to the current user — prevents replaying another user's
  // (order_id, payment_id, signature) triple from a different session.
  let order: Awaited<ReturnType<ReturnType<typeof razorpay>['orders']['fetch']>>;
  try {
    order = await razorpay().orders.fetch(razorpay_order_id);
  } catch {
    return fail('forbidden', 'Order could not be verified.', 403);
  }
  const notes = (order.notes ?? {}) as Record<string, string>;
  if (notes.userId !== user._id || notes.purpose !== 'trust_badge') {
    return fail('forbidden', 'Order does not belong to this user.', 403);
  }
  if (order.status !== 'paid') {
    return fail('validation_error', 'Order has not been paid.', 400);
  }

  // Media must have been uploaded by this user. Uploads are keyed
  // `uploads/${user._id}/...` in /api/media/upload, so we can prove ownership
  // from the URL path alone.
  if (!ownsUpload(selfieUrl, user._id) || !ownsUpload(docUrl, user._id)) {
    return fail('forbidden', 'Media was not uploaded by this user.', 403);
  }

  await usersRepo.update(user._id, {
    trustBadgePending: true,
    trustBadgeSubmittedAt: new Date().toISOString(),
    trustBadgeSelfieUrl: selfieUrl,
    trustBadgeDocUrl: docUrl,
    trustBadgeDocType: docType,
    trustBadgePaymentId: razorpay_payment_id,
    trustBadgeOrderId: razorpay_order_id,
  });

  return ok({ success: true, pending: true });
}
