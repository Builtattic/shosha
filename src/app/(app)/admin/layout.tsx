import { redirect } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminAppShell } from '@/components/admin/AdminAppShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) redirect('/dashboard');

  const shellUser = {
    displayName: user?.name || user?.username || 'Admin',
    username: user?.username,
    photoUrl: user?.photoUrl ?? null,
  };

  return (
    <main className="min-h-screen min-w-0 bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8">
      <AdminSidebar />

      <div className="min-w-0 w-full lg:pl-56">
        <AdminAppShell user={shellUser}>
          <div className="mx-auto mt-6 min-w-0 max-w-[1400px] px-4 lg:mt-10 lg:px-12">
            <div className="relative">
              <div className="pointer-events-none absolute -left-20 -top-20 z-0 h-64 w-64 rounded-full bg-primary/5 blur-[100px]" />
              <div className="pointer-events-none absolute -right-20 bottom-0 z-0 h-96 w-96 rounded-full bg-blue-500/5 blur-[120px]" />

              <div className="relative min-w-0">{children}</div>
            </div>
          </div>
        </AdminAppShell>
      </div>
    </main>
  );
}
