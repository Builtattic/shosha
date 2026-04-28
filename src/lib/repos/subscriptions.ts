import { adminDb } from '@/lib/firebase/admin';
import { withId } from '@/lib/repos/_serialize';

export type SubscriptionRecord = {
  _id: string;
  userId: string;
  tier: 'free' | 'pro';
  dailyReportsUsed: number;
  dailyReportsResetAt: string;
  createdAt?: string;
  updatedAt?: string;
};

const FREE_DAILY_LIMIT = 5;
const PRO_DAILY_LIMIT = 50;

function ref() {
  return adminDb().ref('subscriptions');
}

async function getOrCreate(userId: string): Promise<SubscriptionRecord> {
  const snap = await ref().child(userId).once('value');
  if (snap.exists()) return withId<SubscriptionRecord>(snap.key!, snap.val());
  const now = new Date().toISOString();
  const payload: Omit<SubscriptionRecord, '_id'> = {
    userId,
    tier: 'free',
    dailyReportsUsed: 0,
    dailyReportsResetAt: now,
    createdAt: now,
    updatedAt: now
  };
  await ref().child(userId).set(payload);
  return { _id: userId, ...payload };
}

function needsReset(record: SubscriptionRecord): boolean {
  const resetAt = new Date(record.dailyReportsResetAt);
  const now = new Date();
  return now.toDateString() !== resetAt.toDateString();
}

export async function canReport(userId: string): Promise<{ allowed: boolean; remaining: number; tier: 'free' | 'pro' }> {
  const sub = await getOrCreate(userId);
  const limit = sub.tier === 'pro' ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
  if (needsReset(sub)) {
    await ref().child(userId).update({ dailyReportsUsed: 0, dailyReportsResetAt: new Date().toISOString() });
    return { allowed: true, remaining: limit - 1, tier: sub.tier };
  }
  const used = sub.dailyReportsUsed;
  return { allowed: used < limit, remaining: Math.max(0, limit - used), tier: sub.tier };
}

export async function canDispute(userId: string): Promise<{ allowed: boolean; tier: 'free' | 'pro' }> {
  const sub = await getOrCreate(userId);
  return { allowed: sub.tier === 'pro', tier: sub.tier };
}

export async function getUserTier(userId: string): Promise<'free' | 'pro'> {
  const sub = await getOrCreate(userId);
  return sub.tier;
}

export async function getSubscription(userId: string): Promise<SubscriptionRecord> {
  return getOrCreate(userId);
}

export async function incrementDailyReport(userId: string): Promise<void> {
  const sub = await getOrCreate(userId);
  if (needsReset(sub)) {
    await ref().child(userId).update({ dailyReportsUsed: 1, dailyReportsResetAt: new Date().toISOString() });
  } else {
    await ref().child(userId).update({ dailyReportsUsed: (sub.dailyReportsUsed || 0) + 1 });
  }
}

export async function upgradeToPro(userId: string): Promise<SubscriptionRecord> {
  await getOrCreate(userId);
  await ref().child(userId).update({ tier: 'pro', updatedAt: new Date().toISOString() });
  return (await getOrCreate(userId));
}

export async function downgradeToFree(userId: string): Promise<SubscriptionRecord> {
  await getOrCreate(userId);
  await ref().child(userId).update({ tier: 'free', updatedAt: new Date().toISOString() });
  return (await getOrCreate(userId));
}
