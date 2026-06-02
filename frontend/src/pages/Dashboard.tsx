import { useAuth } from '@/providers/AuthProvider';
import { logout } from '@/lib/firebase';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const { profile } = useAuth();

  const handleLogout = async () => {
    if (import.meta.env.VITE_USE_MOCKS !== 'false') {
      localStorage.removeItem('mock_fb_user');
      window.location.reload();
      return;
    }
    await logout();
  };

  return (
    <div className="min-h-screen w-full bg-background p-6">
      <header className="flex justify-between items-center mb-8 pb-4 border-b">
        <h1 className="font-serif text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="font-sans text-sm text-muted-foreground">
            {profile?.display_name || profile?.firebase_uid}
          </span>
          <Button variant="outline" size="sm" onClick={handleLogout} className="press">
            Sign Out
          </Button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="h-48 rounded-xl border bg-card flex flex-col items-center justify-center p-6 text-center shadow-sm">
          <h3 className="font-serif text-lg font-semibold mb-2">Reputation Score</h3>
          <div className="text-4xl font-mono text-primary font-bold">784</div>
          <div className="h-2 w-full mt-4 rounded-full bg-score-gradient" />
        </div>
        
        <div className="h-48 rounded-xl border border-dashed flex items-center justify-center text-muted-foreground">
          [Feed Placeholder]
        </div>
        
        <div className="h-48 rounded-xl border border-dashed flex items-center justify-center text-muted-foreground">
          [Activity Placeholder]
        </div>
      </div>
    </div>
  );
}
