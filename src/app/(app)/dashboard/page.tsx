import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { EmptyState } from '@/components/ui/EmptyState';
import { authOptions } from '@/lib/auth';
import { connectDb } from '@/lib/db';
import { serializeDoc } from '@/lib/utils';
import { Account } from '@/models/Account';
import { Report } from '@/models/Report';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  await connectDb();
  const accounts = serializeDoc(await Account.find({ claimedBy: session?.user.id }).sort({ score: -1 }).lean());
  const filings = serializeDoc(await Report.find({ reporterId: session?.user.id }).sort({ createdAt: -1 }).limit(30).lean());

  return (
    <main className="px-4 py-6">
      <p className="text-xs uppercase text-accent">Your desk</p>
      <h1 className="mt-2 font-serif text-6xl">Dashboard</h1>
      <section className="mt-8">
        <h2 className="mb-3 font-serif text-4xl">Claimed accounts</h2>
        {accounts.length ? (
          <div className="space-y-3">
            {accounts.map((account: any) => (
              <Link key={account._id} href={`/account/${account._id}`} className="block border border-border bg-raised p-4">
                <div className="flex items-center justify-between">
                  <span>{account.displayName}</span>
                  <span className="font-serif text-4xl text-accent">{account.score}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No claimed files." body="Your name is not attached to any dossier yet." />
        )}
      </section>
      <section className="mt-8">
        <h2 className="mb-3 font-serif text-4xl">My filings</h2>
        {filings.length ? (
          <div className="space-y-3">
            {filings.map((filing: any) => (
              <article key={filing._id} className="border border-border bg-dim p-4">
                <p className="text-xs uppercase text-muted">{filing.status}</p>
                <p className="mt-2 text-sm leading-6">{filing.description}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No filings under your name." body="Your reporting ledger is still blank." />
        )}
      </section>
    </main>
  );
}
