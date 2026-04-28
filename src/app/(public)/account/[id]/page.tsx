import { notFound } from 'next/navigation';
import { DossierActions } from '@/components/profile/DossierActions';
import { FilingsList } from '@/components/profile/FilingsList';
import { PostsFeed } from '@/components/profile/PostsFeed';
import { ScoreGauge } from '@/components/viz/ScoreGauge';
import { ScoreHistory } from '@/components/viz/ScoreHistory';
import { ScoreRadar } from '@/components/viz/ScoreRadar';
import { formatPlatform } from '@/lib/utils';
import { idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';

export const dynamic = 'force-dynamic';

export default async function AccountPage({ params }: { params: { id: string } }) {
  const id = idSchema.safeParse(params.id);
  if (!id.success) notFound();

  const account = await accountsRepo.findById(id.data);
  if (!account) notFound();

  const filings = await reportsRepo.listForAccount(id.data, ['approved', 'ai_reviewed', 'flagged'], 30);

  const history = account.scoreHistory?.length
    ? account.scoreHistory
    : [{ t: account.createdAt ?? new Date().toISOString(), s: account.score, cause: 'seed' as const }];
  const previous = history.length > 1 ? history[history.length - 2].s : 60;
  const delta = account.score - previous;

  return (
    <main>
      <section className="border-b border-border px-4 pb-4 pt-7">
        <p className="text-xs uppercase text-muted">{formatPlatform(account.platform)} dossier</p>
        <h1 className="mt-2 font-serif text-6xl leading-none">{account.displayName}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">@{account.username}</p>
        <div className="mt-5 border border-border bg-raised p-2">
          <ScoreGauge score={account.score} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs uppercase text-muted">
          <div className="border border-border p-3">Delta {delta > 0 ? `+${delta}` : delta}</div>
          <div className="border border-border p-3">{account.followers}</div>
          <div className="border border-border p-3">{account.claimed ? 'Claimed' : 'Unclaimed'}</div>
        </div>
      </section>
      <section className="space-y-4 px-4 py-5">
        <DossierActions accountId={account._id} claimedBy={account.claimedBy} />
      </section>
      <section className="border-t border-border px-4 py-5">
        <h2 className="mb-3 font-serif text-4xl">Score history</h2>
        <div className="border border-border bg-raised p-3">
          <ScoreHistory />
        </div>
      </section>
      <section className="border-t border-border px-4 py-5">
        <h2 className="mb-3 font-serif text-4xl">Breakdown</h2>
        <div className="border border-border bg-raised p-3">
          <ScoreRadar breakdown={account.breakdown} />
        </div>
      </section>
      <section className="border-t border-border px-4 py-5">
        <h2 className="mb-3 font-serif text-4xl">Captured posts</h2>
        <PostsFeed posts={account.posts ?? []} />
      </section>
      <section className="border-t border-border px-4 py-5">
        <h2 className="mb-3 font-serif text-4xl">Filings on record</h2>
        <FilingsList filings={filings as any} />
      </section>
    </main>
  );
}
