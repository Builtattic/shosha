import { Database } from 'lucide-react';
import { getCurrentUser, isSuperAdmin } from '@/lib/auth';
import { listAdminDataCollections } from '@/lib/adminData';
import { DataCenterPanel } from './DataCenterPanel';

export const dynamic = 'force-dynamic';

export default async function AdminDataPage() {
  const user = await getCurrentUser();
  const collections = await listAdminDataCollections();

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[14px] font-black uppercase tracking-[0.1em] text-foreground">Data Center</h2>
          <p className="mt-1 text-[12px] font-medium text-muted-foreground">
            Inspect Firebase Realtime Database records from the admin dashboard.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-muted-foreground">
          <Database size={12} />
          {collections.length} collections
        </span>
      </div>

      <DataCenterPanel initialCollections={collections} canWrite={isSuperAdmin(user)} />
    </div>
  );
}
