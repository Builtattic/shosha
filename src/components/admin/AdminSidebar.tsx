'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Database,
  ShieldAlert,
  ClipboardList,
  Search,
  Gavel,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Queue', icon: Gavel, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/accounts', label: 'Accounts', icon: Database },
  { href: '/admin/claims', label: 'Claims', icon: ClipboardList },
  { href: '/admin/audits', label: 'Audits', icon: Search },
  { href: '/admin/abuse', label: 'Abuse', icon: ShieldAlert },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 w-56 border-r border-white/10 bg-[#111111] flex flex-col hidden lg:flex">
      {/* Header */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-white/10">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/20 border border-red-500/30">
          <Gavel size={14} className="text-red-400" />
        </div>
        <div>
          <p className="text-[13px] font-black text-white tracking-tight">Tribunal</p>
          <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest">Admin</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 h-9 text-[13px] font-medium transition-all',
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              )}
            >
              <Icon size={15} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Back to app */}
      <div className="px-3 pb-6 border-t border-white/10 pt-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 h-9 text-[12px] font-medium text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
        >
          <ArrowLeft size={14} />
          Back to App
        </Link>
      </div>
    </aside>
  );
}
