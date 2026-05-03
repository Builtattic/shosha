import { Users } from 'lucide-react';
import * as usersRepo from '@/lib/repos/users';
import { UsersTable } from './UsersTable';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const users = await usersRepo.listAll(500);
  const adminCount = users.filter((u) => u.role !== 'user').length;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h2 className="text-[14px] font-black text-foreground uppercase tracking-[0.1em]">Registered Users</h2>
        <span className="shrink-0 text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md">
          {users.length} total · {adminCount} admin{adminCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="min-w-0 rounded-3xl border border-border bg-card overflow-hidden">
        <UsersTable initialUsers={users} />
      </div>
    </div>
  );
}
