import { useCallback, useEffect, useRef, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { getAccount } from '@/api/accounts';
import { getPublicUser } from '@/api/users';
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
  const [profileCredibility, setProfileCredibility] = useState<number | null>(null);
  const [weeklyDelta, setWeeklyDelta] = useState<number | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const connectionListModalRef = useRef<ConnectionListModalRef>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await getAccount(accountId);
      if (res.ok && res.data?.account) {
        const acc = res.data.account;
        setScore(acc.score ?? initialScore);
        setProfileCredibility(
          typeof acc.profile_credibility === 'number' ? acc.profile_credibility : null,
        );
        setWeeklyDelta(
          typeof acc.weekly_delta === 'number' ? acc.weekly_delta : null,
        );
      }
      if (linkedUserId) {
        const userRes = await getPublicUser(linkedUserId);
        if (userRes.ok && userRes.data?.user) {
          setFollowersCount(userRes.data.user.followers_count ?? 0);
          setFollowingCount(userRes.data.user.following_count ?? 0);
        }
      }
    } catch {
      // keep current values
    }
  }, [accountId, initialScore, linkedUserId]);

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

  const deltaPositive = weeklyDelta !== null && weeklyDelta > 0;
  const deltaNegative = weeklyDelta !== null && weeklyDelta < 0;

  return (
    <>
      {linkedUserId ? (
        <ConnectionListModal
          ref={connectionListModalRef}
          targetUserId={linkedUserId}
          followersCount={followersCount}
          followingCount={followingCount}
          showInlineTriggers={false}
        />
      ) : null}

      <div className="mt-6 flex flex-col items-center">
        <D3ProfileGauge score={score} size={280} />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Live dossier score (refreshes every 10s)
        </p>
        {profileCredibility !== null ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Profile credibility:{' '}
            <span className="font-semibold text-foreground">{profileCredibility}</span>
          </p>
        ) : null}
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
            {deltaPositive ? (
              <TrendingUp size={16} className="text-green-500" />
            ) : deltaNegative ? (
              <TrendingDown size={16} className="text-red-500" />
            ) : (
              <TrendingUp size={16} className="text-muted-foreground opacity-40" />
            )}
          </div>
          <p className="mt-1 text-[22px] font-black tabular-nums text-foreground">
            {weeklyDelta !== null
              ? `${weeklyDelta > 0 ? '+' : ''}${weeklyDelta.toLocaleString()}`
              : 'Pending'}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Weekly Delta
          </p>
        </div>
      </div>
    </>
  );
}
