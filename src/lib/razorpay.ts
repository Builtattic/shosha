import Razorpay from 'razorpay';

let cached: Razorpay | null = null;

/** Lazy shared Razorpay client. Both /api/me/upgrade/order and /verify use this. */
export function razorpay(): Razorpay {
  if (cached) return cached;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
  cached = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return cached;
}
