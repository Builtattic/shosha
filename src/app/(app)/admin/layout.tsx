import { redirect } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white lg:flex">
      <AdminSidebar />
      <main className="flex-1 lg:ml-56 min-h-screen">
        {children}
      </main>
    </div>
  );
}
