import { SearchFeed } from '@/components/feed/SearchFeed';
import { RecentFilings } from '@/components/feed/RecentFilings';
import { EmptyState } from '@/components/ui/EmptyState';
import { connectDb } from '@/lib/db';
import { serializeDoc } from '@/lib/utils';
import { Account } from '@/models/Account';
import { Report } from '@/models/Report';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let accounts: any[] = [];
  let filings: any[] = [];
  try {
    await connectDb();
    accounts = serializeDoc(await Account.find({}).sort({ score: -1 }).limit(20).lean());
    filings = serializeDoc(
      await Report.find({ status: { $in: ['approved', 'ai_reviewed'] } })
        .populate('accountId', 'displayName')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    );
  } catch {
    accounts = [];
    filings = [];
  }

  return (
    <main>
      <section className="border-b border-border px-4 py-8">
        <p className="text-xs uppercase text-accent">Public reputation dossier</p>
        <h1 className="mt-3 font-serif text-6xl leading-none">Shosha Score index</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          Search social accounts, inspect filings, and open the record behind the number.
        </p>
      </section>
      <SearchFeed initialAccounts={accounts} />
      <section className="border-t border-border px-4 py-5">
        <h2 className="mb-3 font-serif text-4xl">Recent filings</h2>
        {accounts.length === 0 && filings.length === 0 ? (
          <EmptyState title="Archive not connected." body="Add environment values and seed the database to wake the index." />
        ) : (
          <RecentFilings filings={filings} />
        )}
      </section>
    </main>
  );
}
