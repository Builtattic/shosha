import { Search } from 'lucide-react';
import * as accountsRepo from '@/lib/repos/accounts';
import * as evidenceRepo from '@/lib/repos/evidenceProposals';
import { EvidenceQueue } from './EvidenceQueue';

export default async function AdminEvidencePage() {
  const [accounts, proposals] = await Promise.all([
    accountsRepo.listAll(500),
    evidenceRepo.listPending(150)
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Search className="text-primary" size={28} />
          <h1 className="text-4xl font-black tracking-tight">Shosha Evidence</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Scan public profiles, review cited actions, and approve only what should enter the score ledger.</p>
      </div>
      <EvidenceQueue
        accounts={accounts.map((account) => ({
          _id: account._id,
          displayName: account.displayName,
          username: account.username,
          profileId: account.profileId
        }))}
        proposals={proposals}
      />
    </div>
  );
}
