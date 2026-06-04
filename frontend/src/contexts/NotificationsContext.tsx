import { createContext, useContext, useEffect, useState } from 'react';

// ── Context shape ──────────────────────────────────────────────────────────────
interface NotificationsContextType {
  unreadCount: number;
  /** Call after the user views their notifications to clear the badge. */
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextType>({
  unreadCount: 0,
  markAllRead: () => {},
});

// ── Provider ───────────────────────────────────────────────────────────────────
// Stub — polls /api/notifications/unread-count every 60 s once the backend
// endpoint is live. Until then, count stays at 0.
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      try {
        const res = await fetch('/api/notifications/unread-count');
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setUnreadCount(json?.data?.count ?? 0);
      } catch {
        // Silently ignore — backend not live yet
      }
    }

    fetchCount();
    const timer = setInterval(fetchCount, 60_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  return (
    <NotificationsContext.Provider value={{
      unreadCount,
      markAllRead: () => setUnreadCount(0),
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
