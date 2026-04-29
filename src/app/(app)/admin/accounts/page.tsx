import { Database } from 'lucide-react';
import * as accountsRepo from '@/lib/repos/accounts';
import { AccountsTable } from './AccountsTable';

export const dynamic = 'force-dynamic';

export default async function AdminAccountsPage() {
  const accounts = await accountsRepo.listAll(500);
  const claimedCount = accounts.filter((a) => a.claimed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-black text-foreground uppercase tracking-[0.1em]">Social Accounts</h2>
        <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md">
          {accounts.length} tracked · {claimedCount} claimed
        </span>
      </div>

      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <AccountsTable initialAccounts={accounts} />
      </div>
    </div>
  );
}
