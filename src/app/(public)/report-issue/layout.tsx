import { BottomNav } from '@/components/nav/BottomNav';
import { Sidebar } from '@/components/nav/Sidebar';
import { ReportModalProvider } from '@/components/report/ReportModalProvider';

export default function ReportIssueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReportModalProvider>
      <div className="relative min-h-screen lg:flex">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        <div className="min-w-0 flex-1 lg:pl-64">
          {children}
        </div>

        <BottomNav />
      </div>
    </ReportModalProvider>
  );
}
