'use client';

import { useState } from 'react';
import { UserPlus, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FollowButton({
  targetUserId,
  initialFollowing,
}: {
  targetUserId: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${targetUserId}/follow`, {
        method: following ? 'DELETE' : 'POST',
      });
      if (res.ok) setFollowing(!following);
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
          : 'border-foreground bg-foreground text-background hover:bg-foreground/90'
      )}
    >
      {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
