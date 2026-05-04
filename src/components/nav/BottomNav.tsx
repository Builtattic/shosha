'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Newspaper, Plus, TrendingUp, User, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReportModal } from '@/components/report/ReportModalProvider';
import { MobileMenu } from '@/components/nav/MobileMenu';

type BottomNavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  matchPaths?: string[];
};

const items: BottomNavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/feed', label: 'Reports', icon: Newspaper },
  { href: '/ranks', label: 'Ranks', icon: TrendingUp },
  { href: '/profile', label: 'Profile', icon: User, matchPaths: ['/profile', '/account'] },
];

export function BottomNav() {
  const pathname = usePathname();
  const reportModal = useReportModal();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const hideOnAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  function isActive(item: BottomNavItem) {
    if (item.matchPaths) {
      return item.matchPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
    }
    if (pathname === '/dashboard' && item.href === '/dashboard') return true;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  }

  if (hideOnAdmin) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none lg:hidden">
        <div className="mx-auto flex max-w-md justify-center px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
          <nav className="pointer-events-auto relative flex w-full items-center justify-around gap-1 rounded-full border border-border bg-background/90 px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.10)] backdrop-blur-xl">
            {/* Left two items */}
            {items.slice(0, 2).map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item)} />
            ))}

            {/* Center Create FAB */}
            <button
              type="button"
              onClick={() => reportModal.open()}
              aria-label="Create report"
              className="group relative -mt-7 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-[0_10px_24px_rgba(0,0,0,0.25)] ring-4 ring-background transition-transform active:scale-90"
            >
              <Plus size={24} strokeWidth={3} className="transition-transform duration-300 group-active:rotate-90" />
            </button>

            {/* Right two items */}
            {items.slice(2, 4).map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item)} />
            ))}

            {/* More menu trigger */}
            <button
              type="button"
              onPointerDown={() => setMenuOpen(true)}
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="group relative z-20 flex min-h-12 min-w-14 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-full px-2 py-2 text-muted-foreground transition-colors hover:text-foreground active:scale-95"
            >
              <Menu size={20} className="transition-transform duration-300 group-active:scale-90" />
              <span className="text-[10px] font-bold tracking-wide opacity-70">More</span>
            </button>
          </nav>
        </div>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

function NavLink({ item, active }: { item: BottomNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-2 transition-colors',
        active ? 'text-background' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {active && (
        <motion.div
          layoutId="bottomNavActivePill"
          className="absolute inset-1 rounded-full bg-foreground"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <span className="relative flex flex-col items-center gap-0.5">
        <Icon
          size={20}
          strokeWidth={active ? 2.4 : 2}
          className="transition-transform duration-300 group-active:scale-90"
        />
        <span
          className={cn(
            'text-[10px] font-bold tracking-wide transition-opacity',
            active ? 'opacity-100' : 'opacity-70'
          )}
        >
          {item.label}
        </span>
      </span>
    </Link>
  );
}
