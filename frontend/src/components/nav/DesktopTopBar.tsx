'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Plus, Search, User, X } from 'lucide-react';
import { useReportModal } from '@/contexts/ReportModalContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAuth } from '@/providers/AuthProvider';

const iconButtonClass =
  'p-2 rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

export function DesktopTopBar() {
  const navigate = useNavigate();
  const reportModal = useReportModal();
  const { unreadCount } = useNotifications();
  const { firebaseUser, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  const photoUrl = firebaseUser?.photoURL;
  const showAvatar = Boolean(photoUrl && !avatarError);

  function closeSearch() {
    setSearchOpen(false);
    setQuery('');
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
    closeSearch();
  }

  return (
    <header className="sticky top-0 z-40 hidden h-14 shrink-0 border-b border-border bg-background/80 backdrop-blur-xl lg:flex">
      <div className="flex w-full items-center justify-end gap-2 px-6">
        {searchOpen ? (
          <form onSubmit={handleSearchSubmit} className="mr-2 flex min-w-0 flex-1 max-w-md items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              placeholder="Search..."
              className="min-w-0 flex-1 rounded-full border border-border bg-card px-4 py-2 text-[14px] outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={closeSearch}
              className={iconButtonClass}
              aria-label="Close search"
            >
              <X size={22} />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={iconButtonClass}
            aria-label="Search"
          >
            <Search size={22} />
          </button>
        )}

        <button
          type="button"
          onClick={() => reportModal.open()}
          className={iconButtonClass}
          aria-label="Create report"
        >
          <Plus size={22} />
        </button>

        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className={`relative ${iconButtonClass}`}
          aria-label="Notifications"
        >
          <Bell size={22} />
          {unreadCount > 0 && (
            <span className="pointer-events-none absolute right-0.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full border border-background bg-destructive px-1 text-[9px] font-bold text-background">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

      

        <button
          type="button"
          onClick={() => navigate('/profile')}
          className={iconButtonClass}
          aria-label="Profile"
        >
          {showAvatar ? (
            <img
              src={photoUrl!}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <User size={22} />
          )}
        </button>

        {firebaseUser && (
          <button
            type="button"
            onClick={() => logout()}
            className={iconButtonClass}
            aria-label="Sign out"
          >
            <LogOut size={22} />
          </button>
        )}
      </div>
    </header>
  );
}
