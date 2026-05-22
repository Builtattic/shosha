'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type NotificationsContextValue = {
  unreadCount: number;
  refresh: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue>({
  unreadCount: 0,
  refresh: () => {},
});

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      const data = await response.json();
      if (data?.ok) {
        const payload = data.data ?? {};
        setUnreadCount(
          typeof payload.unread === 'number'
            ? payload.unread
            : (payload.items ?? []).filter((item: { read?: boolean }) => !item.read).length
        );
      }
    } catch {
      // Silent by design; keep current badge count on transient failures.
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <NotificationsContext.Provider value={{ unreadCount, refresh }}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
