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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-black text-foreground uppercase tracking-[0.1em]">Verification Audits</h2>
        <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md">
          {rows.length} pending review
        </span>
      </div>

      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <AuditsList initialAudits={rows} />
      </div>
    </div>
  );
}
