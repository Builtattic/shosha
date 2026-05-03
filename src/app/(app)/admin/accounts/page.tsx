import { Database } from 'lucide-react';
import * as accountsRepo from '@/lib/repos/accounts';
import { AccountsTable } from './AccountsTable';

export const dynamic = 'force-dynamic';

export default async function AdminAccountsPage() {
  const accounts = await accountsRepo.listAll(500);
  const claimedCount = accounts.filter((a) => a.claimed).length;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h2 className="text-[14px] font-black text-foreground uppercase tracking-[0.1em]">Social Accounts</h2>
        <span className="shrink-0 text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md">
          {accounts.length} tracked · {claimedCount} claimed
        </span>
      </div>

      <div className="min-w-0 rounded-3xl border border-border bg-card overflow-hidden">
        <AccountsTable initialAccounts={accounts} />
      </div>
    </div>
  );
}
