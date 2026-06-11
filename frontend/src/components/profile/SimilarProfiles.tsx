import { useNavigate } from 'react-router-dom';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface SimilarAccount {
  id: string;
  handle: string;
  platform: string;
  display_name: string | null;
  score: number;
}

interface SimilarProfilesProps {
  accounts: SimilarAccount[];
}

export default function SimilarProfiles({ accounts }: SimilarProfilesProps) {
  const navigate = useNavigate();

  if (accounts.length === 0) return null;

  return (
    <div className="rounded-[24px] border border-border bg-background p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-bold text-foreground">Similar Profiles</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Other accounts on the same platform.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/ranks')}
          className="text-[12px] font-bold text-muted-foreground hover:text-foreground"
        >
          See all ranks →
        </button>
      </div>

      <div className="space-y-2">
        {accounts.map((acc) => {
          const trend = acc.score >= 1000;
          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => navigate(`/accounts/${acc.id}`)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-[14px] font-black text-muted-foreground">
                {(acc.display_name ?? acc.handle)[0]?.toUpperCase() ?? '?'}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-foreground">
                  {acc.display_name ?? acc.handle}
                </p>
                <p className="truncate text-[11px] capitalize text-muted-foreground">
                  {acc.platform}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-[14px] font-black tabular-nums leading-none text-foreground">
                  {acc.score.toLocaleString()}
                </div>
                <div
                  className={`mt-1 inline-flex items-center gap-0.5 text-[10px] font-bold ${
                    trend ? 'text-primary' : 'text-destructive'
                  }`}
                >
                  {trend ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {trend ? 'Above base' : 'Below base'}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
