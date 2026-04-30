import { Users } from 'lucide-react';
import * as usersRepo from '@/lib/repos/users';
import { UsersTable } from './UsersTable';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const users = await usersRepo.listAll(500);
  const adminCount = users.filter((u) => u.role !== 'user').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-black text-foreground uppercase tracking-[0.1em]">Registered Users</h2>
        <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md">
          {users.length} total · {adminCount} admin{adminCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <UsersTable initialUsers={users} />
      </div>
    </div>
  );
}
