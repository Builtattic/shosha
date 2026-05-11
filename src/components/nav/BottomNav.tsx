'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, BarChart3, Users, Share2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type BottomNavItem = {
  href: string;
  label: string;
  icon: any;
  matchPaths?: string[];
};

const items: BottomNavItem[] = [
  { href: '/feed', label: 'Feed', icon: Home },
  { href: '/people', label: 'People', icon: Users },
  { href: '/bubbles', label: 'Bubbles', icon: Share2 },
  { href: '/profile', label: 'Profile', icon: User, matchPaths: ['/profile', '/account'] },
];

export function BottomNav() {
  const pathname = usePathname();

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
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/85 backdrop-blur-xl lg:hidden shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.1)]">
      <div className="mx-auto flex h-[calc(4.5rem+env(safe-area-inset-bottom))] max-w-md items-stretch px-1 pb-[env(safe-area-inset-bottom)]">
        <nav className="flex h-full w-full items-stretch justify-between">
          {items.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item)} />
          ))}
        </nav>
      </div>
    </div>
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
      <div className={cn(
        "relative mt-1 flex items-center justify-center p-1.5 rounded-2xl transition-all duration-300",
        active ? "scale-110" : "group-active:scale-95 group-hover:bg-foreground/5"
      )}>
        <Icon
          size={24}
          strokeWidth={active ? 2.5 : 2}
          className={cn(
            'transition-all duration-300',
            active ? 'fill-foreground/10 text-foreground' : 'fill-none text-muted-foreground/60 group-hover:text-foreground'
          )}
        />
      </div>
      <span
        className={cn(
          'text-[10px] font-bold tracking-wide transition-all mt-[-2px]',
          active ? 'opacity-100 text-foreground scale-105' : 'opacity-60 text-muted-foreground/60'
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}
