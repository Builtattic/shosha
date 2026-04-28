'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LogIn, LogOut } from 'lucide-react';
import Link from 'next/link';

export function SignInChip() {
  const { user, loading, signOut } = useAuth();

  if (loading) return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />;

  if (!user) {
    return (
      <Link
        href="/sign-in"
        className="flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-[12px] font-bold text-background transition-opacity hover:opacity-90"
      >
        <LogIn size={16} />
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {(user.displayName?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
          </div>
        )}
      </div>
      <button
        onClick={() => signOut()}
        className="text-muted-foreground hover:text-foreground transition-colors"
        title="Sign out"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
