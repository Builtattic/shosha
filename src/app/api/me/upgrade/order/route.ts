import { ok, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { createTrustBadgeSubscription } from '@/lib/razorpay';
import * as usersRepo from '@/lib/repos/users';
import type { PlanCurrency } from '@/lib/pricing';
import { z } from 'zod';

export const runtime = 'nodejs';

const orderSchema = z.object({
  currency: z.enum(['USD', 'INR']),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in to continue.', 401);

  if (user.trustBadge) {
    return fail('validation_error', 'Trust Badge already active.', 400);
  }

  const json = await request.json().catch(() => null);
  const parsed = orderSchema.safeParse(json);
  if (!parsed.success) return fail('validation_error', 'Invalid payload.', 422);

  const currency = parsed.data.currency as PlanCurrency;

  // Return existing subscription if already pending
  if (user.trustBadgeSubscriptionId && user.trustBadgePending) {
    return ok({
      subscriptionId: user.trustBadgeSubscriptionId,
      keyId: process.env.RAZORPAY_KEY_ID,
      currency,
      isSubscription: true,
    });
  }

  try {
    const subscription = await createTrustBadgeSubscription(user._id, currency);

    await usersRepo.update(user._id, {
      trustBadgeSubscriptionId: subscription.id,
      trustBadgeSubscriptionStatus: 'created',
      trustBadgeSubscriptionCurrency: currency,
    });

    return ok({
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      currency,
      isSubscription: true,
    });
  } catch (error) {
    console.error('[POST /api/me/upgrade/order]', error);
    return fail('internal_error', 'Could not create subscription.', 500);
  }
}
