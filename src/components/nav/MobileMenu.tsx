'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Home,
  Newspaper,
  Search,
  Target,
  TrendingUp,
  User,
  Bookmark,
  Bell,
  ShieldAlert,
  Settings,
  Info,
  HelpCircle,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Plus,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useReportModal } from '@/components/report/ReportModalProvider';

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

type NavGroup = {
  label: string;
  items: { href: string; label: string; icon: typeof Home; admin?: boolean }[];
};

const groups: NavGroup[] = [
  {
    label: 'Discover',
    items: [
      { href: '/dashboard', label: 'Home', icon: Home },
      { href: '/feed', label: 'Reports', icon: Newspaper },
      { href: '/search', label: 'Search', icon: Search },
      { href: '/impact', label: 'Impact', icon: Target },
      { href: '/ranks', label: 'Ranks', icon: TrendingUp },
    ],
  },
  {
    label: 'Personal',
    items: [
      { href: '/profile', label: 'Profile', icon: User },
      { href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
      { href: '/notifications', label: 'Notifications', icon: Bell },
      { href: '/disputes', label: 'Disputes', icon: ShieldAlert },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    label: 'About',
    items: [
      { href: '/about', label: 'About Shosha', icon: Info },
      { href: '/how-it-works', label: 'How It Works', icon: HelpCircle },
      { href: '/admin', label: 'Admin Console', icon: ShieldCheck, admin: true },
    ],
  },
];

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const reportModal = useReportModal();
  const [isAdmin, setIsAdmin] = useState(false);
  const [me, setMe] = useState<{ name?: string; username?: string; photoUrl?: string; score?: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        setMe({
          name: d.data?.user?.name,
          username: d.data?.user?.username,
          photoUrl: d.data?.user?.photoUrl,
          score: d.data?.user?.score,
        });
        if (['moderator', 'editor', 'admin', 'super_admin'].includes(d.data?.user?.role)) {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const displayName = me?.name || user?.displayName || user?.email?.split('@')[0] || 'Welcome';
  const username = me?.username || (user?.email?.split('@')[0] ?? '');
  const rawAvatar = me?.photoUrl || user?.photoURL;
  const avatar = rawAvatar && rawAvatar !== 'null' && rawAvatar !== 'undefined' ? rawAvatar : null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="mobile-menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm lg:hidden"
          />
          <motion.aside
            key="mobile-menu-panel"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            className="fixed bottom-0 left-0 top-0 z-[151] flex w-[88%] max-w-sm flex-col bg-background shadow-2xl lg:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <Link
                href="/dashboard"
                onClick={onClose}
                className="font-serif text-[24px] font-black text-foreground"
              >
                Sho<span className="font-normal italic text-muted-foreground">शा</span>
              </Link>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* User card */}
            {user ? (
              <Link
                href="/profile"
                onClick={onClose}
                className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                  {avatar ? (
                    <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[16px] font-black text-muted-foreground">
                      {displayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-foreground">{displayName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{username}</p>
                  {typeof me?.score === 'number' && (
                    <p className="mt-0.5 text-[11px] font-bold tabular-nums text-foreground">
                      {me.score.toLocaleString()} <span className="font-medium text-muted-foreground">Shosha Score</span>
                    </p>
                  )}
                </div>
                <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
              </Link>
            ) : (
              <Link
                href="/sign-in"
                onClick={onClose}
                className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted"
              >
                <div>
                  <p className="text-[14px] font-bold text-foreground">Sign in</p>
                  <p className="text-[11px] text-muted-foreground">Track filings, save bookmarks, get notified.</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </Link>
            )}

            {/* Create Report CTA */}
            <button
              type="button"
              onClick={() => {
                onClose();
                reportModal.open();
              }}
              className="mx-4 mt-3 flex items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-[14px] font-black text-background shadow-md transition-all active:scale-[0.98]"
            >
              <Plus size={18} strokeWidth={3} /> Create Report
            </button>

            {/* Nav groups (scrollable) */}
            <div className="flex-1 overflow-y-auto px-2 py-4 no-scrollbar">
              {groups.map((group) => {
                const visibleItems = group.items.filter((item) => !item.admin || isAdmin);
                if (visibleItems.length === 0) return null;
                return (
                  <div key={group.label} className="mb-4 px-2">
                    <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                      {group.label}
                    </p>
                    <nav className="space-y-1">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const active = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-bold transition-colors',
                              active
                                ? 'bg-foreground text-background shadow-sm'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            <Icon size={18} strokeWidth={active ? 2.4 : 2} className="shrink-0" />
                            <span className="flex-1">{item.label}</span>
                            {!active && <ChevronRight size={14} className="opacity-40" />}
                          </Link>
                        );
                      })}
                    </nav>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-4 py-4">
              <div className="mb-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Globe size={12} /> Real-time impact ledger
              </div>
              {user && (
                <button
                  type="button"
                  onClick={async () => {
                    onClose();
                    try {
                      await signOut();
                      router.push('/');
                    } catch {
                      router.push('/');
                    }
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <LogOut size={16} /> Sign out
                </button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
