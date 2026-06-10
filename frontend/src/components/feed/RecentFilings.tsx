import { Link } from 'react-router-dom';
import type { FeedReport } from '@/types/feed';

export function RecentFilings({ filings }: { filings: FeedReport[] }) {
  if (filings.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="font-semibold text-foreground">The wire is quiet.</p>
        <p className="mt-1 text-sm text-muted-foreground">No public filings have crossed the desk yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
      {filings.map((filing) => (
        <Link
          key={filing.id}
          to={filing.account?.id ? `/accounts/${filing.account.id}` : '#'}
          className="block border border-border bg-card p-4 transition hover:border-primary/50"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{filing.type} filing</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-primary">{filing.status}</p>
          </div>
          <p className="mt-2 text-sm leading-6">{filing.description}</p>
          {filing.account ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {filing.account.display_name ?? filing.account.handle}
            </p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
