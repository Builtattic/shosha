export type TrustBadgeStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type SubscriptionTier = 'free' | 'pro' | 'business';

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  price_monthly: number;
  price_annual: number;
  features: string[];
}

export interface TrustBadgeApplication {
  id: string;
  account_id: string;
  status: TrustBadgeStatus;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  description: string;
  status: 'succeeded' | 'failed' | 'pending';
  created_at: string;
}
