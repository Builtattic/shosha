'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Target, TrendingUp, Info, User, ShieldAlert, Settings, Globe, ChevronDown, ShieldCheck, Newspaper, HelpCircle, Bookmark, Bell, Search, PlusCircle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

type LiveStats = { eventsToday: number; avgWeeklyDelta: number };

export function Sidebar() {
  const pathname = usePathname();
  const [scope, setScope] = useState('Global');
  const [scopeOpen, setScopeOpen] = useState(false);
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setScope(window.localStorage.getItem('shosha:scope') ?? 'Global');
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' });
        const payload = await res.json();
        if (!cancelled && payload.ok) {
          setStats({
            eventsToday: Number(payload.data?.eventsToday ?? 0),
            avgWeeklyDelta: Number(payload.data?.avgWeeklyDelta ?? 0)
          });
        }
      } catch {
        // leave stats null; UI will hide the live row
      }
    }
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (d.ok && ['moderator', 'editor', 'admin', 'super_admin'].includes(d.data?.user?.role)) setIsAdmin(true); })
      .catch(() => {});
  }, []);

  function chooseScope(value: string) {
    setScope(value);
    setScopeOpen(false);
    window.localStorage.setItem('shosha:scope', value);
    window.dispatchEvent(new CustomEvent('shosha:scope-change', { detail: value }));
  }

  const items = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/feed', label: 'Feed', icon: Newspaper },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/impact', label: 'Impact', icon: Target },
    { href: '/ranks', label: 'Ranks', icon: TrendingUp },
    { href: '/about', label: 'About', icon: Info },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
    { href: '/notifications', label: 'Notifications', icon: Bell },
    { href: '/how-it-works', label: 'How It Works', icon: HelpCircle },
  ];

  const navigationItems = [
    { href: '/disputes', label: 'Disputes', icon: ShieldAlert },
    { href: '/settings', label: 'Settings', icon: Settings },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ];

  return (
    <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-64 border-r border-border bg-background/95 backdrop-blur-xl lg:flex lg:flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
        <Link href="/dashboard" className="group inline-flex items-baseline gap-1 font-serif text-[24px] font-black text-foreground">
          <span className="transition-transform duration-300 group-hover:-translate-y-0.5">Sho</span>
          <span className="font-normal italic text-muted-foreground transition-colors group-hover:text-foreground">शा</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
            <Activity size={14} />
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-muted-foreground [&>button]:flex [&>button]:h-full [&>button]:w-full [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:p-0">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Scrollable middle content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">

      <nav className="space-y-1 px-3 py-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex h-11 items-center gap-3 rounded-xl px-4 text-[13px] font-bold transition-all duration-200',
                active
                  ? 'bg-foreground text-background shadow-md shadow-foreground/10'
                  : 'text-muted-foreground hover:translate-x-1 hover:bg-muted hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full transition-opacity',
                  active ? 'bg-background opacity-100' : 'bg-foreground opacity-0 group-hover:opacity-30'
                )}
              />
              <Icon size={18} strokeWidth={active ? 2.5 : 2} className="shrink-0 transition-transform group-hover:scale-110" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4">
        <Link
          href="/dashboard"
          className="group block rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg hover:shadow-foreground/5"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[3px] text-muted-foreground">Quick Action</p>
            <PlusCircle size={16} className="text-muted-foreground transition-colors group-hover:text-foreground" />
          </div>
          <p className="text-[13px] font-black text-foreground">Create a report</p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">Add proof, classify impact, and send it to review.</p>
        </Link>
      </div>

      <div className="mt-6 px-4">
        <div className="rounded-2xl border border-border bg-card/60 p-4">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[3px] text-muted-foreground">Live Stats</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[12px] font-bold text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Today
              </span>
              <span className="font-mono text-foreground">{stats ? stats.eventsToday.toLocaleString() : '...'}</span>
            </div>
            <div className="h-px bg-border" />
            <div
              className={cn(
                'flex items-center justify-between text-[12px] font-bold',
                stats && stats.avgWeeklyDelta < 0 ? 'text-destructive' : 'text-primary'
              )}
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp size={15} />
                Weekly avg
              </span>
              <span className="font-mono">
                {stats ? `${stats.avgWeeklyDelta > 0 ? '+' : ''}${stats.avgWeeklyDelta.toLocaleString()} Δ` : '...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 px-3 pb-4">
        <p className="mb-3 px-4 text-[10px] font-black uppercase tracking-[3px] text-muted-foreground">Manage</p>
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex h-10 items-center gap-3 rounded-xl px-4 text-[13px] font-bold transition-all duration-200',
                  active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:translate-x-1 hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon size={17} className="transition-transform group-hover:scale-110" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      </div>
      {/* /Scrollable middle content */}

      <div className="relative shrink-0 border-t border-border px-6 py-5">
        <button
          type="button"
          onClick={() => setScopeOpen((value) => !value)}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-[12px] font-bold transition-all hover:border-foreground/20 hover:bg-muted"
        >
          <Globe size={14} />
          <span className="max-w-28 truncate">{scope}</span>
          <ChevronDown size={14} className={cn('inline opacity-50 transition-transform', scopeOpen && 'rotate-180')} />
        </button>
        {scopeOpen && (
          <div className="absolute bottom-20 left-6 right-6 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            {['Global', 'India', 'United States', 'Europe'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => chooseScope(option)}
                className={cn(
                  'block w-full px-4 py-3 text-left text-[12px] font-bold transition hover:bg-muted',
                  scope === option ? 'bg-muted text-foreground' : 'text-muted-foreground'
                )}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
