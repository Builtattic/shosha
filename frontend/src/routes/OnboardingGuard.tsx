import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';

export const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const { profile, isLoading } = useAuth();
  const location = useLocation();

  // While auth or profile is resolving (including after refetchProfile()) — hold.
  // This prevents the guard from bouncing to /onboard during the brief window
  // between navigate('/dashboard') and the updated profile landing in the cache.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  // No profile at all — need to onboard
  if (!profile) {
    return <Navigate to="/onboard" state={{ from: location }} replace />;
  }

  // Profile exists but onboarding not complete
  if (!profile.onboarding_complete) {
    return <Navigate to="/onboard" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
