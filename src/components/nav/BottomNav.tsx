'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ClipboardList, Gavel, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const items = [
    { href: '/', label: 'Feed', icon: ClipboardList, show: true },
    { href: '/dashboard', label: 'You', icon: UserRound, show: Boolean(session) },
    { href: '/admin', label: 'Tribunal', icon: Gavel, show: session?.user.role === 'admin' }
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-x border-t border-border bg-bg/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          if (!item.show) return <span key={item.href} />;
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-11 items-center justify-center gap-2 rounded border px-2 text-xs uppercase',
                active ? 'border-accent text-accent' : 'border-border text-muted'
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
