import { BottomNav } from '@/components/nav/BottomNav';
import { Sidebar } from '@/components/nav/Sidebar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen lg:flex">
      {/* Sidebar for Desktop */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:pl-64">
        {children}
      </div>

      {/* Bottom Nav for Mobile */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
