import { Sidebar } from '@/components/nav/Sidebar';
import { MobileAppHeader } from '@/components/nav/MobileAppHeader';
import { DesktopTopBar } from '@/components/nav/DesktopTopBar';
import { BottomNav } from '@/components/nav/BottomNav';
import { ReportModalHost } from '@/components/report/ReportModalHost';

/**
 * AppShell — wraps all authenticated + onboarded pages.
 * Renders desktop sidebar and top bar (lg+), and mobile header and bottom nav (hidden on lg+).
 * Pages sit in the right-hand content area on desktop.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar (fixed, hidden below lg) */}
      <Sidebar />

      <div className="flex flex-col min-h-screen lg:pl-64">
        {/* Desktop top bar (sticky, hidden below lg) */}
        <DesktopTopBar />

        {/* Mobile top bar (sticky, hidden at lg+) */}
        <MobileAppHeader />

        {/* Page content */}
        <main className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav (fixed, hidden on lg) */}
        <BottomNav />
      </div>
      <ReportModalHost />
    </div>
  );
}
