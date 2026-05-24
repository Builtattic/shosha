'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, Plus, Search, Upload, X } from 'lucide-react';
import { useReportModal } from '@/components/report/ReportModalProvider';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useMePhotoUrl } from '@/hooks/useMePhotoUrl';
import { cn } from '@/lib/utils';

export interface MobileAppHeaderProps {
  onSearch?: (query: string) => void;
  shareAction?: () => void;
  showSearch?: boolean;
  onSearchToggle?: () => void;
}

export function MobileAppHeader({
  onSearch,
  shareAction,
  showSearch = false,
  onSearchToggle,
}: MobileAppHeaderProps) {
  const router = useRouter();
  const reportModal = useReportModal();
  const { unreadCount } = useNotifications();
  const { user, signOut } = useAuth();
  const { photoUrl, imgError, setImgError } = useMePhotoUrl();
  const [query, setQuery] = useState('');

  const showAvatar = Boolean(photoUrl && !imgError);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 p-4 backdrop-blur-xl lg:hidden">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="font-serif text-[28px] font-black text-foreground">
            Sho<span className="font-normal italic text-muted-foreground">शा</span>
          </div>
          <div className="flex items-center gap-4">
            {shareAction && (
              <button
                type="button"
                onClick={shareAction}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Share profile card"
              >
                <Upload size={22} />
              </button>
            )}
            {onSearch && (
              <button
                type="button"
                onClick={onSearchToggle}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Search"
              >
                {showSearch ? <X size={22} /> : <Search size={22} />}
              </button>
            )}
            <button
              type="button"
              onClick={() => reportModal.open()}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Create report"
            >
              <Plus size={22} />
            </button>
            <button
              type="button"
              onClick={() => router.push('/notifications')}
              className="relative text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="pointer-events-none absolute right-0.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full border border-background bg-destructive px-1 text-[9px] font-bold text-background">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground [&>button]:flex [&>button]:h-full [&>button]:w-full [&>button]:items-center [&>button]:justify-center [&>button]:rounded-xl [&>button]:p-0 [&>button]:text-muted-foreground [&>button]:transition-colors [&>button]:hover:text-foreground">
              <ThemeToggle />
            </div>
            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted text-muted-foreground transition-opacity hover:opacity-80"
              aria-label="Profile"
            >
              {photoUrl ? (
                <img
                  key={photoUrl}
                  src={photoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                  onLoad={() => setImgError(false)}
                />
              ) : null}
              <div
                className={cn(
                  'avatar-fallback flex h-full w-full items-center justify-center text-primary text-sm font-bold',
                  showAvatar && 'hidden',
                )}
              >
                {(user?.displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}
              </div>
            </button>
            {user && (
              <button
                type="button"
                onClick={() => signOut()}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Sign out"
              >
                <LogOut size={22} />
              </button>
            )}
          </div>
        </div>
        {onSearch && showSearch && (
          <div className="mt-3">
            <input
              value={query}
              onChange={(event) => {
                const next = event.target.value;
                setQuery(next);
                onSearch(next);
              }}
              autoFocus
              placeholder="Search..."
              className="w-full rounded-full border border-border bg-card px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}
      </div>
    </header>
  );
}
