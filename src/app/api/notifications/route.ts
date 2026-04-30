import { ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import * as notificationsRepo from '@/lib/repos/notifications';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return ok({
      items: [
        {
          id: 'signed-out',
          kind: 'system',
          title: 'Sign in to save your activity',
          body: 'Create reports, upload evidence, and track your filings from one account.',
          read: true,
          link: '/sign-in',
          createdAt: new Date().toISOString()
        }
      ],
      unread: 0
    });
  }

  const [items, unread] = await Promise.all([
    notificationsRepo.listForUser(user._id, 50),
    notificationsRepo.unreadCount(user._id)
  ]);

  return ok({
    items: items.map((n) => ({
      id: n._id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      link: n.link,
      meta: n.meta,
      read: n.read,
      createdAt: n.createdAt
    })),
    unread
  });
}
