import { Link, NavLink } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ADMIN_NAV_GROUPS } from '@/lib/adminNavGroups';

export default function AdminSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-border bg-background lg:flex">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <ShieldCheck size={15} />
        </div>
        <div>
          <p className="text-[13px] font-black leading-none tracking-tight text-foreground">Tribunal</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin</p>
        </div>
      </div>

      <nav className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {ADMIN_NAV_GROUPS.map((group, groupIdx) => (
          <div key={group.name} className={cn('flex flex-col gap-1', groupIdx > 0 && 'mt-5')}>
            <div className="mb-1 flex items-center gap-2 px-3">
              <div className="h-1 w-1 rounded-full bg-primary/40" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/50">
                {group.name}
              </h3>
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.exact}
                  className={({ isActive }) =>
                    cn(
                      'flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-all',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={15}
                        strokeWidth={isActive ? 2.5 : 2}
                        className={cn(isActive ? 'text-primary-foreground' : 'text-primary/70')}
                      />
                      {item.label}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border px-3 pb-6 pt-4">
        <Link
          to="/dashboard"
          className="flex h-9 items-center gap-3 rounded-lg px-3 text-[12px] font-bold text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back to App
        </Link>
      </div>
    </aside>
  );
}
