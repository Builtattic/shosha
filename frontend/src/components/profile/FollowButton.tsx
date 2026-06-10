import { useState } from 'react';
import { UserPlus, UserCheck } from 'lucide-react';
import { followUser, unfollowUser } from '@/api/social';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  targetUserId: string;
  initialFollowing: boolean;
  className?: string;
}

export function FollowButton({
  targetUserId,
  initialFollowing,
  className,
}: FollowButtonProps) {
  const toast = useToast();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !following;
    setFollowing(next);
    setLoading(true);
    try {
      if (next) {
        await followUser(targetUserId);
      } else {
        await unfollowUser(targetUserId);
      }
    } catch {
      setFollowing(!next);
      toast.push(next ? 'Failed to follow' : 'Failed to unfollow');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[13px] font-bold transition-all disabled:opacity-50',
        following
          ? 'border-border bg-card text-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive'
          : 'border-foreground bg-foreground text-background hover:bg-foreground/90',
        className,
      )}
    >
      {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
