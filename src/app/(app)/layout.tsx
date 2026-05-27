import { BottomNav } from '@/components/nav/BottomNav';
import { DesktopTopBar } from '@/components/nav/DesktopTopBar';
import { Sidebar } from '@/components/nav/Sidebar';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { ReportModalProvider } from '@/components/report/ReportModalProvider';
import { PushNotificationPrompt } from '@/components/notifications/PushNotificationPrompt';
import { NotificationsProvider } from '@/contexts/NotificationsContext';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReportModalProvider>
      <NotificationsProvider>
        <div className="relative min-h-screen lg:flex">
          {/* Sidebar for Desktop */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>

          {/* Main Content */}
          <div className="flex min-w-0 flex-1 flex-col lg:min-h-screen lg:pl-64">
            <EmailVerificationBanner />
            <DesktopTopBar />
            {children}
            <PushNotificationPrompt />
          </div>

          {/* Bottom Nav for Mobile (auto-hidden on lg) */}
          <BottomNav />
        </div>
      </NotificationsProvider>
    </ReportModalProvider>
  );
}
