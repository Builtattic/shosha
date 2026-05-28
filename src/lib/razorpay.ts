import Razorpay from 'razorpay';
import type { PlanCurrency } from '@/lib/pricing';
import { getPlanId } from '@/lib/pricing';

let cached: Razorpay | null = null;

export function razorpay(): Razorpay {
  if (cached) return cached;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials missing.');
  }
  cached = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return cached;
}

/**
 * Creates a Razorpay subscription for the given user and currency.
 * Picks the correct plan_id based on currency.
 */
export async function createTrustBadgeSubscription(
  userId: string,
  currency: PlanCurrency
): Promise<{ id: string; currency: PlanCurrency }> {
  const planId = getPlanId(currency);
  const rzp = razorpay();

  const subscription = await rzp.subscriptions.create({
    plan_id: planId,
    customer_notify: 1,
    quantity: 1,
    total_count: 120,
    notes: {
      userId,
      purpose: 'trust_badge',
      currency,
    },
  });

  return { id: subscription.id as string, currency };
}
