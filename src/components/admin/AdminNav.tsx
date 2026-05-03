'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  LayoutDashboard,
  ListTodo,
  Users,
  Database,
  ClipboardList,
  Search,
  ShieldAlert,
  PlusCircle,
  Newspaper,
  Settings,
  Gavel,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const groups = [
  {
    name: 'Ops',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/activity', label: 'Activity', icon: Activity },
    ]
  },
  {
    name: 'Moderation',
    items: [
      { href: '/admin/queue', label: 'Queue', icon: ListTodo },
      { href: '/admin/evidence', label: 'Evidence', icon: Search },
      { href: '/admin/abuse', label: 'Abuse', icon: ShieldAlert },
      { href: '/admin/disputes', label: 'Disputes', icon: Gavel },
    ]
  },
  {
    name: 'Registry',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/accounts', label: 'Accounts', icon: Database },
      { href: '/admin/claims', label: 'Claims', icon: ClipboardList },
      { href: '/admin/audits', label: 'Audits', icon: ShieldCheck },
    ]
  },
  {
    name: 'Content',
    items: [
      { href: '/admin/create', label: 'Publish Claim', icon: PlusCircle },
      { href: '/admin/feed', label: 'Feed', icon: Newspaper },
    ]
  },
  {
    name: 'System',
    items: [
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ]
  }
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="mb-12 w-full overflow-x-auto no-scrollbar pb-4">
      <div className="flex items-start gap-10 min-w-max">
        {groups.map((group) => (
          <div key={group.name} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <div className="h-1 w-1 rounded-full bg-primary/40" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40">
                {group.name}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.02] border border-white/5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                      isActive 
                        ? "text-primary-foreground" 
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="admin-nav-active"
                        className="absolute inset-0 bg-primary rounded-xl shadow-lg shadow-primary/20"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    
                    <span className="relative z-10 flex items-center gap-2">
                      <Icon size={14} className={cn("transition-transform group-hover:scale-110", isActive ? "text-primary-foreground" : "text-primary")} />
                      <span>{item.label}</span>
                    </span>

                    {isActive && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-white border-2 border-primary z-20"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
