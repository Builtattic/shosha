import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { firebaseUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center">Loading...</div>; // Could be a Shimmer
  }

  if (!firebaseUser) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
