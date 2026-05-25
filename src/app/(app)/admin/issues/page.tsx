import { AlertTriangle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import * as issueReportsRepo from '@/lib/repos/issueReports';
import { IssuesList } from './IssuesList';

export const dynamic = 'force-dynamic';

export default async function AdminIssuesPage() {
  await requireAdmin();
  const items = await issueReportsRepo.listAll(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-black text-foreground uppercase tracking-[0.1em]">Reported Issues</h2>
        <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md">
          {items.length} total
        </span>
      </div>

      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        {items.length === 0 ? (
          <div className="p-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-foreground mb-2">No issue reports yet</h3>
            <p className="text-muted-foreground text-sm">Incoming issues will appear here for triage.</p>
          </div>
        ) : (
          <IssuesList items={items} />
        )}
      </div>
    </div>
  );
}
