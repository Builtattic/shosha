import { Database } from 'lucide-react';
import * as accountsRepo from '@/lib/repos/accounts';
import { AccountsTable } from './AccountsTable';

export const dynamic = 'force-dynamic';

export default async function AdminAccountsPage() {
  const accounts = await accountsRepo.listAll(500);
  const claimedCount = accounts.filter((a) => a.claimed).length;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-white/30 font-bold mb-2">Tribunal</p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Accounts</h1>
            <p className="text-white/40 text-sm mt-1">{accounts.length} tracked · {claimedCount} claimed</p>
          </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Database size={20} className="text-blue-400" />
          </div>
        </div>
      </div>

      <AccountsTable initialAccounts={accounts} />
    </div>
  );
}
