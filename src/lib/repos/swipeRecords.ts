import { adminDb } from '@/lib/firebase/admin';
import { withId } from '@/lib/repos/_serialize';
import { swipeDelta, type SwipeDirection } from '@/lib/swipeRules';

export type SwipeRecord = {
  _id: string;
  accountId: string;
  userId: string;
  direction: SwipeDirection;
  delta: 5 | -5;
  createdAt: string;
  updatedAt: string;
};

function db() {
  return adminDb();
}

function safeKey(accountId: string, userId: string) {
  return `${accountId}__${userId}`.replace(/[.#$/[\]]/g, '_');
}

export function deltaForDirection(direction: SwipeDirection): 5 | -5 {
  return swipeDelta(direction);
}

export async function upsertSwipe(input: {
  accountId: string;
  userId: string;
  direction: SwipeDirection;
}) {
  const key = safeKey(input.accountId, input.userId);
  const now = new Date().toISOString();
  const existing = await db().ref(`swipeRecords/${key}`).once('value');
  const createdAt = existing.val()?.createdAt ?? now;
  const payload = {
    accountId: input.accountId,
    userId: input.userId,
    direction: input.direction,
    delta: deltaForDirection(input.direction),
    createdAt,
    updatedAt: now,
  };
  await db().ref(`swipeRecords/${key}`).set(payload);
  return { _id: key, ...payload } as SwipeRecord;
}

export async function getAccountSwipeScore(accountId: string) {
  const snap = await db().ref('swipeRecords').orderByChild('accountId').equalTo(accountId).once('value');
  let score = 0;
  let aligns = 0;
  let opposes = 0;
  snap.forEach((child) => {
    const value = child.val() ?? {};
    const delta = Number(value.delta ?? 0);
    score += Number.isFinite(delta) ? delta : 0;
    if (value.direction === 'align') aligns += 1;
    if (value.direction === 'oppose') opposes += 1;
  });
  return { score, aligns, opposes };
}

export async function listForUser(userId: string): Promise<SwipeRecord[]> {
  const snap = await db().ref('swipeRecords').orderByChild('userId').equalTo(userId).once('value');
  const out: SwipeRecord[] = [];
  snap.forEach((child) => {
    out.push(withId<SwipeRecord>(child.key!, child.val()));
  });
  return out;
}

export async function listForAccount(accountId: string): Promise<SwipeRecord[]> {
  const snap = await db().ref('swipeRecords').orderByChild('accountId').equalTo(accountId).once('value');
  const out: SwipeRecord[] = [];
  snap.forEach((child) => {
    out.push(withId<SwipeRecord>(child.key!, child.val()));
  });
  return out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}
