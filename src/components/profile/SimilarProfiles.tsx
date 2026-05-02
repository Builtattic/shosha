import Link from 'next/link';
import { CheckCircle2, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { formatPlatform } from '@/lib/utils';
import type { AccountRecord } from '@/lib/repos/accounts';

type Props = {
  accounts: AccountRecord[];
};

export function SimilarProfiles({ accounts }: Props) {
  if (accounts.length === 0) return null;

  return (
    <div className="rounded-[24px] border border-border bg-background p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-bold text-foreground">Similar Profiles</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Other accounts on the same platform.</p>
        </div>
        <Link href="/ranks" className="text-[12px] font-bold text-muted-foreground hover:text-foreground">
          See all ranks →
        </Link>
      </div>

      <div className="space-y-2">
        {accounts.map((acc) => {
          const trend = acc.score >= 1000;
          return (
            <Link
              key={acc._id}
              href={`/account/${acc._id}`}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                {acc.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={acc.avatarUrl} alt={acc.displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[14px] font-black text-muted-foreground">
                    {acc.displayName[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                {acc.verified && (
                  <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5">
                    <CheckCircle2 size={10} className="text-foreground fill-foreground/10" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-foreground group-hover:text-foreground">
                  {acc.displayName}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {formatPlatform(acc.platform)}
                </p>
                {acc.followers && (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
                    <Users size={10} /> {acc.followers}
                  </p>
                )}
              </div>

              <div className="text-right shrink-0">
                <div className="text-[14px] font-black text-foreground tabular-nums leading-none">
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}
