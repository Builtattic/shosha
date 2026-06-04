import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Search, Upload, User, X } from 'lucide-react';
import { useReportModal } from '@/contexts/ReportModalContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { MobileMenu } from '@/components/nav/MobileMenu';

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
  const navigate = useNavigate();
  const reportModal = useReportModal();
  const { unreadCount } = useNotifications();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  
  const iconButtonClass =
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

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
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 p-4 backdrop-blur-xl lg:hidden">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          {/* Wordmark with Hamburger */}
          <div className="flex items-center gap-3">
            
            <div className="font-serif text-[28px] font-black text-foreground">
              Sho<span className="font-normal italic text-muted-foreground">शा</span>
            </div>
          </div>
          
          
          {/* Action cluster */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={iconButtonClass}
              aria-label="Search"
            >
              <Search size={22} />
            </button>
            {/* Share (only shown on profile/account pages) */}
            {shareAction && (
              <button
                type="button"
                onClick={shareAction}
                className={iconButtonClass}
                aria-label="Share profile card"
              >
                <Upload size={22} />
              </button>
            )}

            {/* Search toggle */}
            {onSearch && (
              <button
                type="button"
                onClick={onSearchToggle}
                className={iconButtonClass}
                aria-label={showSearch ? 'Close search' : 'Search'}
              >
                {showSearch ? <X size={22} /> : <Search size={22} />}
              </button>
            )}

            {/* Create report */}
            <button
              type="button"
              onClick={() => reportModal.open()}
              className={iconButtonClass}
              aria-label="Create report"
            >
              <Plus size={22} />
            </button>

            {/* Notifications */}
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className={iconButtonClass + ' relative'}
              aria-label="Notifications"
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="pointer-events-none absolute right-0.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full border border-background bg-destructive px-1 text-[9px] font-bold text-background">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

        
            {/* Profile */}
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className={iconButtonClass}
              aria-label="Profile"
            >
              <User size={22} />
            </button>
          </div>
        </div>

        {/* Search panel opens below the navbar instead of replacing the top bar */}
        {searchOpen && (
          <div className="mt-3 border-t border-border pt-3">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                placeholder="Search..."
                className="min-w-0 flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={closeSearch}
                className={iconButtonClass}
                aria-label="Close search"
              >
                <X size={18} />
              </button>
            </form>
          </div>
        )}
      </div>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}

