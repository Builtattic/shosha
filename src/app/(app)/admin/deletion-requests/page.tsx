import { Inbox } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import * as deletionRequestsRepo from '@/lib/repos/deletionRequests';
import * as usersRepo from '@/lib/repos/users';
import { DeletionRequestsList } from './DeletionRequestsList';

export const dynamic = 'force-dynamic';

export default async function AdminDeletionRequestsPage() {
  await requireAdmin();

  const requests = await deletionRequestsRepo.listAll(100);
  const missingSnapshotUserIds = Array.from(
    new Set(requests.filter((item) => !item.userSnapshot).map((item) => item.userId))
  );
  const users = await Promise.all(missingSnapshotUserIds.map((id) => usersRepo.findById(id)));
  const userMap = new Map(users.filter(Boolean).map((user) => [user!._id, user!]));

  const rows = requests.map((request) => {
    const snapshot = request.userSnapshot;
    const user = snapshot
      ? { _id: request.userId, username: snapshot.username, email: snapshot.email, name: snapshot.name }
      : (userMap.get(request.userId) ?? null);
    return {
      ...request,
      user: user ? { _id: user._id, username: user.username, email: user.email, name: user.name } : null,
    };
  });

  const pendingCount = rows.filter((item) => item.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Inbox size={18} />
          </div>
          <div>
            <h2 className="text-[14px] font-black uppercase tracking-[0.1em] text-foreground">Deletion Requests</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">User-submitted profile removal requests.</p>
          </div>
        </div>
        <span className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-bold text-muted-foreground">
          {pendingCount} pending
        </span>
      </div>
      <DeletionRequestsList items={rows} />
    </div>
  );
}
