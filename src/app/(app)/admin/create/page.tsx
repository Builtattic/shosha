import * as accountsRepo from '@/lib/repos/accounts';
import * as usersRepo from '@/lib/repos/users';
import { AdminCreatePanel } from './AdminCreatePanel';

export const dynamic = 'force-dynamic';

export default async function AdminCreatePage() {
  const [accounts, users] = await Promise.all([accountsRepo.listAll(500), usersRepo.listAll(500)]);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-black text-foreground uppercase tracking-[0.1em]">Create & Override</h2>
        <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md">Feed claims, accounts, ownership</span>
      </div>
      <AdminCreatePanel
        initialAccounts={accounts.map((a) => ({ _id: a._id, displayName: a.displayName, username: a.username, platform: a.platform }))}
        users={users.map((u) => ({ _id: u._id, username: u.username, email: u.email }))}
      />
    </div>
  );
}
