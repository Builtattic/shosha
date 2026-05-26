'use client';

import { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  Users, 
  ShieldCheck, 
  MoreHorizontal, 
  ArrowLeft,
  Bell,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/Toast';

type Member = {
  userId: string;
  name: string;
  username?: string;
  avatar: string;
  score: number;
  previousRank?: number;
  verified?: boolean;
};

type JoinRequest = {
  id: string;
  userId: string;
  name: string;
  username?: string;
  avatar: string;
  requestedAt: string;
  mutualConnections: number;
  approvals: number;
  rejections: number;
  threshold: number;
};

type BubbleReport = {
  id: string;
  accountName: string;
  accountAvatar: string;
  type: 'positive' | 'negative';
  description: string;
  category: string;
  score: number;
  createdAt: string;
};

type BubbleDetailProps = {
  bubble: {
    _id: string;
    name: string;
    tagline?: string;
    description: string;
    type: string;
    category?: string;
    coverImageUrl?: string;
    imageUrl?: string;
    createdBy: string;
    creatorName: string;
    creatorAvatar: string;
    createdAt: string;
    memberCount: number;
  };
  currentUser: {
    _id: string;
    username: string;
  } | null;
  members: Member[];
  requests: JoinRequest[];
  reports: BubbleReport[];
};

function formatDate(value: string, mode: 'short' | 'long' = 'long') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString(undefined, mode === 'short'
    ? { month: 'short', day: 'numeric' }
    : { month: 'long', day: 'numeric', year: 'numeric' });
}

function typeLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
}

