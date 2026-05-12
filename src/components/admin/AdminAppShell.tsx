'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Menu, PlusCircle, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ADMIN_NAV_GROUPS, isAdminNavItemActive } from '@/lib/adminNavGroups';
import { AdminPrimaryFab } from '@/components/admin/AdminPrimaryFab';

export type AdminShellUser = {
  displayName: string;
  username?: string;
  photoUrl?: string | null;
};

function adminPageTitle(pathname: string): string {
  if (pathname === '/admin') return 'Dashboard';
  const rest = pathname.replace(/^\/admin\/?/, '');
  const first = rest.split('/')[0] || '';
  const map: Record<string, string> = {
    activity: 'Activity',
    queue: 'Queue',
    evidence: 'Evidence',
    abuse: 'Abuse',
    disputes: 'Disputes',
    users: 'Users',
    accounts: 'Accounts',
    data: 'Data Center',
    claims: 'Claims',
    audits: 'Audits',
    create: 'Publish Claim',
    feed: 'Feed',
    settings: 'Settings',
    review: 'Review',
  };
  return map[first] || 'Admin';
}

export function AdminAppShell({ user, children }: { user: AdminShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const title = useMemo(() => adminPageTitle(pathname), [pathname]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const avatar = user.photoUrl && user.photoUrl !== 'null' && user.photoUrl !== 'undefined' ? user.photoUrl : null;
  const initial = (user.displayName || user.username || 'A').slice(0, 1).toUpperCase();

  return (
    <>
      {/* Mobile header */}
      <header className="sticky top-0 z-20 flex min-h-[3.5rem] w-full min-w-0 items-center gap-3 border-b border-border bg-background px-3 py-3 lg:hidden">
        <button
          type="button"
          aria-expanded={drawerOpen}
          aria-controls="admin-nav-drawer"
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setDrawerOpen((o) => !o)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted active:scale-95"
        >
          {drawerOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center font-serif text-lg font-black text-foreground">{title}</h1>
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
          {avatar ? (
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[12px] font-black text-muted-foreground">{initial}</div>
          )}
        </div>
      </header>

      {/* Desktop header */}
      <div className="sticky top-0 z-20 hidden min-w-0 w-full border-b border-border bg-background px-4 py-6 lg:block lg:px-12">
        <div className="mx-auto flex max-w-[1400px] min-w-0 flex-col gap-6 md:flex-row md:flex-wrap md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner shadow-primary/5">
              <ShieldCheck size={24} />
            </div>
            <div className="min-w-0">
              <div className="mb-0.5 flex items-center gap-2">
                <Link
                  href="/admin"
                  className="text-xs font-black uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                >
                  Tribunal
                </Link>
                <ChevronRight size={12} className="text-muted-foreground/40" />
                <span className="text-xs font-black uppercase tracking-widest text-foreground">Command Center</span>
              </div>
              <h1 className="font-serif text-3xl font-black leading-tight text-foreground">Admin Control</h1>
              <p className="mt-0.5 text-sm font-medium text-muted-foreground opacity-70">Scale the truth. Moderate the noise.</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Link
              href="/admin/create"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[11px] font-black uppercase tracking-widest text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              <PlusCircle size={15} />
              Publish Claim
            </Link>
            <div className="mx-2 h-8 w-px bg-border" />
            <div className="min-w-0 text-right">
              <p className="truncate text-xs font-black text-foreground">{user.displayName}</p>
              <p className="truncate text-[10px] font-bold uppercase tracking-tighter text-emerald-500">Authorized Session</p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.button
              key="admin-drawer-backdrop"
              type="button"
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              key="admin-drawer-panel"
              id="admin-nav-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 36 }}
              className="fixed bottom-0 left-0 top-0 z-[60] flex w-[min(88vw,20rem)] flex-col border-r border-border bg-background shadow-2xl lg:hidden"
            >
              <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <ShieldCheck size={15} />
                </div>
                <div>
                  <p className="text-[13px] font-black leading-none tracking-tight text-foreground">Tribunal</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin</p>
                </div>
              </div>

              <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 no-scrollbar">
                {ADMIN_NAV_GROUPS.map((group, groupIdx) => (
                  <div key={group.name} className={cn('flex flex-col gap-1', groupIdx > 0 && 'mt-5')}>
                    <div className="mb-1 flex items-center gap-2 px-3">
                      <div className="h-1 w-1 rounded-full bg-primary/40" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/50">{group.name}</h3>
                    </div>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isAdminNavItemActive(pathname, item);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setDrawerOpen(false)}
                          className={cn(
                            'flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-all',
                            active
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                          )}
                        >
                          <Icon
                            size={15}
                            strokeWidth={active ? 2.5 : 2}
                            className={cn(active ? 'text-primary-foreground' : 'text-primary/70')}
                          />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>

              <div className="shrink-0 border-t border-border px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
                <Link
                  href="/dashboard"
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-10 items-center gap-3 rounded-lg px-3 text-[12px] font-bold text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
                >
                  <ArrowLeft size={14} />
                  Back to App
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {children}

      <AdminPrimaryFab />
    </>
  );
}
