import { Inbox } from 'lucide-react';
import * as accountsRepo from '@/lib/repos/accounts';
import * as moderationRequestsRepo from '@/lib/repos/moderationRequests';
import * as reportsRepo from '@/lib/repos/reports';
import * as usersRepo from '@/lib/repos/users';
import { ModerationRequestsList } from './ModerationRequestsList';

export const dynamic = 'force-dynamic';

export default async function AdminModerationPage() {
  const requests = await moderationRequestsRepo.listAll(200);
  const [reports, accounts, requesters] = await Promise.all([
    Promise.all(requests.map((item) => reportsRepo.findById(item.reportId))),
    Promise.all(Array.from(new Set(requests.map((item) => item.accountId))).map((id) => accountsRepo.findById(id))),
    Promise.all(Array.from(new Set(requests.map((item) => item.requestedBy))).map((id) => usersRepo.findById(id))),
  ]);
  const reportMap = new Map(reports.filter(Boolean).map((item) => [item!._id, item!]));
  const accountMap = new Map(accounts.filter(Boolean).map((item) => [item!._id, item!]));
  const requesterMap = new Map(requesters.filter(Boolean).map((item) => [item!._id, item!]));

  const rows = requests.map((item) => ({
    ...item,
    report: reportMap.get(item.reportId) ?? null,
    account: accountMap.get(item.accountId) ?? null,
    requester: requesterMap.get(item.requestedBy) ?? null,
  }));

  const pendingCount = rows.filter((item) => item.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Inbox size={18} />
          </div>
          <div>
            <h2 className="text-[14px] font-black uppercase tracking-[0.1em] text-foreground">Moderation Requests</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">User appeals for filing deletion or review.</p>
          </div>
        </div>
        <span className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-bold text-muted-foreground">
          {pendingCount} pending
        </span>
      </div>

      <ModerationRequestsList initialRequests={rows} />
    </div>
  );
}
