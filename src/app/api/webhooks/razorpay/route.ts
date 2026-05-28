import crypto from 'crypto';
import { ok, fail } from '@/lib/api';
import * as usersRepo from '@/lib/repos/users';
import * as notificationsRepo from '@/lib/repos/notifications';
import * as accountsRepo from '@/lib/repos/accounts';
import { calcCredibility } from '@/lib/credibility';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  if (!signature) return fail('forbidden', 'Missing signature.', 403);

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] RAZORPAY_WEBHOOK_SECRET not set');
    return fail('internal_error', 'Webhook not configured.', 500);
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (expected !== signature) {
    return fail('forbidden', 'Signature mismatch.', 403);
  }

  let event: { event: string; payload: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return fail('validation_error', 'Invalid JSON.', 400);
  }

  const subscriptionEntity = (
    (event.payload?.subscription as Record<string, unknown>)?.entity
  ) as Record<string, unknown> | undefined;

  const subscriptionId = subscriptionEntity?.id as string | undefined;
  const notes = subscriptionEntity?.notes as Record<string, string> | undefined;
  const userId = notes?.userId;

  if (!userId || !subscriptionId) return ok({ received: true });

  const user = await usersRepo.findById(userId);
  if (!user) return ok({ received: true });

  if (user.trustBadgeSubscriptionId !== subscriptionId) {
    return ok({ received: true });
  }

  switch (event.event) {
    case 'subscription.charged': {
      await usersRepo.update(userId, {
        trustBadgeSubscriptionStatus: 'active',
        trustBadgeSubscriptionRenewedAt: new Date().toISOString(),
      });
      break;
    }

    case 'subscription.cancelled':
    case 'subscription.completed': {
      const cred = calcCredibility({ ...user, trustBadge: false });
      await usersRepo.update(userId, {
        trustBadge: false,
        trustBadgeAt: '',
        trustBadgeSubscriptionStatus: 'cancelled',
        credibility: cred.total,
      });

      const claimed = await accountsRepo.listClaimedBy(userId);
      const website = claimed.find((a) => a.platform === 'website');
      if (website) {
        await accountsRepo.update(website._id, { trustBadge: false });
      }

      await notificationsRepo.create({
        userId,
        kind: 'trust_badge_cancelled' as Parameters<typeof notificationsRepo.create>[0]['kind'],
        title: 'Trust Badge Cancelled',
        body: 'Your Trust Badge subscription has ended. Re-subscribe to restore your badge.',
        link: '/profile/upgrade',
      });
      break;
    }

    case 'subscription.halted': {
      await usersRepo.update(userId, {
        trustBadgeSubscriptionStatus: 'halted',
      });
      await notificationsRepo.create({
        userId,
        kind: 'trust_badge_payment_failed' as Parameters<typeof notificationsRepo.create>[0]['kind'],
        title: 'Trust Badge Payment Failed',
        body: 'We could not charge your payment method. Please update it to keep your badge.',
        link: '/profile/upgrade',
      });
      break;
    }

    default:
      break;
  }

  return ok({ received: true });
}
