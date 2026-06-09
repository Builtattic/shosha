import { USE_MOCKS, apiClient } from '@/lib/apiClient';
import * as mock from '@/mocks/notifications';
import type { ApiResponse, PaginatedResponse } from '@/types/common';
import type { NotificationItem } from '@/mocks/notifications';

export type { NotificationItem };

const real = {
  getNotifications: async (cursor?: string): Promise<ApiResponse<PaginatedResponse<NotificationItem>>> => {
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (cursor) params.set('cursor', cursor);
      const response = await apiClient.get(`/notifications?${params}`);
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },

  getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
    try {
      const response = await apiClient.get('/notifications/unread-count');
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },

  markAsRead: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    try {
      const response = await apiClient.post(`/notifications/${id}/read`);
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  
  markAllAsRead: async (): Promise<ApiResponse<{ success: boolean }>> => {
    try {
      const response = await apiClient.post(`/notifications/read-all`);
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }
};

export const getNotifications = USE_MOCKS ? mock.getNotifications : real.getNotifications;
export const getUnreadCount   = USE_MOCKS ? mock.getUnreadCount   : real.getUnreadCount;
export const markAsRead       = USE_MOCKS ? mock.markAsRead       : real.markAsRead;
export const markAllAsRead    = USE_MOCKS ? mock.markAllAsRead    : real.markAllAsRead;
