import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Circle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNotifications, type NotificationItem } from '@/api/notifications';
import { useNotifications } from '@/contexts/NotificationsContext';
import { cn, formatDate } from '@/lib/utils';

interface NotificationsDropdownProps {
  iconButtonClass: string;
}

export function NotificationsDropdown({ iconButtonClass }: NotificationsDropdownProps) {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
    if (notifications.length === 0) {
      loadNotifications();
    }
  };

  const handleMouseLeave = () => {
    timeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 300); // Small delay to allow moving mouse to the dropdown
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      if (res.ok && res.data) {
        setNotifications(res.data.items.slice(0, 5)); // Show top 5
      }
    } catch {
      // fail silently for dropdown
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(false);
    navigate('/notifications');
  };

  return (
    <div 
      className="relative flex items-center h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleClick}
        className={cn('relative', iconButtonClass)}
        aria-label="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="pointer-events-none absolute right-0.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full border border-background bg-destructive px-1 text-[9px] font-bold text-background">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
              <span className="text-sm font-bold">Recent Notifications</span>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto no-scrollbar py-2">
              {loading && notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No recent notifications
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                        if (notif.link) navigate(notif.link);
                      }}
                      className="px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border/30 last:border-0"
                    >
                      <div className="flex gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={cn("text-xs font-bold line-clamp-1", !notif.read && "text-foreground")}>
                              {notif.title}
                            </h4>
                            {!notif.read ? (
                              <Circle className="w-2 h-2 fill-primary text-primary shrink-0 mt-0.5" />
                            ) : (
                              <CheckCircle2 className="w-2.5 h-2.5 text-muted-foreground shrink-0 mt-0.5 opacity-50" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {notif.body}
                          </p>
                          <div className="text-[10px] text-muted-foreground/70 font-medium pt-1">
                            {formatDate(notif.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div 
              onClick={handleClick}
              className="px-4 py-2 text-center text-xs font-bold text-primary hover:text-primary/80 cursor-pointer border-t border-border/50 bg-muted/10 transition-colors"
            >
              View all notifications
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
