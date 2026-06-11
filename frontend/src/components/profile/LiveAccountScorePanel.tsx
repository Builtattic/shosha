import { useCallback, useEffect, useRef, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { getAccount } from '@/api/accounts';
import {
  ConnectionListModal,
  type ConnectionListModalRef,
} from '@/components/profile/ConnectionListModal';
import D3ProfileGauge from '@/components/viz/D3ProfileGauge';

interface LiveAccountScorePanelProps {
  accountId: string;
  initialScore: number;
  /** When set, enables followers/following modal for this user (e.g. account owner). */
  linkedUserId?: string | null;
}

export default function LiveAccountScorePanel({
  accountId,
  initialScore,
  linkedUserId,
}: LiveAccountScorePanelProps) {
  const [score, setScore] = useState(initialScore);
  const connectionListModalRef = useRef<ConnectionListModalRef>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await getAccount(accountId);
      if (res.ok && res.data?.account) {
        setScore(res.data.account.score ?? initialScore);
      }
    } catch {
      // keep current score
    }
  }, [accountId, initialScore]);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 10_000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  return (
    <>
      {linkedUserId ? (
        <ConnectionListModal
          ref={connectionListModalRef}
          targetUserId={linkedUserId}
          followersCount={0}
          followingCount={0}
          showInlineTriggers={false}
        />
      ) : null}

      <div className="mt-6 flex flex-col items-center">
        <D3ProfileGauge score={score} size={280} />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Live dossier score (refreshes every 10s)
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-background p-4 text-center shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Current Score
          </p>
          <p className="mt-1 text-[22px] font-black tabular-nums text-foreground">
            {score.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4 text-center shadow-sm">
          <div className="mx-auto flex items-center justify-center gap-1 text-muted-foreground">
            <TrendingUp size={16} className="text-green-500" />
            <TrendingDown size={16} className="hidden" />
          </div>
          <p className="mt-1 text-[22px] font-black tabular-nums text-muted-foreground">—</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Weekly Delta
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {/* TODO: add followers + credibility when backend exposes them */}
            Approximate until score history is available
          </p>
        </div>
      </div>
    </>
  );
}
