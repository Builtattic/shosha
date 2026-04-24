import { EmptyState } from '@/components/ui/EmptyState';

type Filing = {
  _id: string;
  type: 'positive' | 'negative';
  description: string;
  feelings: string;
  anonymousTag: string;
  status: string;
  aiVerdict?: { proposedImpact: number; confidence: number; reasoning: string };
  createdAt: string;
};

export function FilingsList({ filings }: { filings: Filing[] }) {
  if (!filings.length) {
    return <EmptyState title="No filings on record." body="The dossier has a blank incident ledger." />;
  }
  return (
    <div className="space-y-3">
      {filings.map((filing) => (
        <article key={filing._id} className="border border-border bg-dim p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase text-muted">{filing.anonymousTag}</p>
            <p className="text-xs uppercase text-accent">{filing.type}</p>
          </div>
          <p className="mt-3 text-sm leading-6">{filing.description}</p>
          <p className="mt-3 border-l border-border pl-3 text-xs leading-5 text-muted">{filing.feelings}</p>
          {filing.aiVerdict ? (
            <p className="mt-3 text-xs uppercase text-muted">
              AI impact {filing.aiVerdict.proposedImpact} at {Math.round(filing.aiVerdict.confidence * 100)}%
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
