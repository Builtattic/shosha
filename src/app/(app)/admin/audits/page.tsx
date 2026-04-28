import { EmptyState } from '@/components/ui/EmptyState';
import * as accountsRepo from '@/lib/repos/accounts';
import * as auditsRepo from '@/lib/repos/auditRequests';
import * as usersRepo from '@/lib/repos/users';

export const dynamic = 'force-dynamic';

export default async function AuditsPage() {
  const audits = await auditsRepo.listPending();
  const accountIds = Array.from(new Set(audits.map((a) => a.accountId)));
  const userIds = Array.from(new Set(audits.map((a) => a.userId)));
  const [accounts, users] = await Promise.all([
    Promise.all(accountIds.map((id) => accountsRepo.findById(id))),
    Promise.all(userIds.map((id) => usersRepo.findById(id)))
  ]);
  const accountMap = new Map(accounts.filter(Boolean).map((a) => [a!._id, a!]));
  const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));

  return (
    <main className="px-4 py-6">
      <p className="text-xs uppercase text-accent">Tribunal</p>
      <h1 className="mt-2 font-serif text-6xl">Audits</h1>
      <div className="mt-6 space-y-3">
        {audits.length ? (
          audits.map((audit) => {
            const account = accountMap.get(audit.accountId);
            const user = userMap.get(audit.userId);
            return (
              <article key={audit._id} className="border border-border bg-raised p-4">
                <p className="text-xs uppercase text-muted">{audit.status}</p>
                <h2 className="mt-2 font-serif text-3xl">{account?.displayName ?? 'Unknown'}</h2>
                <p className="mt-2 text-sm text-muted">Filed by {user?.username ?? 'unknown'}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{audit.reason || 'No reason recorded.'}</p>
              </article>
            );
          })
        ) : (
          <EmptyState title="No audits waiting." body="No owner has asked the tribunal to reopen the score." />
        )}
      </div>
    </main>
  );
}
