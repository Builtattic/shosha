import { ShieldCheck } from 'lucide-react';
import { listTrustBadgePending } from '@/lib/repos/users';
import { TrustBadgeQueue } from './TrustBadgeQueue';

export const dynamic = 'force-dynamic';

export default async function TrustBadgePage() {
  const items = await listTrustBadgePending();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-black text-foreground uppercase tracking-[0.1em]">Trust Badge Review</h2>
        <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md">
          {items.length} pending review
        </span>
      </div>

      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <TrustBadgeQueue items={items} />
      </div>
    </div>
  );
}
