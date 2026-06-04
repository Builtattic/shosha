import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';

export function SignInChip() {
  const { firebaseUser, profile, isLoading, logout } = useAuth();
  const [imgError, setImgError] = useState(false);

  // Loading skeleton
  if (isLoading) {
    return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />;
  }

  // Guest state — sign in CTA
  if (!firebaseUser) {
    return (
      <Link
        to="/sign-in"
        className="flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-[12px] font-bold text-background transition-opacity hover:opacity-90"
      >
        <LogIn size={16} />
        Sign in
      </Link>
    );
  }

  // Prefer the profile's photo_url (kept fresh by TanStack Query refetch),
  // fall back to Firebase user's photoURL, then initials.
  const rawPhoto = profile?.photo_url || firebaseUser.photoURL;
  const photo = rawPhoto && rawPhoto !== 'null' && rawPhoto !== 'undefined' ? rawPhoto : null;

  const initial = (
    firebaseUser.displayName?.[0] ??
    firebaseUser.email?.[0] ??
    '?'
  ).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      {/* Avatar link → profile */}
      <Link
        to="/profile"
        aria-label="Open profile"
        className="h-8 w-8 overflow-hidden rounded-full border border-border bg-muted flex items-center justify-center transition-opacity hover:opacity-80"
      >
        {photo && !imgError ? (
          <img
            key={photo}
            src={photo}
            alt="Profile"
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
            onLoad={() => setImgError(false)}
          />
        ) : null}
        <div className={cn(
          'avatar-fallback text-primary font-bold text-sm',
          photo && !imgError && 'hidden',
        )}>
          {initial}
        </div>
      </Link>

      {/* Sign-out */}
      <button
        type="button"
        onClick={() => logout()}
        className="text-muted-foreground hover:text-foreground transition-colors"
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
