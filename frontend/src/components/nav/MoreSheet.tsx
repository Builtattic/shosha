'use client';

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Home,
  Users,
  Search,
  Bookmark,
  Bell,
  HelpCircle,
  ShieldAlert,
  Settings,
  ShieldCheck,
  ChevronRight,
  PlusCircle,
  type LucideIcon,
} from 'lucide-react';
import { useReportModal } from '@/contexts/ReportModalContext';
import { useNotifications } from '@/contexts/NotificationsContext';

const ADMIN_ROLES = ['moderator', 'editor', 'admin', 'super_admin'];

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navigateItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/people', label: 'People', icon: Users },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/how-it-works', label: 'How It Works', icon: HelpCircle },
];

const manageItems: NavItem[] = [
  { href: '/disputes', label: 'Disputes', icon: ShieldAlert },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/admin', label: 'Admin', icon: ShieldCheck },
];

type MoreSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function MoreSheet({ open, onClose }: MoreSheetProps) {
  const { open: openReportModal } = useReportModal();
  const { unreadCount } = useNotifications();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && ADMIN_ROLES.includes(d.data?.user?.role)) {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const visibleManage = manageItems.filter((item) => item.href !== '/admin' || isAdmin);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="more-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden"
          />
          <motion.div
            key="more-sheet-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-[61] flex h-[75vh] max-h-[75vh] flex-col rounded-t-2xl border-t border-border bg-background shadow-2xl lg:hidden"
          >
            <motion.div className="relative shrink-0 border-b border-border px-4 pb-3 pt-3">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-95"
              >
                <X size={18} />
              </button>
            </motion.div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-4 pt-4">
              <Section title="Navigate">
                {navigateItems.map((item) => (
                  <NavRow
                    key={item.href}
                    item={item}
                    onClose={onClose}
                    badge={
                      item.href === '/notifications' && unreadCount > 0
                        ? unreadCount > 9
                          ? '9+'
                          : String(unreadCount)
                        : undefined
                    }
                  />
                ))}
              </Section>

              <Section title="Manage" className="mt-6">
                {visibleManage.map((item) => (
                  <NavRow key={item.href} item={item} onClose={onClose} />
                ))}
              </Section>

              <div className="mt-6 px-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openReportModal();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-[14px] font-black text-background shadow-md transition-all active:scale-[0.98]"
                >
                  <PlusCircle size={18} strokeWidth={2.5} />
                  Create a report
                </button>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Add proof, classify impact, and send it to review.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-2 px-3 pt-1 text-[10px] font-black uppercase leading-normal tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <nav className="space-y-1">{children}</nav>
    </div>
  );
}

function NavRow({
  item,
  onClose,
  badge,
}: {
  item: NavItem;
  onClose: () => void;
  badge?: string;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      onClick={onClose}
      className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-bold text-foreground transition-colors hover:bg-muted"
    >
      <span className="relative shrink-0">
        <Icon size={18} strokeWidth={2} className="text-muted-foreground group-hover:text-foreground" />
        {badge && (
          <span className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-background bg-destructive px-1 text-[9px] font-bold text-background">
            {badge}
          </span>
        )}
      </span>
      <span className="flex-1">{item.label}</span>
      <ChevronRight size={14} className="shrink-0 opacity-40" />
    </Link>
  );
}
