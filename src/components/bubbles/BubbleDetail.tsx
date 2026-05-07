'use client';

import { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  ChevronUp, 
  Users, 
  ShieldCheck, 
  MoreHorizontal, 
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Camera,
  Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/Toast';

type Member = {
  userId: string;
  name: string;
  avatar: string;
  score: number;
  previousRank?: number;
  verified?: boolean;
};

type JoinRequest = {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  requestedAt: string;
  mutualConnections: number;
  approvals: number;
  rejections: number;
  threshold: number;
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
};

export function BubbleDetail({ bubble, currentUser, members, requests: initialRequests }: BubbleDetailProps) {
  const [activeTab, setActiveTab] = useState<'reports' | 'requests'>('reports');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [requests, setRequests] = useState(initialRequests);
  const [loading, setLoading] = useState<string | null>(null);
  const toast = useToast();

  const isMember = members.some(m => m.userId === currentUser?._id);
  const hasRequested = requests.some(r => r.userId === currentUser?._id);

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
      
      // Update local state
      setRequests(prev => prev.map(r => 
        r.userId === targetUserId 
          ? { ...r, approvals: payload.data.approvals.length, rejections: payload.data.rejections.length }
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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header / Cover */}
      <header className="relative">
        <div className="h-[240px] md:h-[350px] w-full bg-muted">
          {bubble.coverImageUrl && (
            <img src={bubble.coverImageUrl} alt={`${bubble.name} cover`} className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
        
        <div className="absolute top-0 flex w-full items-center justify-between px-4 py-4 md:px-8">
          <button 
            onClick={() => window.history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md transition-all hover:bg-black/40"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md transition-all hover:bg-black/40">
              <Bell size={20} />
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white">3</span>
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md transition-all hover:bg-black/40">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>

        {/* Bubble Info Card */}
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="-mt-16 md:-mt-24 relative overflow-hidden rounded-[32px] border border-border bg-card p-6 md:p-8 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative -mt-14 md:-mt-20">
                  <div className="h-24 w-24 md:h-32 md:w-32 overflow-hidden rounded-[28px] border-4 border-card bg-background shadow-2xl">
                    {bubble.imageUrl ? (
                      <img src={bubble.imageUrl} alt={bubble.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted">
                        <Users size={40} className="text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <button className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary text-white shadow-lg">
                    <Camera size={14} strokeWidth={3} />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-[28px] md:text-[36px] font-black leading-tight text-foreground tracking-tight">{bubble.name}</h1>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ShieldCheck size={16} strokeWidth={3} />
                    </div>
                  </div>
                  <p className="text-[14px] md:text-[18px] font-bold text-muted-foreground">{bubble.tagline}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isMember && (
                  <button 
                    onClick={handleJoin}
                    disabled={hasRequested || loading === 'join'}
                    className={cn(
                      "h-12 rounded-full px-8 text-[14px] font-black transition-all active:scale-95 shadow-lg",
                      hasRequested 
                        ? "bg-muted text-muted-foreground cursor-default shadow-none" 
                        : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
                    )}
                  >
                    {loading === 'join' ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-3 border-white border-t-transparent" />
                    ) : hasRequested ? 'Requested' : 'Join Community'}
                  </button>
                )}
                <button className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background transition-all hover:bg-muted active:scale-90">
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-border/50 pt-8">
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Founder</p>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    {bubble.creatorName[0]}
                  </div>
                  <span className="truncate text-[13px] font-bold">{bubble.creatorName}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Established</p>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-muted-foreground" />
                  <span className="text-[13px] font-bold">{new Date(bubble.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Community Size</p>
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-muted-foreground" />
                  <span className="text-[13px] font-bold">{bubble.memberCount.toLocaleString()} Members</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Visibility</p>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black text-primary uppercase tracking-wider border border-primary/20">
                    {bubble.type.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-muted/30 p-5">
              <p className={cn(
                "text-[14px] md:text-[15px] leading-relaxed text-muted-foreground transition-all",
                !showFullDesc && "line-clamp-2"
              )}>
                {bubble.description}
              </p>
              <button 
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="mt-2 text-[12px] font-black text-primary hover:underline"
              >
                {showFullDesc ? 'Show less description' : 'Read full description'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl mt-12 px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Leaderboard */}
          <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={20} className="text-primary" />
                <h2 className="text-[18px] font-black uppercase tracking-tight">Top Contributors</h2>
              </div>
              <button className="text-[12px] font-black text-primary hover:underline">View All</button>
            </div>

            <div className="rounded-[32px] border border-border bg-card overflow-hidden shadow-sm">
              <div className="grid grid-cols-[50px_1fr_60px] items-center border-b bg-muted/30 px-6 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <span>Rank</span>
                <span>Profile</span>
                <span className="text-right">Score</span>
              </div>
              <div className="divide-y divide-border/50">
                {members.slice(0, 8).map((m, i) => {
                  const rank = i + 1;
                  return (
                    <div key={m.userId} className="grid grid-cols-[50px_1fr_60px] items-center px-6 py-4 hover:bg-muted/10 transition-colors">
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
                      <div className="flex items-center gap-3 pl-2">
                        <div className="h-9 w-9 rounded-full bg-muted overflow-hidden border-2 border-border/50 shadow-inner">
                          <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-black flex items-center gap-1">
                            {m.name}
                            {m.verified && <ShieldCheck size={12} className="text-primary" />}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-[15px] font-black tabular-nums text-foreground">
                        {m.score.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="bg-muted/20 p-4 text-center">
                <button className="text-[13px] font-black text-muted-foreground hover:text-primary transition-colors">
                  Join the race for the top spot
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Reports & Requests */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex rounded-[24px] bg-muted/50 p-1.5 border border-border">
              <button 
                onClick={() => setActiveTab('reports')}
                className={cn(
                  "flex-1 rounded-[18px] py-3 text-[14px] font-black transition-all",
                  activeTab === 'reports' ? "bg-card text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Community Activity
              </button>
              <button 
                onClick={() => setActiveTab('requests')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-3 rounded-[18px] py-3 text-[14px] font-black transition-all",
                  activeTab === 'requests' ? "bg-card text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Pending Requests
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
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="rounded-[32px] border border-border bg-card p-12 text-center flex flex-col items-center justify-center gap-4 shadow-sm">
                      <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground/30">
                        <Building2 size={32} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-black uppercase tracking-tight">Quiet Zone</h3>
                        <p className="text-[14px] text-muted-foreground max-w-sm">No recent member reports or major activities to display. Start the conversation!</p>
                      </div>
                      <button className="mt-4 rounded-full bg-primary/10 px-6 py-2 text-[13px] font-black text-primary hover:bg-primary/20 transition-all">
                        Create Report
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="requests"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between px-2 mb-2">
                      <p className="text-[13px] font-bold text-muted-foreground italic">
                        New members require {bubble.type === 'private' ? '60%' : 'majority'} approval.
                      </p>
                      <button className="text-[12px] font-black text-primary">Batch Actions</button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {requests.map(req => {
                        const progress = (req.approvals / req.threshold) * 100;
                        return (
                          <div key={req.id} className="rounded-[32px] border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-6">
                              <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-[20px] bg-muted overflow-hidden shadow-inner border border-border/50">
                                  <img src={req.avatar} alt={req.name} className="h-full w-full object-cover" />
                                </div>
                                <div>
                                  <p className="text-[16px] font-black leading-tight">{req.name}</p>
                                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
                                    {req.mutualConnections} mutuals
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleVote(req.userId, 'approve')}
                                  disabled={!!loading}
                                  className="flex-1 flex items-center justify-center gap-2 rounded-full bg-green-50 px-4 py-3 text-[12px] font-black text-green-600 transition-all hover:bg-green-100 disabled:opacity-50 active:scale-95"
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
                                  className="flex-1 flex items-center justify-center gap-2 rounded-full bg-red-50 px-4 py-3 text-[12px] font-black text-red-600 transition-all hover:bg-red-100 disabled:opacity-50 active:scale-95"
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
                                    className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
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
                      <button className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-muted/30 px-4 py-4 text-[14px] font-black transition-all hover:bg-muted/50">
                        View All Application History
                        <ArrowRight size={18} />
                      </button>
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
