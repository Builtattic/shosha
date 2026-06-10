import AdminSidebar from './AdminSidebar';
import AdminPrimaryFab from './AdminPrimaryFab';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="min-h-screen flex-1 lg:ml-64">
        <div className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background px-4 py-3 lg:hidden">
          <span className="text-sm font-medium">Tribunal</span>
        </div>
        <div className="p-4 lg:p-6">{children}</div>
      </main>
      <AdminPrimaryFab />
    </div>
  );
}
