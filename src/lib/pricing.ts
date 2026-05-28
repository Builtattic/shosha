export const TRUST_BADGE_USD = 1;
export const TRUST_BADGE_INR = 99;
export const USD_TO_INR_RATE = 95.72;
export const TRUST_BADGE_BILLING_CYCLE = 'monthly' as const;

export type PlanCurrency = 'USD' | 'INR';

export function getPlanId(currency: PlanCurrency): string {
  return currency === 'INR'
    ? process.env.RAZORPAY_PLAN_ID_INR!
    : process.env.RAZORPAY_PLAN_ID_USD!;
}
