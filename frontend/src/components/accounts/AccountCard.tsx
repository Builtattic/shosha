import { useNavigate } from 'react-router-dom';
import type { Account } from '@/types/account';
import { cn } from '@/lib/utils';

export function AccountCard({ account }: { account: Account }) {
  const navigate = useNavigate();
  const name = account.display_name ?? account.handle;

  return (
    <button
      type="button"
      onClick={() => navigate(`/accounts/${account.id}`)}
      className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-foreground">{name}</p>
          <p className="text-[12px] text-muted-foreground">@{account.handle}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
            'bg-muted text-muted-foreground',
          )}
        >
          {account.platform}
        </span>
      </div>
      {account.bio ? (
        <p className="mt-2 line-clamp-2 text-[12px] text-muted-foreground">{account.bio}</p>
      ) : null}
      <p className="mt-3 text-[13px] font-semibold tabular-nums text-foreground">
        Score: {account.score.toLocaleString()}
      </p>
    </button>
  );
}
