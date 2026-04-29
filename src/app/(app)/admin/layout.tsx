import { redirect } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { AdminNav } from '@/components/admin/AdminNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) redirect('/dashboard');

  return (
    <main className="min-h-screen bg-background pb-24 pt-8 px-4 lg:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
          </div>
          <div>
            <h1 className="text-[28px] font-serif font-black text-foreground leading-none">Admin Control</h1>
            <p className="text-sm text-muted-foreground mt-1">Platform management and moderation</p>
          </div>
        </div>
        <AdminNav />
        {children}
      </div>
    </main>
  );
}
