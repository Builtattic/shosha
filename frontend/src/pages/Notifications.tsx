import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCircle2,
  Circle,
  AlertTriangle,
  UserCheck,
  ClipboardList,
  Scale,
  BadgeCheck,
  Shield,
} from 'lucide-react';
import { getNotifications, markAsRead, markAllAsRead, type NotificationItem } from '@/api/notifications';
import { useNotifications } from '@/contexts/NotificationsContext';
import { cn, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

function getIcon(type: NotificationItem['notification_type']) {
  switch (type) {
    case 'CLAIM':
      return <UserCheck className="w-5 h-5 text-primary" />;
    case 'REPORT':
      return <ClipboardList className="w-5 h-5 text-emerald-500" />;
    case 'DISPUTE':
      return <Scale className="w-5 h-5 text-amber-500" />;
    case 'TRUST_BADGE':
      return <BadgeCheck className="w-5 h-5 text-primary" />;
    case 'MODERATION':
      return <Shield className="w-5 h-5 text-destructive" />;
    case 'SYSTEM':
    default:
      return <Bell className="w-5 h-5 text-muted-foreground" />;
  }
}

export default function Notifications() {
  const toast = useToast();
  const { markAllRead: contextMarkAllRead, refreshCount } = useNotifications();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchNotifs = async () => {
      setLoading(true);
      try {
        const res = await getNotifications();
        if (mounted && res.ok && res.data) {
          setNotifications(res.data.items);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load notifications');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchNotifs();
    return () => {
      mounted = false;
    };
  }, []);

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)),
      );
      try {
        await markAsRead(notif.id);
        refreshCount();
      } catch {
        // silently fail read state
      }
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    contextMarkAllRead();
    try {
      await markAllAsRead();
      toast.push('All notifications marked as read');
    } catch {
      toast.push('Failed to mark all as read');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        <div className="max-w-2xl mx-auto p-4 md:py-8 space-y-4 animate-pulse">
          <div className="h-8 w-40 bg-muted rounded mb-8" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-card rounded-2xl border border-border/50" />
          ))}
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:py-8">
        {error ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-lg font-medium mb-1">You're all caught up</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              When there's activity on your reports or comments, you'll see it here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {notifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    'p-4 rounded-2xl border transition-all cursor-pointer hover:bg-muted/30',
                    notif.is_read
                      ? 'bg-card border-border/50 opacity-80'
                      : 'bg-card border-primary/20 shadow-sm',
                  )}
                >
                  <div className="flex gap-4">
                    <div className="shrink-0 mt-1">{getIcon(notif.notification_type)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          className={cn(
                            'font-bold text-sm',
                            !notif.is_read && 'text-foreground',
                          )}
                        >
                          {notif.title}
                        </h4>
                        {!notif.is_read ? (
                          <Circle className="w-2.5 h-2.5 fill-primary text-primary shrink-0 mt-1" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-muted-foreground shrink-0 mt-1 opacity-50" />
                        )}
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="text-xs text-muted-foreground pt-1 font-medium">
                        {formatDate(notif.created_at)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
