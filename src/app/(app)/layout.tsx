import { BottomNav } from '@/components/nav/BottomNav';
import { Sidebar } from '@/components/nav/Sidebar';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { ReportModalProvider } from '@/components/report/ReportModalProvider';

export default function AppLayout({
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
        <div className="flex-1 lg:pl-64">
          <EmailVerificationBanner />
          {children}
        </div>

        {/* Bottom Nav for Mobile (auto-hidden on lg) */}
        <BottomNav />
      </div>
    </ReportModalProvider>
  );
}
