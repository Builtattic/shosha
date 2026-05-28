import { adminDb } from '@/lib/firebase/admin';
import { stripUndefined } from '@/lib/repos/_serialize';

export type NotificationKind =
  | 'report_approved'
  | 'report_rejected'
  | 'report_flagged'
  | 'report_comment'
  | 'report_align'
  | 'report_oppose'
  | 'claim_approved'
  | 'claim_rejected'
  | 'abuse_dismissed'
  | 'moderation_requested'
  | 'moderation_resolved'
  | 'deletion_requested'
  | 'deletion_resolved'
  | 'dispute_resolved'
  | 'trust_badge_approved'
  | 'trust_badge_rejected'
  | 'trust_badge_cancelled'
  | 'trust_badge_payment_failed'
  | 'system';

export type NotificationRecord = {
  _id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link?: string;
  meta?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
};

function ref(userId: string) {
  return adminDb().ref(`notifications/${userId}`);
}

export async function create(input: {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link?: string;
  meta?: Record<string, unknown>;
}): Promise<NotificationRecord | null> {
  if (!input.userId) return null;
  const payload = {
    userId: input.userId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    link: input.link ?? '',
    meta: input.meta ?? {},
    read: false,
    createdAt: new Date().toISOString()
  };
  const pushRef = await ref(input.userId).push(stripUndefined(payload));
  return { _id: pushRef.key!, ...payload };
}

export async function listForUser(userId: string, limit = 50): Promise<NotificationRecord[]> {
  const snap = await ref(userId).orderByChild('createdAt').limitToLast(limit).once('value');
  if (!snap.exists()) return [];
  const items: NotificationRecord[] = [];
  snap.forEach((child) => {
    const value = child.val() ?? {};
    items.push({
      _id: child.key!,
      userId: value.userId ?? userId,
      kind: value.kind ?? 'system',
      title: value.title ?? '',
      body: value.body ?? '',
      link: value.link ?? '',
      meta: value.meta ?? {},
      read: Boolean(value.read),
      createdAt: value.createdAt ?? ''
    });
  });
  return items.reverse();
}

export async function unreadCount(userId: string): Promise<number> {
  const snap = await ref(userId).orderByChild('read').equalTo(false).once('value');
  if (!snap.exists()) return 0;
  return snap.numChildren();
}

export async function markRead(userId: string, notificationId: string): Promise<void> {
  await ref(userId).child(notificationId).update({ read: true });
}

export async function markAllRead(userId: string): Promise<void> {
  const snap = await ref(userId).orderByChild('read').equalTo(false).once('value');
  if (!snap.exists()) return;
  const updates: Record<string, unknown> = {};
  snap.forEach((child) => {
    updates[`${child.key}/read`] = true;
  });
  await ref(userId).update(updates);
}
