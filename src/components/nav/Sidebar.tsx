'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Target, TrendingUp, Info, User, ShieldAlert, Settings, Globe, ChevronDown, ShieldCheck, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    { href: '/impact', label: 'Impact', icon: Target },
    { href: '/ranks', label: 'Ranks', icon: TrendingUp },
    { href: '/about', label: 'About', icon: Info },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const navigationItems = [
    { href: '/disputes', label: 'Disputes', icon: ShieldAlert },
    { href: '/settings', label: 'Settings', icon: Settings },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ];

  return (
    <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-64 border-r border-border bg-background lg:block">
      <div className="flex h-16 items-center px-6 border-b border-border">
        <div className="font-serif text-[24px] font-black text-foreground">
          Sho<span className="font-normal italic text-muted-foreground">शा</span>
        </div>
      </div>

      <nav className="mt-8 space-y-1 px-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex h-12 items-center gap-3 rounded-[12px] px-4 text-[13px] font-bold transition-all',
                active
                  ? 'bg-foreground text-background shadow-md'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-10 px-8">
        <p className="text-[10px] uppercase tracking-[4px] text-muted-foreground mb-6 font-bold">Live Stats</p>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[13px] font-medium text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
            {stats ? `${stats.eventsToday.toLocaleString()} events today` : 'loading…'}
          </div>
          {stats ? (
            <div
              className={cn(
                'flex items-center gap-3 text-[13px] font-bold',
                stats.avgWeeklyDelta < 0 ? 'text-destructive' : 'text-primary'
              )}
            >
              <TrendingUp size={16} />
              {stats.avgWeeklyDelta > 0 ? '+' : ''}
              {stats.avgWeeklyDelta.toLocaleString()} Δ weekly avg
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-auto mb-8 px-4">
        <p className="px-4 text-[10px] uppercase tracking-[4px] text-muted-foreground mb-4 font-bold">Navigation</p>
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex h-11 items-center gap-3 rounded-[12px] px-4 text-[13px] font-medium transition-all',
                  active ? 'text-foreground bg-muted' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="relative px-8 pb-8">
        <button
          type="button"
          onClick={() => setScopeOpen((value) => !value)}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-[12px] font-bold transition-all hover:bg-muted"
        >
          <Globe size={14} /> {scope} <ChevronDown size={14} className="inline opacity-50" />
        </button>
        {scopeOpen && (
          <div className="absolute bottom-24 left-8 right-8 overflow-hidden rounded-[16px] border border-border bg-card shadow-xl">
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
