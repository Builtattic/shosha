import crypto from 'crypto';
import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import * as usersRepo from '@/lib/repos/users';

export const runtime = 'nodejs';

const verifySchema = z.object({
  razorpay_payment_id: z.string(),
  razorpay_subscription_id: z.string(),
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
    razorpay_payment_id,
    razorpay_subscription_id,
    razorpay_signature,
    selfieUrl,
    docUrl,
    docType,
  } = parsed.data;

  if (user.trustBadgePending) {
    return ok({ success: true, pending: true });
  }

  if (user.trustBadgeSubscriptionId !== razorpay_subscription_id) {
    return fail('forbidden', 'Subscription does not belong to this user.', 403);
  }

  // HMAC for subscriptions: payment_id|subscription_id
  const body = `${razorpay_payment_id}|${razorpay_subscription_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return fail('forbidden', 'Payment verification failed.', 403);
  }

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
    trustBadgeSubscriptionStatus: 'authenticated',
  });

  return ok({ success: true, pending: true });
}
