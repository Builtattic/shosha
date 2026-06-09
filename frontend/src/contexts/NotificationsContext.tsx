import { createContext, useContext, useEffect, useState } from 'react';
import { getUnreadCount } from '@/api/notifications';

// ── Context shape ──────────────────────────────────────────────────────────────
interface NotificationsContextType {
  unreadCount: number;
  /** Call after the user views their notifications to clear the badge. */
  markAllRead: () => void;
  refreshCount: () => void;
}

const NotificationsContext = createContext<NotificationsContextType>({
  unreadCount: 0,
  markAllRead: () => {},
  refreshCount: () => {},
});

// ── Provider ───────────────────────────────────────────────────────────────────
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = async (cancelled = false) => {
    try {
      const res = await getUnreadCount();
      if (!cancelled && res.ok && res.data) {
        setUnreadCount(res.data.count);
      }
    } catch {
      // Silently ignore
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchCount(cancelled);
    const timer = setInterval(() => fetchCount(cancelled), 60_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  return (
    <NotificationsContext.Provider value={{
      unreadCount,
      markAllRead: () => setUnreadCount(0),
      refreshCount: () => fetchCount(),
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
