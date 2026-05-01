import { redirect } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { AdminNav } from '@/components/admin/AdminNav';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) redirect('/dashboard');

  return (
    <main className="min-h-screen bg-background pb-32">
      {/* Admin Header */}
      <div className="sticky top-0 z-30 w-full border-b border-white/5 bg-background/60 backdrop-blur-xl px-4 lg:px-12 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner shadow-primary/5">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Link href="/admin" className="text-xs font-black text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest">Tribunal</Link>
                <ChevronRight size={12} className="text-muted-foreground/40" />
                <span className="text-xs font-black text-foreground uppercase tracking-widest">Command Center</span>
              </div>
              <h1 className="text-3xl font-serif font-black text-foreground leading-tight">Admin Control</h1>
              <p className="text-sm text-muted-foreground font-medium opacity-70 mt-0.5">Scale the truth. Moderate the noise.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-bold">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <div className="h-8 w-[1px] bg-border mx-2" />
            <div className="text-right">
              <p className="text-xs font-black text-foreground">{user?.name || user?.username || 'Admin'}</p>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Authorized Session</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-12 mt-10">
        <AdminNav />
        <div className="relative">
          {/* Subtle background glow */}
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
          <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
          
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

