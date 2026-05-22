'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Circle, Target, TrendingUp, Menu, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MoreSheet } from '@/components/nav/MoreSheet';

type BottomNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  matchPaths?: string[];
};

const items: BottomNavItem[] = [
  { href: '/feed', label: 'Feed', icon: Home },
  { href: '/ranks', label: 'Ranks', icon: TrendingUp },
  { href: '/impact', label: 'Impact', icon: Target },
  { href: '/bubbles', label: 'Bubbles', icon: Circle },
];

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

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
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background lg:hidden shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.1)]">
        <div className="mx-auto flex h-[calc(4.5rem+env(safe-area-inset-bottom))] max-w-md items-stretch px-1 pb-[env(safe-area-inset-bottom)]">
          <nav className="flex h-full w-full items-stretch justify-between">
            {items.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item) && !moreOpen} />
            ))}
            <NavMoreButton active={moreOpen} onClick={() => setMoreOpen(true)} />
          </nav>
        </div>
      </div>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}

function NavLink({ item, active }: { item: BottomNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="group relative flex h-full flex-1 flex-col items-center justify-center gap-1 transition-colors"
    >
      {active && (
        <motion.div
          layoutId="bottomNavActivePill"
          className="absolute top-0 h-[3px] w-12 rounded-b-[4px] bg-gradient-to-r from-orange-500 to-red-600 shadow-[0_2px_8px_rgba(239,68,68,0.4)]"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <div
        className={cn(
          'relative mt-1 flex items-center justify-center rounded-2xl p-1.5 transition-all duration-300',
          active ? 'scale-110' : 'group-active:scale-95 group-hover:bg-foreground/5',
        )}
      >
        <Icon
          size={24}
          strokeWidth={active ? 2.5 : 2}
          className={cn(
            'transition-all duration-300',
            active
              ? 'fill-foreground/10 text-foreground'
              : 'fill-none text-muted-foreground/60 group-hover:text-foreground',
          )}
        />
      </div>
      <span
        className={cn(
          'mt-[-2px] text-[10px] font-bold tracking-wide transition-all',
          active ? 'scale-105 text-foreground opacity-100' : 'text-muted-foreground/60 opacity-60',
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}

function NavMoreButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="More"
      aria-expanded={active}
      className="group relative flex h-full flex-1 flex-col items-center justify-center gap-1 transition-colors"
    >
      {active && (
        <motion.div
          layoutId="bottomNavActivePill"
          className="absolute top-0 h-[3px] w-12 rounded-b-[4px] bg-gradient-to-r from-orange-500 to-red-600 shadow-[0_2px_8px_rgba(239,68,68,0.4)]"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <div
        className={cn(
          'relative mt-1 flex items-center justify-center rounded-2xl p-1.5 transition-all duration-300',
          active ? 'scale-110' : 'group-active:scale-95 group-hover:bg-foreground/5',
        )}
      >
        <Menu
          size={24}
          strokeWidth={active ? 2.5 : 2}
          className={cn(
            'transition-all duration-300',
            active ? 'text-foreground' : 'text-muted-foreground/60 group-hover:text-foreground',
          )}
        />
      </div>
      <span
        className={cn(
          'mt-[-2px] text-[10px] font-bold tracking-wide transition-all',
          active ? 'scale-105 text-foreground opacity-100' : 'text-muted-foreground/60 opacity-60',
        )}
      >
        More
      </span>
    </button>
  );
}
