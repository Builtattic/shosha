import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Home, Target, TrendingUp, User, ShieldAlert, Settings, Globe,
  ChevronDown, ShieldCheck, Newspaper, HelpCircle, Bookmark, Bell,
  Search, PlusCircle, Activity, Users, CircleDot, Key, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReportModal } from '@/contexts/ReportModalContext';
import { RANK_SCOPE_OPTIONS, resolveRankScope, type RankScopeValue } from '@/lib/rankScope';
import { useAuth } from '@/providers/AuthProvider';
import { isAdminRole } from '@/lib/roles';

// ── Types ─────────────────────────────────────────────────────────────────────

type LiveStats = { eventsToday: number; avgWeeklyDelta: number };

// ── Nav item lists ─────────────────────────────────────────────────────────────

const PRIMARY_ITEMS = [
  { to: '/dashboard',    label: 'Home',          icon: Home },
  { to: '/feed',         label: 'Feed',          icon: Newspaper },
  { to: '/access',       label: 'Access',        icon: Key },
  { to: '/impact',       label: 'Impact',        icon: Target },
  { to: '/people',       label: 'People',        icon: Users },
  { to: '/bubbles',      label: 'Bubbles',       icon: CircleDot },
  { to: '/ranks',        label: 'Ranks',         icon: TrendingUp },
  { to: '/search',       label: 'Search',        icon: Search },
  { to: '/profile',      label: 'Profile',       icon: User },
  { to: '/bookmarks',    label: 'Bookmarks',     icon: Bookmark },
  { to: '/notifications',label: 'Notifications', icon: Bell },
  { to: '/how-it-works', label: 'How It Works',  icon: HelpCircle },
];

const MANAGE_ITEMS = [
  { to: '/disputes',     label: 'Disputes',      icon: ShieldAlert },
  { to: '/report-issue', label: 'Report Issue',  icon: AlertTriangle },
  { to: '/settings',     label: 'Settings',      icon: Settings },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [searchParams] = useSearchParams();
  const { open: openReportModal } = useReportModal();
  const { profile } = useAuth();

  const [scopeOpen, setScopeOpen]   = useState(false);
  const [stats, setStats]           = useState<LiveStats | null>(null);
  const isAdmin = isAdminRole(profile?.role);

  const pathname    = location.pathname;
  const activeScope = pathname === '/ranks' ? resolveRankScope(searchParams.get('scope')) : 'global';
  const scopeLabel  = RANK_SCOPE_OPTIONS.find((o) => o.value === activeScope)?.label ?? 'Global';

  // Live stats — polls /api/stats every 60 s (silent no-op until backend is live)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' });
        const payload = await res.json();
        if (!cancelled && payload.ok) {
          setStats({
            eventsToday:    Number(payload.data?.eventsToday     ?? 0),
            avgWeeklyDelta: Number(payload.data?.avgWeeklyDelta  ?? 0),
          });
        }
      } catch { /* backend not live yet */ }
    }
    load();
    const id = window.setInterval(load, 60_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  function chooseScope(value: RankScopeValue) {
    setScopeOpen(false);
    navigate(`/ranks?scope=${value}`);
  }

  const manageItems = [
    ...MANAGE_ITEMS,
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ];

  return (
    <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-64 border-r border-border bg-background lg:flex lg:flex-col">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
        <Link
          to="/dashboard"
          className="group inline-flex items-baseline gap-0 font-serif text-[24px] font-black text-foreground"
        >
          <span className="transition-transform duration-300 group-hover:-translate-y-0.5">Sho</span>
          <span className="font-normal italic text-muted-foreground transition-colors group-hover:text-foreground">शा</span>
        </Link>
        <Link
          to="/impact"
          aria-label="Trending impact"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            pathname === '/impact' && 'border-primary/40 bg-primary/10 text-primary',
          )}
        >
          <Activity size={14} />
        </Link>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">

        {/* Primary nav */}
        <nav className="space-y-1 px-3 py-5">
          {PRIMARY_ITEMS.map((item) => {
            const Icon   = item.icon;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'group relative flex h-11 items-center gap-3 rounded-xl px-4 text-[13px] font-bold transition-all duration-200',
                  active
                    ? 'bg-foreground text-background shadow-md shadow-foreground/10'
                    : 'text-muted-foreground hover:translate-x-1 hover:bg-muted hover:text-foreground',
                )}
              >
                {/* Active indicator bar */}
                <span className={cn(
                  'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full transition-opacity',
                  active ? 'bg-background opacity-100' : 'bg-foreground opacity-0 group-hover:opacity-30',
                )} />
                <Icon
                  size={18}
                  strokeWidth={active ? 2.5 : 2}
                  className="shrink-0 transition-transform group-hover:scale-110"
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quick-action card */}
        <div className="px-4">
          <button
            type="button"
            onClick={() => openReportModal()}
            className="group block w-full rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg hover:shadow-foreground/5"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[3px] text-muted-foreground">
                Quick Action
              </p>
              <PlusCircle size={16} className="text-muted-foreground transition-colors group-hover:text-foreground" />
            </div>
            <p className="text-[13px] font-black text-foreground">Create a report</p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              Add proof, classify impact, and send it to review.
            </p>
          </button>
        </div>

        {/* Live stats */}
        <div className="mt-6 px-4">
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[3px] text-muted-foreground">
              Live Stats
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[12px] font-bold text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  Today
                </span>
                <span className="font-mono text-foreground">
                  {stats ? stats.eventsToday.toLocaleString() : '...'}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className={cn(
                'flex items-center justify-between text-[12px] font-bold',
                stats && stats.avgWeeklyDelta < 0 ? 'text-destructive' : 'text-primary',
              )}>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp size={15} />
                  Weekly avg
                </span>
                <span className="font-mono">
                  {stats
                    ? `${stats.avgWeeklyDelta > 0 ? '+' : ''}${stats.avgWeeklyDelta.toLocaleString()} Δ`
                    : '...'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Manage section */}
        <div className="mt-6 px-3 pb-4">
          <p className="mb-3 px-4 text-[10px] font-black uppercase tracking-[3px] text-muted-foreground">
            Manage
          </p>
          <nav className="space-y-1">
            {manageItems.map((item) => {
              const Icon   = item.icon;
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'group flex h-10 items-center gap-3 rounded-xl px-4 text-[13px] font-bold transition-all duration-200',
                    active
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:translate-x-1 hover:bg-muted hover:text-foreground',
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
      {/* /Scrollable body */}

      {/* ── Scope picker ─────────────────────────────────────────────── */}
      <div className="relative shrink-0 border-t border-border px-6 py-5">
        <button
          type="button"
          onClick={() => setScopeOpen((v) => !v)}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-[12px] font-bold transition-all hover:border-foreground/20 hover:bg-muted"
        >
          <Globe size={14} />
          <span className="max-w-28 truncate">{scopeLabel}</span>
          <ChevronDown
            size={14}
            className={cn('opacity-50 transition-transform', scopeOpen && 'rotate-180')}
          />
        </button>

        {scopeOpen && (
          <div className="absolute bottom-20 left-6 right-6 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            {RANK_SCOPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => chooseScope(opt.value)}
                className={cn(
                  'block w-full px-4 py-3 text-left text-[12px] font-bold transition hover:bg-muted',
                  pathname === '/ranks' && activeScope === opt.value
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
