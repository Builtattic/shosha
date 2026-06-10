import { useEffect, useState } from 'react';
import {
  Users,
  ArrowLeft,
  Bell,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Trophy,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/Toast';
import { joinBubble, listJoinRequests, voteOnJoinRequest } from '@/api/bubbles';
import type { BubbleDetail as BubbleDetailType, BubbleType, JoinRequest } from '@/types/bubble';

function bubbleTypeLabel(value: BubbleType | string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: string, mode: 'short' | 'long' = 'long') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString(
    undefined,
    mode === 'short'
      ? { month: 'short', day: 'numeric' }
      : { month: 'long', day: 'numeric', year: 'numeric' },
  );
}

function initialsFromId(id: string): string {
  return id.slice(0, 2).toUpperCase();
}

interface BubbleDetailProps {
  bubble: BubbleDetailType;
  currentUserId: string | null;
}

export default function BubbleDetail({ bubble, currentUserId }: BubbleDetailProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'requests'>('members');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [hasRequested, setHasRequested] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const toast = useToast();

  const members = bubble.members ?? [];
  const isMember = members.some((m) => m.user_id === currentUserId);
  const isOwnerOrAdmin = members.some(
    (m) =>
      m.user_id === currentUserId && (m.role === 'OWNER' || m.role === 'ADMIN'),
  );

  const sortedMembers = [...members].sort((a, b) => b.score - a.score).slice(0, 8);

  useEffect(() => {
    if (!isOwnerOrAdmin) return;
    void listJoinRequests(bubble.id)
      .then((data) => setRequests(data.filter((r) => r.status === 'PENDING')))
      .catch(() => setRequests([]));
  }, [bubble.id, isOwnerOrAdmin]);

  const handleVote = async (targetUserId: string, vote: 'approve' | 'reject') => {
    setLoading(`${targetUserId}-${vote}`);
    try {
      const updated = await voteOnJoinRequest(bubble.id, targetUserId, vote);
      setRequests((prev) =>
        prev.map((r) =>
          r.user_id === targetUserId
            ? {
                ...r,
                approvals: updated.approvals,
                rejections: updated.rejections,
                status: updated.status,
              }
            : r,
        ).filter((r) => r.status === 'PENDING'),
      );
      toast.push(`Vote recorded: ${vote}`);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLoading(null);
    }
  };

  const handleJoin = async () => {
    setLoading('join');
    try {
      await joinBubble(bubble.id);
      setHasRequested(true);
      toast.push('Join request sent!');
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLoading(null);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: bubble.name,
          text: bubble.tagline || bubble.description,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.push('Bubble link copied.');
      }
    } catch {
      toast.push('Share cancelled.');
    }
  };

  const approvalThreshold = Math.max(1, Math.floor(members.length / 2) + 1);

  return (
    <div className="safe-bottom min-h-screen overflow-x-hidden bg-background pb-20">
      <header className="relative">
        <div className="relative h-[210px] w-full overflow-hidden bg-muted md:h-[320px]">
          {bubble.cover_image_url ? (
            <img
              src={bubble.cover_image_url}
              alt={`${bubble.name} cover`}
              className="pointer-events-none absolute inset-0 block h-full w-full object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_15%_10%,rgba(249,115,22,0.28),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(59,130,246,0.18),transparent_30%),linear-gradient(135deg,var(--muted),var(--card))]">
              <Users size={54} className="text-muted-foreground/25" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
        </div>

        <div className="absolute top-0 z-10 flex w-full items-center justify-between px-4 py-4 md:px-8">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur-md transition-all hover:bg-background active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            {isOwnerOrAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur-md"
                aria-label="Requests"
              >
                <Bell size={20} />
                {requests.length > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground">
                    {requests.length}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleShare()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur-md"
              aria-label="Share bubble"
            >
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md px-3 md:max-w-5xl md:px-8">
          <div className="relative -mt-9 overflow-x-clip rounded-[22px] border border-border bg-card p-4 shadow-xl md:-mt-16 md:rounded-[26px] md:p-6">
            <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="flex min-w-0 flex-1 gap-4 md:gap-6">
                <div className="relative -mt-16 shrink-0 md:-mt-20">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[18px] border-4 border-card bg-primary text-2xl font-black text-primary-foreground shadow-xl md:h-32 md:w-32 md:rounded-[24px] md:text-3xl">
                    {bubble.image_url ? (
                      <img
                        src={bubble.image_url}
                        alt={bubble.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      bubble.name.charAt(0).toUpperCase()
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-1 pt-1">
                  <h1 className="min-w-0 flex-1 truncate text-[24px] font-black leading-tight md:text-[34px]">
                    {bubble.name}
                  </h1>
                  <p className="line-clamp-2 text-[13px] font-bold text-muted-foreground md:text-[16px]">
                    {bubble.tagline || bubbleTypeLabel(bubble.bubble_type)}
                  </p>
                </div>
              </div>

              {!isMember && (
                <button
                  type="button"
                  onClick={() => void handleJoin()}
                  disabled={hasRequested || loading === 'join'}
                  className={cn(
                    'h-11 rounded-full px-6 text-[13px] font-black transition-all md:h-12 md:px-8 md:text-[14px]',
                    hasRequested
                      ? 'cursor-default bg-muted text-muted-foreground'
                      : 'bg-primary text-white shadow-primary/20 hover:bg-primary/90',
                  )}
                >
                  {loading === 'join' ? (
                    <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : hasRequested ? (
                    'Requested'
                  ) : (
                    'Join Community'
                  )}
                </button>
              )}
            </div>

            <div className="mt-5 grid min-w-0 grid-cols-2 gap-3 border-y border-border/50 py-4 md:grid-cols-3 md:gap-5 md:py-5">
              <div className="min-w-0 space-y-1.5 border-r border-border/50 pr-3">
                <p className="text-[10px] font-black tracking-wider text-muted-foreground">
                  Created on
                </p>
                <div className="flex min-w-0 items-center gap-2">
                  <Calendar size={14} className="shrink-0 text-muted-foreground" />
                  <span className="truncate text-[13px] font-bold">
                    {formatDate(bubble.created_at)}
                  </span>
                </div>
              </div>
              <div className="min-w-0 space-y-1.5 border-r border-border/50 pr-3">
                <p className="text-[10px] font-black tracking-wider text-muted-foreground">
                  Members
                </p>
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-muted-foreground" />
                  <span className="text-[13px] font-bold">{bubble.member_count}</span>
                </div>
              </div>
              <div className="min-w-0 space-y-1.5">
                <p className="text-[10px] font-black tracking-wider text-muted-foreground">Type</p>
                <span className="inline-block rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black text-primary">
                  {bubbleTypeLabel(bubble.bubble_type)}
                </span>
              </div>
            </div>

            <div className="mt-4 min-w-0">
              <p
                className={cn(
                  'text-[13px] leading-relaxed text-muted-foreground md:text-[15px]',
                  !showFullDesc && 'line-clamp-2',
                )}
              >
                {bubble.description}
              </p>
              <button
                type="button"
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="mt-1 text-[12px] font-black text-primary hover:underline"
              >
                {showFullDesc ? 'Less' : '...more'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-5 w-full max-w-md px-3 md:mt-8 md:max-w-5xl md:px-8">
        {isOwnerOrAdmin && (
          <div className="mb-4 flex rounded-[24px] border border-border bg-muted/50 p-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={cn(
                'flex-1 rounded-[18px] py-3 text-[14px] font-black transition-all',
                activeTab === 'members'
                  ? 'bg-card text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Members
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-[18px] py-3 text-[14px] font-black transition-all',
                activeTab === 'requests'
                  ? 'bg-card text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Requests
              {requests.length > 0 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-black text-white">
                  {requests.length}
                </span>
              )}
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'members' || !isOwnerOrAdmin ? (
            <motion.div
              key="members"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <Trophy size={20} className="text-primary" />
                <h2 className="text-[16px] font-black">Member Leaderboard</h2>
              </div>

              <div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-sm">
                <div className="grid grid-cols-[2.75rem_4rem_minmax(0,1fr)] items-center gap-x-2 border-b bg-muted/30 px-3 py-3 text-[10px] font-black text-muted-foreground sm:grid-cols-[3rem_4.5rem_minmax(0,1fr)] sm:px-4">
                  <span>Rank</span>
                  <span>Score</span>
                  <span>Member</span>
                </div>
                <div className="divide-y divide-border/50">
                  {sortedMembers.map((m, i) => {
                    const rank = i + 1;
                    return (
                      <div
                        key={m.id}
                        className="grid grid-cols-[2.75rem_4rem_minmax(0,1fr)] items-center gap-x-2 px-3 py-3 sm:grid-cols-[3rem_4.5rem_minmax(0,1fr)] sm:px-4"
                      >
                        <span className="text-center text-[14px] font-bold text-muted-foreground">
                          {rank}
                        </span>
                        <span className="text-[13px] font-black tabular-nums">
                          {m.score.toLocaleString()}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-[11px] font-black">
                            {initialsFromId(m.user_id)}
                          </div>
                          <span className="truncate text-[13px] font-bold">
                            {m.role === 'OWNER' ? 'Owner' : m.role === 'ADMIN' ? 'Admin' : 'Member'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {sortedMembers.length === 0 && (
                  <div className="p-8 text-center text-sm font-bold text-muted-foreground">
                    No members yet.
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="requests"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="space-y-4"
            >
              <p className="px-2 text-[12px] font-bold text-muted-foreground">
                New members need {approvalThreshold} approval
                {approvalThreshold === 1 ? '' : 's'} to join.
              </p>
              {requests.map((req) => {
                const progress = (req.approvals.length / approvalThreshold) * 100;
                return (
                  <div
                    key={req.id}
                    className="rounded-[16px] border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="mb-4 flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-black">
                        {initialsFromId(req.user_id)}
                      </div>
                      <div>
                        <p className="text-[16px] font-black">Join request</p>
                        <p className="text-[11px] font-bold text-muted-foreground">
                          Requested {formatDate(req.created_at, 'short')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleVote(req.user_id, 'approve')}
                        disabled={!!loading}
                        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-green-50 px-4 py-2.5 text-[12px] font-black text-green-600 hover:bg-green-100 disabled:opacity-50"
                      >
                        <CheckCircle2 size={16} />
                        {req.approvals.length} Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleVote(req.user_id, 'reject')}
                        disabled={!!loading}
                        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-red-50 px-4 py-2.5 text-[12px] font-black text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        <XCircle size={16} />
                        {req.rejections.length} Reject
                      </button>
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 flex justify-between text-[11px] font-black uppercase">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-primary">{Math.min(100, Math.round(progress))}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, progress)}%` }}
                          className="h-full bg-primary"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {requests.length === 0 && (
                <div className="rounded-[32px] border border-dashed border-border p-12 text-center text-muted-foreground">
                  <Users size={40} className="mx-auto mb-4 opacity-20" />
                  <p className="font-bold">No pending join requests.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
