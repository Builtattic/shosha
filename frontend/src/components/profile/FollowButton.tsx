import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  targetUserId: string;
  initialFollowing?: boolean;
}

// Stub — full V1 FollowButton to be ported from source.
export function FollowButton({ targetUserId: _targetUserId, initialFollowing = false }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 450));
    setFollowing((f) => !f);
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn(
        'w-full rounded-full py-1.5 text-[11px] font-bold transition-all disabled:opacity-60',
        following
          ? 'border border-border bg-background text-foreground hover:bg-muted'
          : 'bg-primary text-primary-foreground hover:opacity-90'
      )}
    >
      {loading ? '…' : following ? 'Following' : 'Follow'}
    </button>
  );
}
