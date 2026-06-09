import type { ApiResponse, PaginatedResponse } from '@/types/common';

export interface NotificationItem {
  id: string;
  type: 'REPORT_VOTED' | 'REPORT_COMMENTED' | 'MODERATION_DECISION' | 'SYSTEM';
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  link?: string;
  metadata?: Record<string, any>;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'not_1',
    type: 'REPORT_VOTED',
    title: 'New align on your report',
    body: 'Someone aligned with your report against @satyanadella.',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    link: '/reports/rep_001',
  },
  {
    id: 'not_2',
    type: 'MODERATION_DECISION',
    title: 'Report Approved',
    body: 'Your report on @elonmusk has been reviewed and approved.',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    link: '/reports/rep_002',
  },
];

let unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length;

export async function getNotifications(_cursor?: string): Promise<ApiResponse<PaginatedResponse<NotificationItem>>> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { ok: true, data: { items: MOCK_NOTIFICATIONS, next_cursor: null } };
}

export async function getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return { ok: true, data: { count: unreadCount } };
}

export async function markAsRead(id: string): Promise<ApiResponse<{ success: boolean }>> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const notif = MOCK_NOTIFICATIONS.find(n => n.id === id);
  if (notif && !notif.read) {
    notif.read = true;
    unreadCount = Math.max(0, unreadCount - 1);
  }
  return { ok: true, data: { success: true } };
}

export async function markAllAsRead(): Promise<ApiResponse<{ success: boolean }>> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  MOCK_NOTIFICATIONS.forEach(n => { n.read = true; });
  unreadCount = 0;
  return { ok: true, data: { success: true } };
}
