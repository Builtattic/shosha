import Razorpay from 'razorpay';
import { ok, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in to continue.', 401);

  if (user.trustBadge) {
    return fail('validation_error', 'Trust Badge already active.', 400);
  }

  try {
    const order = await razorpay.orders.create({
      amount: 19900,
      currency: 'INR',
      receipt: `tb_${user._id.slice(0, 20)}_${Date.now().toString().slice(-8)}`,
      notes: {
        userId: user._id,
        purpose: 'trust_badge',
      },
    });

    return ok({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('[POST /api/me/upgrade/order]', error);
    return fail('internal_error', 'Could not create payment order.', 500);
  }
}
