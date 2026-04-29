import { Search } from 'lucide-react';
import * as accountsRepo from '@/lib/repos/accounts';
import * as auditsRepo from '@/lib/repos/auditRequests';
import * as usersRepo from '@/lib/repos/users';
import { AuditsList } from './AuditsList';

export const dynamic = 'force-dynamic';

export default async function AuditsPage() {
  const audits = await auditsRepo.listPending();
  const accountIds = Array.from(new Set(audits.map((a) => a.accountId)));
  const userIds = Array.from(new Set(audits.map((a) => a.userId)));
  const [accounts, users] = await Promise.all([
    Promise.all(accountIds.map((id) => accountsRepo.findById(id))),
    Promise.all(userIds.map((id) => usersRepo.findById(id))),
  ]);
  const accountMap = new Map(accounts.filter(Boolean).map((a) => [a!._id, a!]));
  const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));

  const rows = audits.map((audit) => ({
    _id: audit._id,
    reason: audit.reason,
    status: audit.status,
    createdAt: audit.createdAt,
    account: accountMap.get(audit.accountId)
      ? { _id: accountMap.get(audit.accountId)!._id, displayName: accountMap.get(audit.accountId)!.displayName, platform: accountMap.get(audit.accountId)!.platform, username: accountMap.get(audit.accountId)!.username }
      : null,
    user: userMap.get(audit.userId)
      ? { _id: userMap.get(audit.userId)!._id, username: userMap.get(audit.userId)!.username, email: userMap.get(audit.userId)!.email }
      : null,
  }));

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-white/30 font-bold mb-2">Tribunal</p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Audits</h1>
            <p className="text-white/40 text-sm mt-1">{rows.length} pending review</p>
          </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Search size={20} className="text-cyan-400" />
          </div>
        </div>
      </div>
      <AuditsList initialAudits={rows} />
    </div>
  );
}
