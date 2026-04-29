import { Users } from 'lucide-react';
import * as usersRepo from '@/lib/repos/users';
import { UsersTable } from './UsersTable';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const users = await usersRepo.listAll(500);
  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-white/30 font-bold mb-2">Tribunal</p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Users</h1>
            <p className="text-white/40 text-sm mt-1">{users.length} total · {adminCount} admin{adminCount !== 1 ? 's' : ''}</p>
          </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
            <Users size={20} className="text-purple-400" />
          </div>
        </div>
      </div>

      <UsersTable initialUsers={users} />
    </div>
  );
}
