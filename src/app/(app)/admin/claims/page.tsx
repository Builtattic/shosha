import { EmptyState } from '@/components/ui/EmptyState';
import * as accountsRepo from '@/lib/repos/accounts';
import * as claimsRepo from '@/lib/repos/claimRequests';
import * as usersRepo from '@/lib/repos/users';

export const dynamic = 'force-dynamic';

export default async function ClaimsPage() {
  const claims = await claimsRepo.listPending();
  const accountIds = Array.from(new Set(claims.map((c) => c.accountId)));
  const userIds = Array.from(new Set(claims.map((c) => c.userId)));
  const [accounts, users] = await Promise.all([
    Promise.all(accountIds.map((id) => accountsRepo.findById(id))),
    Promise.all(userIds.map((id) => usersRepo.findById(id)))
  ]);
  const accountMap = new Map(accounts.filter(Boolean).map((a) => [a!._id, a!]));
  const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));

  return (
    <main className="px-4 py-6">
      <p className="text-xs uppercase text-accent">Tribunal</p>
      <h1 className="mt-2 font-serif text-6xl">Claims</h1>
      <div className="mt-6 space-y-3">
        {claims.length ? (
          claims.map((claim) => {
            const account = accountMap.get(claim.accountId);
            const user = userMap.get(claim.userId);
            return (
              <article key={claim._id} className="border border-border bg-raised p-4">
                <p className="text-xs uppercase text-muted">{claim.proofType}</p>
                <h2 className="mt-2 font-serif text-3xl">{account?.displayName ?? 'Unknown'}</h2>
                <p className="mt-2 text-sm text-muted">Filed by {user?.username ?? 'unknown'}</p>
              </article>
            );
          })
        ) : (
          <EmptyState title="No claims waiting." body="No one is asking to pin a name to a dossier." />
        )}
      </div>
    </main>
  );
}
