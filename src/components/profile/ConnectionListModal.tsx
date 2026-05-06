'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Users, UserRound } from 'lucide-react';
import { FollowButton } from '@/components/profile/FollowButton';
import { cn } from '@/lib/utils';

type ConnectionType = 'followers' | 'following';

type ConnectionUser = {
  _id: string;
  name: string;
  username: string;
  photoUrl: string | null;
  headline: string | null;
  followersCount: number;
  isSelf: boolean;
  isFollowing: boolean;
};

export function ConnectionListModal({
  targetUserId,
  followersCount,
  followingCount,
  className,
}: {
  targetUserId: string;
  followersCount: number;
  followingCount: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeType, setActiveType] = useState<ConnectionType>('followers');
  const [users, setUsers] = useState<ConnectionUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  function show(type: ConnectionType) {
    setActiveType(type);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    fetch(`/api/users/${encodeURIComponent(targetUserId)}/connections?type=${activeType}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((payload) => {
        if (!active) return;
        setUsers(payload?.data?.users ?? []);
        setTotal(payload?.data?.total ?? 0);
      })
      .catch(() => {
        if (!active) return;
        setUsers([]);
        setTotal(0);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeType, open, targetUserId]);

  return (
    <>
      <div className={cn('flex items-center gap-3 text-[12px]', className)}>
        <button
          type="button"
          onClick={() => show('following')}
          className="rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-muted"
        >
          <span className="font-bold text-foreground tabular-nums">{followingCount}</span>
          <span className="ml-1 text-muted-foreground">Following</span>
        </button>
        <button
          type="button"
          onClick={() => show('followers')}
          className="rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-muted"
        >
          <span className="font-bold text-foreground tabular-nums">{followersCount}</span>
          <span className="ml-1 text-muted-foreground">Followers</span>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <section className="max-h-[86vh] w-full max-w-md overflow-hidden border border-border bg-background shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground">
                  <Users size={16} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-foreground">
                    {activeType === 'followers' ? 'Followers' : 'Following'}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">{total.toLocaleString()} total</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close connections"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2 border-b border-border px-4 py-3">
              {(['followers', 'following'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveType(type)}
                  className={cn(
                    'flex-1 rounded-lg px-3 py-2 text-[12px] font-bold capitalize transition-colors',
                    activeType === type
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-3">
              {loading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-16 animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <UserRound size={26} className="text-muted-foreground/50" />
                  <p className="text-[13px] font-semibold text-foreground">No users yet</p>
                  <p className="text-[12px] text-muted-foreground">
                    This list will fill in as people connect.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((item) => (
                    <div key={item._id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                      <Link
                        href={`/account/website_${item.username.replace(/^@/, '')}`}
                        className="flex min-w-0 flex-1 items-center gap-3"
                        onClick={() => setOpen(false)}
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                          {item.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.photoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[13px] font-bold text-muted-foreground">
                              {(item.name || item.username || '?')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-foreground">{item.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            @{item.username.replace(/^@/, '')}
                            {item.headline ? ` - ${item.headline}` : ''}
                          </p>
                        </div>
                      </Link>
                      {!item.isSelf && (
                        <FollowButton targetUserId={item._id} initialFollowing={item.isFollowing} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
