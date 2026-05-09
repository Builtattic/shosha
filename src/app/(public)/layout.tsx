import { ReportModalProvider } from '@/components/report/ReportModalProvider';
import { Sidebar } from '@/components/nav/Sidebar';
import { BottomNav } from '@/components/nav/BottomNav';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReportModalProvider>
      <div className="relative min-h-screen lg:flex">
        {/* Sidebar for Desktop */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Main Content */}
        <div className="min-w-0 flex-1 lg:pl-64">
          {children}
        </div>

        {/* Bottom Nav for Mobile */}
        <BottomNav />
      </div>
    </ReportModalProvider>
  );
}
