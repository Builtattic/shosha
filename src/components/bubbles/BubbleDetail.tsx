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
        <div className="h-[240px] w-full bg-muted">
          {bubble.coverImageUrl && (
            <img src={bubble.coverImageUrl} alt={`${bubble.name} cover`} className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
        
        <div className="absolute top-0 flex w-full items-center justify-between px-4 py-4">
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md">
              <Bell size={20} />
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white">3</span>
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>

        {/* Bubble Info Card */}
        <div className="mx-4 -mt-16 overflow-hidden rounded-[28px] border border-border bg-card p-5 shadow-xl">
          <div className="flex items-end justify-between">
            <div className="relative -mt-10">
              <div className="h-20 w-20 overflow-hidden rounded-[24px] border-4 border-card bg-background shadow-lg">
                {bubble.imageUrl ? (
                  <img src={bubble.imageUrl} alt={bubble.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <Users size={32} className="text-muted-foreground" />
                  </div>
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-foreground">
                <Camera size={14} />
              </button>
            </div>

            {!isMember && (
              <button 
                onClick={handleJoin}
                disabled={hasRequested || loading === 'join'}
                className={cn(
                  "h-10 rounded-full px-6 text-[13px] font-black transition-all active:scale-95",
                  hasRequested ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-white hover:opacity-90"
                )}
              >
                {loading === 'join' ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : hasRequested ? 'Requested' : 'Join Bubble'}
              </button>
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2">
              <h1 className="text-[24px] font-black leading-tight text-foreground">{bubble.name}</h1>
              <ShieldCheck size={20} className="text-primary" />
            </div>
            <p className="text-[14px] font-bold text-muted-foreground">{bubble.tagline}</p>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-muted-foreground">Created by</p>
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-4 rounded-full bg-muted" />
                <span className="truncate text-[11px] font-bold">{bubble.creatorName}</span>
              </div>
            </div>
            <div className="space-y-1 text-center">
              <p className="text-[10px] font-black uppercase text-muted-foreground">Created on</p>
              <div className="flex items-center justify-center gap-1.5">
                <Calendar size={11} className="text-muted-foreground" />
                <span className="text-[11px] font-bold">{new Date(bubble.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="space-y-1 text-center">
              <p className="text-[10px] font-black uppercase text-muted-foreground">Members</p>
              <div className="flex items-center justify-center gap-1.5">
                <Users size={11} className="text-muted-foreground" />
                <span className="text-[11px] font-bold">{bubble.memberCount}</span>
              </div>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] font-black uppercase text-muted-foreground">Type</p>
              <div className="flex items-center justify-end gap-1.5">
                <div className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary uppercase">
                  {bubble.type.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t pt-4">
            <p className={cn(
              "text-[13px] leading-relaxed text-muted-foreground transition-all",
              !showFullDesc && "line-clamp-2"
            )}>
              {bubble.description}
            </p>
            <button 
              onClick={() => setShowFullDesc(!showFullDesc)}
              className="mt-1 text-[12px] font-black text-primary"
            >
              {showFullDesc ? 'Show less' : '...more'}
            </button>
          </div>
        </div>
      </header>

      <main className="mt-6 px-4 space-y-6">
        {/* Member Leaderboard */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-primary" />
              <h2 className="text-[16px] font-black">Member Leaderboard</h2>
            </div>
            <button className="text-[12px] font-black text-primary">View All</button>
          </div>

          <div className="rounded-[24px] border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[50px_1fr_60px_40px] items-center border-b bg-muted/30 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              <span>Rank</span>
              <span>Profile</span>
              <span className="text-center">Score</span>
              <span></span>
            </div>
            <div className="divide-y">
              {members.slice(0, 5).map((m, i) => {
                const rank = i + 1;
                const trend = m.previousRank ? m.previousRank - rank : 0;
                return (
                  <div key={m.userId} className="grid grid-cols-[50px_1fr_60px_40px] items-center px-4 py-3">
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
                      <div className="h-8 w-8 rounded-full bg-muted overflow-hidden">
                        <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-black flex items-center gap-1">
                          {m.name}
                          {m.verified && <ShieldCheck size={12} className="text-primary" />}
                        </p>
                      </div>
                    </div>
                    <div className="text-center text-[15px] font-black tabular-nums">
                      {m.score.toLocaleString()}
                    </div>
                    <div className="flex justify-end">
                      {trend !== 0 ? (
                        <div className={cn(
                          "flex items-center gap-0.5 text-[11px] font-black",
                          trend > 0 ? "text-green-500" : "text-red-500"
                        )}>
                          {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {Math.abs(trend)}
                        </div>
                      ) : (
                        <div className="h-1 w-2 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Tabs: Member Reports / Requests */}
        <section>
          <div className="flex rounded-2xl bg-muted/50 p-1">
            <button 
              onClick={() => setActiveTab('reports')}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-[13px] font-black transition-all",
                activeTab === 'reports' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              Member Reports
            </button>
            <button 
              onClick={() => setActiveTab('requests')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-black transition-all",
                activeTab === 'requests' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              Requests
              <span className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black",
                activeTab === 'requests' ? "bg-primary text-white" : "bg-muted-foreground/20 text-muted-foreground"
              )}>
                {requests.length}
              </span>
            </button>
          </div>

          <div className="mt-4">
            <AnimatePresence mode="wait">
              {activeTab === 'reports' ? (
                <motion.div 
                  key="reports"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-[28px] border border-border bg-card p-6 text-center"
                >
                  <p className="text-[13px] text-muted-foreground">No recent member reports.</p>
                </motion.div>
              ) : (
                <motion.div 
                  key="requests"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <p className="px-2 text-[12px] font-medium text-muted-foreground italic">
                    New members need majority approval to join this bubble.
                  </p>
                  
                  {requests.map(req => {
                    const progress = (req.approvals / req.threshold) * 100;
                    return (
                      <div key={req.id} className="rounded-[24px] border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-muted overflow-hidden shadow-inner">
                              <img src={req.avatar} alt={req.name} className="h-full w-full object-cover" />
                            </div>
                            <div>
                              <p className="text-[15px] font-black">{req.name}</p>
                              <p className="text-[11px] font-medium text-muted-foreground">
                                Requested {req.requestedAt} • {req.mutualConnections} mutual connections
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleVote(req.userId, 'approve')}
                              disabled={!!loading}
                              className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1.5 text-[11px] font-black text-green-600 transition-colors hover:bg-green-100 disabled:opacity-50"
                            >
                              {loading === `${req.userId}-approve` ? (
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                              ) : (
                                <span className="text-[13px]">{req.approvals}</span>
                              )} 
                              Approve
                            </button>
                            <button 
                              onClick={() => handleVote(req.userId, 'reject')}
                              disabled={!!loading}
                              className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-black text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                            >
                              {loading === `${req.userId}-reject` ? (
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                              ) : (
                                <span className="text-[13px]">{req.rejections}</span>
                              )} 
                              Reject
                            </button>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="mb-1.5 flex justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            <span>Requires 60% approval to join</span>
                            <span className="text-foreground">{Math.min(100, Math.round(progress))}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
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

                  <button className="flex w-full items-center justify-between rounded-xl bg-muted/30 px-4 py-3 text-[13px] font-black transition-colors hover:bg-muted/50">
                    View all requests
                    <ChevronUp className="rotate-90 text-muted-foreground" size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
}
