import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ClipboardList,
  Database,
  Gavel,
  Inbox,
  LayoutDashboard,
  ListTodo,
  Newspaper,
  PlusCircle,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  BadgeCheck,
  Users,
} from 'lucide-react';

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** When true, only exact pathname match counts as active (used for `/admin` dashboard). */
  exact?: boolean;
};

export type AdminNavGroup = {
  name: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    name: 'Ops',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/admin/activity', label: 'Activity', icon: Activity },
    ],
  },
  {
    name: 'Moderation',
    items: [
      { href: '/admin/queue', label: 'Queue', icon: ListTodo },
      { href: '/admin/evidence', label: 'Evidence', icon: Search },
      { href: '/admin/abuse', label: 'Abuse', icon: ShieldAlert },
      { href: '/admin/moderation', label: 'Requests', icon: Inbox },
      { href: '/admin/disputes', label: 'Disputes', icon: Gavel },
    ],
  },
  {
    name: 'Registry',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/accounts', label: 'Accounts', icon: Database },
      { href: '/admin/data', label: 'Data Center', icon: Database },
      { href: '/admin/claims', label: 'Claims', icon: ClipboardList },
      { href: '/admin/audits', label: 'Audits', icon: ShieldCheck },
      { href: '/admin/trust-badge', label: 'Trust Badge', icon: BadgeCheck },
    ],
  },
  {
    name: 'Content',
    items: [
      { href: '/admin/create', label: 'Publish Claim', icon: PlusCircle },
      { href: '/admin/feed', label: 'Feed', icon: Newspaper },
    ],
  },
  {
    name: 'System',
    items: [{ href: '/admin/settings', label: 'Settings', icon: Settings }],
  },
];

export function isAdminNavItemActive(pathname: string, item: AdminNavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
