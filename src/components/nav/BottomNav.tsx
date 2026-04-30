'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, User, BarChart2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.ok && ['moderator', 'editor', 'admin', 'super_admin'].includes(d.data?.user?.role)) {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const items = [
    { href: '/feed', label: 'Reports', icon: FileText },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/ranks', label: 'Ranks', icon: BarChart2 },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-background/90 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href) || (pathname === '/dashboard' && item.href === '/feed');

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all duration-300",
              isActive ? "text-foreground scale-105" : "text-muted-foreground hover:text-foreground/80"
            )}
          >
            <div className={cn(
              "flex items-center justify-center transition-all duration-300",
              isActive ? "" : ""
            )}>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-foreground" : "text-muted-foreground"} />
            </div>
            <span className={cn(
              "text-[10px] font-bold tracking-wide transition-all duration-300",
              isActive ? "opacity-100" : "opacity-70 font-medium"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
