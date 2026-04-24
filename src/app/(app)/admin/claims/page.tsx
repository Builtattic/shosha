import { EmptyState } from '@/components/ui/EmptyState';
import { connectDb } from '@/lib/db';
import { serializeDoc } from '@/lib/utils';
import { ClaimRequest } from '@/models/ClaimRequest';

export const dynamic = 'force-dynamic';

export default async function ClaimsPage() {
  await connectDb();
  const claims = serializeDoc(
    await ClaimRequest.find({ status: 'pending' }).populate('accountId').populate('userId', 'username').sort({ createdAt: 1 }).lean()
  );
  return (
    <main className="px-4 py-6">
      <p className="text-xs uppercase text-accent">Tribunal</p>
      <h1 className="mt-2 font-serif text-6xl">Claims</h1>
      <div className="mt-6 space-y-3">
        {claims.length ? (
          claims.map((claim: any) => (
            <article key={claim._id} className="border border-border bg-raised p-4">
              <p className="text-xs uppercase text-muted">{claim.proofType}</p>
              <h2 className="mt-2 font-serif text-3xl">{claim.accountId?.displayName}</h2>
              <p className="mt-2 text-sm text-muted">Filed by {claim.userId?.username}</p>
            </article>
          ))
        ) : (
          <EmptyState title="No claims waiting." body="No one is asking to pin a name to a dossier." />
        )}
      </div>
    </main>
  );
}
