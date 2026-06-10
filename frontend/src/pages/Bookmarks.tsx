import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { getMyBookmarks } from '@/api/me';
import { cn, formatDate } from '@/lib/utils';

interface BookmarkItem {
  bookmark_id: string;
  report: {
    id: string;
    title: string | null;
    description: string;
    status: string;
    deed: string | null;
    base_score: number | null;
    created_at: string;
  };
  account: {
    id: string;
    handle: string;
    platform: string;
    display_name: string | null;
    score: number;
  } | null;
  bookmarked: boolean;
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
    case 'PENDING':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    case 'REJECTED':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export default function Bookmarks() {
  const navigate = useNavigate();
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getMyBookmarks()
      .then((data) => {
        if (!alive) return;
        setItems(data.bookmarks ?? []);
      })
      .catch(() => {
        if (alive) setError('Failed to load bookmarks');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleClick = (item: BookmarkItem) => {
    if (item.account?.id) {
      navigate(`/accounts/${item.account.id}`);
    } else {
      navigate(`/reports/${item.report.id}`);
    }
  };

  return (
    <main className="min-h-screen bg-background safe-bottom pb-20 md:pb-8">
      <div className="mx-auto max-w-2xl px-4 pt-4">
        <h1 className="font-serif text-[28px] font-black leading-none tracking-tight text-foreground">
          Bookmarks
        </h1>
        <p className="mt-1 text-[12px] text-muted-foreground">Filings you saved for later.</p>

        {loading && (
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-[18px] border border-border bg-card"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-6 rounded-[24px] border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-[14px] font-bold text-destructive">{error}</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="mt-6 rounded-[24px] border border-border bg-card p-8 text-center">
            <Bookmark size={28} className="mx-auto text-muted-foreground/60" />
            <p className="mt-3 text-[15px] font-bold text-foreground">No bookmarks yet</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Tap the bookmark icon on any filing to save it here.
            </p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="mt-6 space-y-3">
            {items.map((item) => {
              const label = item.report.deed ?? item.report.title ?? 'Report';
              const score = item.report.base_score ?? 0;
              return (
                <button
                  key={item.bookmark_id}
                  type="button"
                  onClick={() => handleClick(item)}
                  className="w-full rounded-[18px] border border-border bg-card p-4 text-left transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-foreground truncate">{label}</p>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        {truncate(item.report.description, 100)}
                      </p>
                      {item.account && (
                        <p className="mt-2 text-[12px] text-muted-foreground">
                          {item.account.platform} · @{item.account.handle}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground/70">
                        {formatDate(item.report.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase',
                          statusBadgeClass(item.report.status),
                        )}
                      >
                        {item.report.status}
                      </span>
                      <span
                        className={cn(
                          'text-[14px] font-black tabular-nums',
                          score >= 0 ? 'text-emerald-600' : 'text-destructive',
                        )}
                      >
                        {score >= 0 ? '+' : ''}
                        {score}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
