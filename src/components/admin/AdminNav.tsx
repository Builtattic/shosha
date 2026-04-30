'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, LayoutDashboard, ListTodo, Users, Database, ClipboardList, Search, ShieldAlert, PlusCircle, Newspaper, Settings, Gavel } from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/create', label: 'Create', icon: PlusCircle },
  { href: '/admin/feed', label: 'Feed', icon: Newspaper },
  { href: '/admin/queue', label: 'Queue', icon: ListTodo },
  { href: '/admin/evidence', label: 'Evidence', icon: Search },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/accounts', label: 'Accounts', icon: Database },
  { href: '/admin/claims', label: 'Claims', icon: ClipboardList },
  { href: '/admin/disputes', label: 'Disputes', icon: Gavel },
  { href: '/admin/audits', label: 'Audits', icon: Search },
  { href: '/admin/abuse', label: 'Abuse', icon: ShieldAlert },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/activity', label: 'Activity', icon: Activity },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="mb-8 overflow-x-auto pb-2">
      <div className="flex items-center gap-2 min-w-max border-b border-border">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
