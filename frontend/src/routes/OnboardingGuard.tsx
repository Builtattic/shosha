import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';

export const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const { profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  }

  if (!profile) {
    // If somehow we get here without a profile but passed ProtectedRoute,
    // they might still be loading, but let's assume they need to onboard.
    return <Navigate to="/onboard" state={{ from: location }} replace />;
  }

  if (!profile.onboarding_complete) {
    return <Navigate to="/onboard" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
