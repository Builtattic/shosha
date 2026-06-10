import type { ApiResponse, PaginatedResponse } from '@/types/common';

export type NotificationType =
  | 'CLAIM'
  | 'REPORT'
  | 'DISPUTE'
  | 'TRUST_BADGE'
  | 'MODERATION'
  | 'SYSTEM';

export interface NotificationItem {
  id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata_json?: Record<string, unknown> | null;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'not_1',
    notification_type: 'REPORT',
    title: 'New align on your report',
    message: 'Someone aligned with your report against @satyanadella.',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'not_2',
    notification_type: 'MODERATION',
    title: 'Report Approved',
    message: 'Your report on @elonmusk has been reviewed and approved.',
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
];

let unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.is_read).length;

export async function getNotifications(
  _cursor?: string,
): Promise<ApiResponse<PaginatedResponse<NotificationItem>>> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { ok: true, data: { items: MOCK_NOTIFICATIONS, next_cursor: null } };
}

export async function getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return { ok: true, data: { count: unreadCount } };
}

export async function markAsRead(id: string): Promise<ApiResponse<{ success: boolean }>> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const notif = MOCK_NOTIFICATIONS.find((n) => n.id === id);
  if (notif && !notif.is_read) {
    notif.is_read = true;
    unreadCount = Math.max(0, unreadCount - 1);
  }
  return { ok: true, data: { success: true } };
}

export async function markAllAsRead(): Promise<ApiResponse<{ success: boolean }>> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  MOCK_NOTIFICATIONS.forEach((n) => {
    n.is_read = true;
  });
  unreadCount = 0;
  return { ok: true, data: { success: true } };
}
