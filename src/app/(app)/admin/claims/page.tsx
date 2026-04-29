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
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-white/30 font-bold mb-2">Tribunal</p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Claims</h1>
            <p className="text-white/40 text-sm mt-1">{rows.length} claim{rows.length !== 1 ? 's' : ''} pending review</p>
          </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20">
            <ClipboardList size={20} className="text-orange-400" />
          </div>
        </div>
      </div>
      <ClaimsList initialClaims={rows} />
    </div>
  );
}