export function BubbleDetail({ bubble, currentUser, members, requests: initialRequests, reports }: BubbleDetailProps) {
  const [activeTab, setActiveTab] = useState<'reports' | 'requests'>('reports');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [requests, setRequests] = useState(initialRequests);
  const [loading, setLoading] = useState<string | null>(null);
  const toast = useToast();

  const isMember = members.some(m => m.userId === currentUser?._id);
  const hasRequested = requests.some(r => r.userId === currentUser?._id);
  const approvalGoal = Math.max(1, requests[0]?.threshold ?? Math.floor(Math.max(1, members.length) / 2) + 1);
  const activeReports = reports.length;

  const handleVote = async (targetUserId: string, vote: 'approve' | 'reject') => {
    setLoading(`${targetUserId}-${vote}`);
    try {
      const res = await fetch(`/api/bubbles/${bubble._id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, vote }),
      });
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Vote failed');
      
      // Update local state — RTDB may drop empty arrays, so default to []
      setRequests(prev => prev.map(r => 
        r.userId === targetUserId 
          ? { ...r, approvals: (payload.data.approvals ?? []).length, rejections: (payload.data.rejections ?? []).length }
          : r
      ));
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
      const res = await fetch(`/api/bubbles/${bubble._id}/join`, {
        method: 'POST',
      });
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Join request failed');
      
      toast.push('Join request sent!');
      // Ideally refresh or update state
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
        await navigator.share({ title: bubble.name, text: bubble.tagline || bubble.description, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.push('Bubble link copied.');
      }
    } catch {
      toast.push('Share cancelled.');
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-20 safe-bottom">
      {/* Header / Cover */}
      <header className="relative">
        <div className="relative h-[210px] w-full overflow-hidden bg-muted md:h-[320px]">
          {bubble.coverImageUrl ? (
            <img
              src={bubble.coverImageUrl}
              alt={`${bubble.name} cover`}
              className="pointer-events-none absolute inset-0 block h-full w-full object-cover object-center"
              sizes="100vw"
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
            onClick={() => window.history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-background active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab('requests')} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-background active:scale-95" aria-label="Requests">
              <Bell size={20} />
              {requests.length > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground">
                  {requests.length}
                </span>
              )}
            </button>
            <button onClick={handleShare} className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-background active:scale-95" aria-label="Share bubble">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>

        {/* Bubble Info Card */}
        <div className="mx-auto w-full max-w-md px-3 md:max-w-5xl md:px-8">
          <div className="relative -mt-9 overflow-x-clip rounded-[22px] border border-border bg-card p-4 shadow-xl shadow-black/10 md:-mt-16 md:rounded-[26px] md:p-6">
            <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="flex min-w-0 flex-1 gap-4 md:gap-6">
                <div className="relative -mt-16 shrink-0 md:-mt-20">
                  <div className="h-24 w-24 overflow-hidden rounded-[18px] border-4 border-card bg-background shadow-xl md:h-32 md:w-32 md:rounded-[24px]">
                    {bubble.imageUrl ? (
                      <img src={bubble.imageUrl} alt={bubble.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground text-xl font-black md:text-3xl">
                        {initials(bubble.name)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-1 pt-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <h1 className="min-w-0 flex-1 truncate text-[24px] font-black leading-tight tracking-tight text-foreground md:text-[34px]">{bubble.name}</h1>
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary md:h-6 md:w-6">
                      <ShieldCheck size={16} strokeWidth={3} />
                    </div>
                  </div>
                  <p className="line-clamp-2 text-[13px] font-bold text-muted-foreground md:text-[16px]">{bubble.tagline || typeLabel(bubble.type)}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {!isMember && (
                  <button 
                    onClick={handleJoin}
                    disabled={hasRequested || loading === 'join'}
                    className={cn(
                      "h-11 rounded-full px-6 text-[13px] font-black transition-all duration-200 active:scale-95 md:h-12 md:px-8 md:text-[14px]",
                      hasRequested 
                        ? "bg-muted text-muted-foreground cursor-default shadow-none" 
                        : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
                    )}
                  >
                    {loading === 'join' ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : hasRequested ? 'Requested' : 'Join Community'}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 grid min-w-0 grid-cols-2 gap-3 border-y border-border/50 py-4 md:grid-cols-4 md:gap-5 md:py-5">
              <div className="min-w-0 space-y-1.5 border-r border-border/50 pr-3">
                <p className="text-[10px] font-black tracking-wider text-muted-foreground">Created by</p>
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {bubble.creatorAvatar ? (
                      <img src={bubble.creatorAvatar} alt={bubble.creatorName} className="h-full w-full object-cover" />
                    ) : initials(bubble.creatorName)}
                  </div>
                  <span className="min-w-0 truncate text-[13px] font-bold">{bubble.creatorName}</span>
                </div>
              </div>
              <div className="min-w-0 space-y-1.5 md:border-r md:border-border/50 md:pr-3">
                <p className="text-[10px] font-black tracking-wider text-muted-foreground">Created on</p>
                <div className="flex min-w-0 items-center gap-2">
                  <Calendar size={14} className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate text-[13px] font-bold">{formatDate(bubble.createdAt)}</span>
                </div>
              </div>
              <div className="min-w-0 space-y-1.5 border-r border-border/50 pr-3">
                <p className="text-[10px] font-black tracking-wider text-muted-foreground">Members</p>
                <div className="flex min-w-0 items-center gap-2">
                  <Users size={14} className="shrink-0 text-muted-foreground" />
                  <span className="text-[13px] font-bold">{bubble.memberCount.toLocaleString()}</span>
                </div>
              </div>
              <div className="min-w-0 space-y-1.5">
                <p className="text-[10px] font-black tracking-wider text-muted-foreground">Type</p>
                <div className="flex items-center gap-2">
                  <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black text-primary">
                    {typeLabel(bubble.type)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 min-w-0">
              <p className={cn(
                "text-[13px] leading-relaxed text-muted-foreground transition-all md:text-[15px]",
                !showFullDesc && "line-clamp-2"
              )}>
                {bubble.description}
              </p>
              <button 
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
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-8">
          {/* Left Column: Leaderboard */}
          <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={20} className="text-primary" />
                <h2 className="text-[16px] font-black tracking-tight">Member Leaderboard</h2>
              </div>
              <button className="text-[12px] font-black text-primary hover:underline">View All</button>
            </div>

            <div className="min-w-0 overflow-hidden rounded-[16px] border border-border bg-card shadow-sm">
              <div className="grid grid-cols-[2.75rem_4rem_minmax(0,1fr)_2.5rem] items-center gap-x-2 border-b bg-muted/30 px-3 py-3 text-[10px] font-black text-muted-foreground sm:grid-cols-[3rem_4.5rem_minmax(0,1fr)_2.75rem] sm:px-4">
                <span>Rank</span>
                <span>Score</span>
                <span className="min-w-0">Profile</span>
                <span className="text-right">Move</span>
              </div>
              <div className="divide-y divide-border/50">
                {members.slice(0, 8).map((m, i) => {
                  const rank = i + 1;
                  const trend = typeof m.previousRank === 'number' ? m.previousRank - rank : 0;
                  return (
                    <div key={m.userId} className="grid grid-cols-[2.75rem_4rem_minmax(0,1fr)_2.5rem] items-center gap-x-2 px-3 py-3 transition-colors duration-200 hover:bg-muted/20 sm:grid-cols-[3rem_4.5rem_minmax(0,1fr)_2.75rem] sm:px-4">
                      <div className="flex items-center justify-center">
                        {rank <= 3 ? (
                          <div className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-black ring-2",
                            rank === 1 ? "bg-amber-100 text-amber-600 ring-amber-200" :
                            rank === 2 ? "bg-slate-100 text-slate-500 ring-slate-200" :
                            "bg-orange-100 text-orange-600 ring-orange-200"
                          )}>
                            {rank}
                          </div>
                        ) : (
                          <span className="text-[14px] font-bold text-muted-foreground">{rank}</span>
                        )}
                      </div>
                      <div className="text-[13px] font-black tabular-nums text-foreground">
                        {m.score.toLocaleString()}
                      </div>
                      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-full bg-muted overflow-hidden border-2 border-border/50 shadow-inner">
                          <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="flex min-w-0 items-center gap-1 text-[14px] font-black">
                            <span className="min-w-0 truncate">{m.name}</span>
                            {m.verified && <ShieldCheck size={12} className="shrink-0 text-primary" />}
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        "flex items-center justify-end gap-1 text-[12px] font-black",
                        trend > 0 ? "text-green-600" : trend < 0 ? "text-red-500" : "text-muted-foreground"
                      )}>
                        {trend > 0 ? <TrendingUp size={14} /> : trend < 0 ? <TrendingDown size={14} /> : null}
                        {trend !== 0 ? Math.abs(trend) : '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
              {members.length === 0 && (
                <div className="p-8 text-center text-sm font-bold text-muted-foreground">No members yet.</div>
              )}
            </div>
          </div>

          {/* Right Column: Reports & Requests */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex rounded-[24px] bg-muted/50 p-1.5 border border-border">
              <button 
                onClick={() => setActiveTab('reports')}
                className={cn(
                  "flex-1 rounded-[18px] py-3 text-[14px] font-black transition-all duration-200",
                  activeTab === 'reports' ? "bg-card text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Reports
                <span className={cn(
                  "ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black",
                  activeTab === 'reports' ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"
                )}>
                  {activeReports}
                </span>
              </button>
              <button 
                onClick={() => setActiveTab('requests')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-3 rounded-[18px] py-3 text-[14px] font-black transition-all duration-200",
                  activeTab === 'requests' ? "bg-card text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Requests
                <span className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black",
                  activeTab === 'requests' ? "bg-primary text-white" : "bg-muted-foreground/20 text-muted-foreground"
                )}>
                  {requests.length}
                </span>
              </button>
            </div>

            <div className="mt-4 min-h-[400px]">
              <AnimatePresence mode="wait">
                {activeTab === 'reports' ? (
                  <motion.div 
                    key="reports"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="space-y-3"
                  >
                    {reports.map((report) => (
                      <article key={report.id} className="rounded-[16px] border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/20 hover:shadow-md">
                        <div className="flex items-start gap-3">
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-muted">
                            <img src={report.accountAvatar} alt={report.accountName} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-[14px] font-black">{report.accountName}</p>
                              <span className={cn(
                                "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black",
                                report.type === 'positive' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                              )}>
                                {report.score > 0 ? '+' : ''}{Math.round(report.score)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">
                              {report.category} - {formatDate(report.createdAt, 'short')}
                            </p>
                            <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                              {report.description}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                    {reports.length === 0 && (
                      <div className="rounded-[16px] border border-dashed border-border bg-card p-10 text-center shadow-sm">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground/50">
                          <Building2 size={24} />
                        </div>
                        <p className="text-sm font-black">No member reports yet</p>
                        <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">
                          This bubble is using real data. Approved activity tied to members will appear here when it exists.
                        </p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="requests"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between px-2 mb-2">
                      <p className="text-[12px] font-bold text-muted-foreground">
                        New members need {approvalGoal} approval{approvalGoal === 1 ? '' : 's'} to join this bubble.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {requests.map(req => {
                        const progress = (req.approvals / req.threshold) * 100;
                        return (
                          <div key={req.id} className="rounded-[16px] border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/20 hover:shadow-md">
                            <div className="mb-4 flex items-start justify-between">
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-muted overflow-hidden shadow-inner border border-border/50">
                                  <img src={req.avatar} alt={req.name} className="h-full w-full object-cover" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[16px] font-black leading-tight">{req.name}</p>
                                  <p className="mt-1 text-[11px] font-bold text-muted-foreground">
                                    @{req.username} - requested {formatDate(req.requestedAt, 'short')} - {req.mutualConnections} mutuals
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleVote(req.userId, 'approve')}
                                  disabled={!!loading}
                                  className="flex-1 flex items-center justify-center gap-2 rounded-full bg-green-50 px-4 py-2.5 text-[12px] font-black text-green-600 transition-all duration-200 hover:bg-green-100 disabled:opacity-50 active:scale-95"
                                >
                                  {loading === `${req.userId}-approve` ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                                  ) : (
                                    <>
                                      <CheckCircle2 size={16} />
                                      <span>{req.approvals} Approve</span>
                                    </>
                                  )} 
                                </button>
                                <button 
                                  onClick={() => handleVote(req.userId, 'reject')}
                                  disabled={!!loading}
                                  className="flex-1 flex items-center justify-center gap-2 rounded-full bg-red-50 px-4 py-2.5 text-[12px] font-black text-red-600 transition-all duration-200 hover:bg-red-100 disabled:opacity-50 active:scale-95"
                                >
                                  {loading === `${req.userId}-reject` ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                                  ) : (
                                    <>
                                      <XCircle size={16} />
                                      <span>{req.rejections} Reject</span>
                                    </>
                                  )} 
                                </button>
                              </div>

                              <div className="pt-2">
                                <div className="mb-2 flex justify-between text-[11px] font-black uppercase tracking-wider">
                                  <span className="text-muted-foreground">Approval Progress</span>
                                  <span className="text-primary">{Math.min(100, Math.round(progress))}%</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, progress)}%` }}
                                    transition={{ duration: 0.35, ease: 'easeOut' }}
                                    className="h-full bg-primary"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {requests.length === 0 && (
                      <div className="rounded-[32px] border border-dashed border-border p-12 text-center text-muted-foreground">
                        <Users size={40} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold">No pending join requests.</p>
                      </div>
                    )}

                    {requests.length > 0 && (
                      <div className="rounded-[16px] bg-muted/30 px-4 py-3 text-[12px] font-bold text-muted-foreground">
                        Approval progress updates instantly after each vote.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
