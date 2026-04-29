import { ClipboardList } from 'lucide-react';
import * as accountsRepo from '@/lib/repos/accounts';
import * as claimsRepo from '@/lib/repos/claimRequests';
import * as usersRepo from '@/lib/repos/users';
import { ClaimsList } from './ClaimsList';

export const dynamic = 'force-dynamic';

export default async function ClaimsPage() {
  const claims = await claimsRepo.listPending();
  const accountIds = Array.from(new Set(claims.map((c) => c.accountId)));
  const userIds = Array.from(new Set(claims.map((c) => c.userId)));
  const [accounts, users] = await Promise.all([
    Promise.all(accountIds.map((id) => accountsRepo.findById(id))),
    Promise.all(userIds.map((id) => usersRepo.findById(id))),
  ]);
  const accountMap = new Map(accounts.filter(Boolean).map((a) => [a!._id, a!]));
  const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));

  const rows = claims.map((claim) => {
    const account = accountMap.get(claim.accountId) ?? null;
    const user = userMap.get(claim.userId) ?? null;
    return {
      _id: claim._id,
      proofType: claim.proofType,
      proofPayload: claim.proofPayload,
      createdAt: claim.createdAt,
      account: account
        ? { _id: account._id, displayName: account.displayName, platform: account.platform, username: account.username }
        : null,
      user: user ? { _id: user._id, username: user.username, email: user.email } : null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-black text-foreground uppercase tracking-[0.1em]">Identity Claims</h2>
        <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md">
          {rows.length} pending review
        </span>
      </div>

      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <ClaimsList initialClaims={rows} />
      </div>
    </div>
  );
}
