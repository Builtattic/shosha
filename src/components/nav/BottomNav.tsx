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
  { href: '/impact', label: 'Impact', icon: BarChart3 },
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
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/80 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex h-[calc(4.5rem+env(safe-area-inset-bottom))] max-w-md items-stretch px-2 pb-[env(safe-area-inset-bottom)]">
        <nav className="flex w-full items-center justify-between">
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
      className={cn(
        'group relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground/50 hover:text-foreground'
      )}
    >
      {active && (
        <motion.div
          layoutId="bottomNavActivePill"
          className="absolute top-0 h-[3px] w-12 rounded-b-[2px] bg-gradient-to-r from-orange-500 to-red-600"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <Icon
        size={24}
        strokeWidth={active ? 2.5 : 1.5}
        className={cn(
          'mb-0.5 transition-all duration-300 group-active:scale-90',
          active ? 'fill-foreground/10' : 'fill-none'
        )}
      />
      <span
        className={cn(
          'text-[11px] font-bold tracking-tight transition-all',
          active ? 'opacity-100' : 'opacity-60'
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}
