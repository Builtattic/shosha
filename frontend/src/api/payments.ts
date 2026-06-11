import { apiClient } from '@/lib/apiClient';

export interface UpgradeOrderResponse {
  subscriptionId: string;
  keyId: string;
  currency: 'USD' | 'INR';
  isSubscription: boolean;
}

export interface VerifyPaymentPayload {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
  selfie_url: string;
  doc_url: string;
  doc_type: 'passport' | 'license' | 'national';
}

export async function createUpgradeOrder(
  currency: 'USD' | 'INR',
): Promise<UpgradeOrderResponse> {
  const res = await apiClient.post<UpgradeOrderResponse>('/me/upgrade/order', {
    currency,
  });
  return res.data;
}

export async function verifyUpgradePayment(
  payload: VerifyPaymentPayload,
): Promise<{ success: boolean; pending: boolean }> {
  const res = await apiClient.post<{ success: boolean; pending: boolean }>(
    '/me/upgrade/verify',
    payload,
  );
  return res.data;
}
