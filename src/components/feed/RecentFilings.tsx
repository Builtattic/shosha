import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';

type Filing = {
  _id: string;
  accountId: { _id: string; displayName: string } | string;
  type: 'positive' | 'negative';
  description: string;
  status: string;
};

export function RecentFilings({ filings }: { filings: Filing[] }) {
  if (filings.length === 0) {
    return <EmptyState title="The wire is quiet." body="No public filings have crossed the desk yet." />;
  }

  return (
    <div className="space-y-2">
      {filings.map((filing) => {
        const account = typeof filing.accountId === 'string' ? null : filing.accountId;
        return (
          <Link
            key={filing._id}
            href={account ? `/account/${account._id}` : '#'}
            className="block border border-border bg-dim p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase text-muted">{filing.type} filing</p>
              <p className="text-xs uppercase text-accent">{filing.status}</p>
            </div>
            <p className="mt-2 text-sm leading-6">{filing.description}</p>
            {account ? <p className="mt-2 text-xs text-muted">{account.displayName}</p> : null}
          </Link>
        );
      })}
    </div>
  );
}
