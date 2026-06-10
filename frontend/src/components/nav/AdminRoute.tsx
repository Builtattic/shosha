import { Navigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { isAdminRole } from '@/lib/roles';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, sessionReady } = useAuth();

  if (!sessionReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading…
      </div>
    );
  }

  if (!isAdminRole(profile?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
