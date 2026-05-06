'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, LogOut } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function SignInChip() {
  const { user, loading, signOut } = useAuth();
  const [mePhotoUrl, setMePhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setMePhotoUrl(null);
      return;
    }

    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const url = data?.data?.user?.photoUrl;
        if (url && url !== 'null' && url !== 'undefined') {
          setMePhotoUrl(url);
          return;
        }
        setMePhotoUrl(null);
      })
      .catch(() => {});
  }, [user]);

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

  const rawPhoto = mePhotoUrl || user.photoURL;
  const photo = rawPhoto && rawPhoto !== 'null' && rawPhoto !== 'undefined' ? rawPhoto : null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Link
          href="/profile"
          aria-label="Open profile"
          className="h-8 w-8 overflow-hidden rounded-full border border-border bg-muted flex items-center justify-center transition-opacity hover:opacity-80"
        >
          {photo ? (
            <img 
              src={photo} 
              alt="" 
              className="h-full w-full object-cover" 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.parentElement?.querySelector('.avatar-fallback');
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={cn(
            "avatar-fallback text-primary font-bold text-sm",
            photo && "hidden"
          )}>
            {(user.displayName?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
          </div>
        </Link>
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
