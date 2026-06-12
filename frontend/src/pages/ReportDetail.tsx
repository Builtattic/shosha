import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ThumbsUp, ThumbsDown, MessageSquare, AlertTriangle, Shield, Send, MoreHorizontal } from 'lucide-react';
import { getReport, getComments, postVote, postComment, requestModeration } from '@/api/reports';
import type { FeedReport } from '@/types/feed';
import type { Comment } from '@/api/reports';
import { useAuth } from '@/providers/AuthProvider';
import { cn, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

export default function ReportDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const toast = useToast();
  
  const [report, setReport] = useState<FeedReport | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [voting, setVoting] = useState(false);
  const [showModConfirm, setShowModConfirm] = useState(false);
  const [modReason, setModReason] = useState('');
  const [requestingMod, setRequestingMod] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [repRes, comRes] = await Promise.all([
          getReport(id),
          getComments(id)
        ]);
        
        if (!mounted) return;
        
        if (repRes.ok && repRes.data) {
          setReport(repRes.data);
        } else {
          throw new Error(repRes.error || 'Report not found');
        }
        
        if (comRes.ok && comRes.data) {
          setComments(comRes.data.items);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load report');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    fetchAll();
    return () => { mounted = false; };
  }, [id]);

  const handleVote = async (type: 'ALIGN' | 'OPPOSE') => {
    if (!profile) {
      toast.push('Sign in required');
      return;
    }
    if (!report || voting) return;
    
    setVoting(true);
    // Optimistic update
    const prevStats = { ...report.stats };
    const prevVote = report.viewer?.vote;
    
    setReport(prev => {
      if (!prev) return prev;
      const next = { ...prev };
      if (!next.stats) next.stats = { aligns: 0, opposes: 0, comments: 0, shares: 0 };
      if (!next.viewer) next.viewer = { vote: null, bookmarked: false };
      
      const isAlign = type === 'ALIGN';
      const isOppose = type === 'OPPOSE';
      
      // Remove old vote if exists
      if (prevVote === 'ALIGN') next.stats.aligns = Math.max(0, next.stats.aligns - 1);
      if (prevVote === 'OPPOSE') next.stats.opposes = Math.max(0, next.stats.opposes - 1);
      
      // Apply new vote (toggle off if clicking same vote)
      if (prevVote === (isAlign ? 'ALIGN' : 'OPPOSE')) {
        next.viewer.vote = null;
      } else {
        next.viewer.vote = isAlign ? 'ALIGN' : 'OPPOSE';
        if (isAlign) next.stats.aligns++;
        if (isOppose) next.stats.opposes++;
      }
      return next;
    });

    try {
      const res = await postVote(report.id, type);
      if (res.ok && res.data) {
        // Sync with server aggregates
        setReport(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            stats: { 
              aligns: res.data!.aggregates.align_count, 
              opposes: res.data!.aggregates.oppose_count,
              comments: prev.stats?.comments ?? 0,
              shares: prev.stats?.shares ?? 0
            },
            viewer: { vote: res.data!.vote.vote_type, bookmarked: prev.viewer?.bookmarked ?? false }
          };
        });
      }
    } catch (err) {
      // Rollback
      setReport(prev => prev ? { ...prev, stats: prevStats as any, viewer: { ...prev.viewer, vote: prevVote as any, bookmarked: prev.viewer?.bookmarked ?? false } } : prev);
      toast.push('Vote failed');
    } finally {
      setVoting(false);
    }
  };

  const handlePostComment = async () => {
    if (!profile) {
      toast.push('Sign in required');
      return;
    }
    if (!commentInput.trim() || !report) return;
    
    setSubmittingComment(true);
    try {
      const res = await postComment(report.id, commentInput);
      if (res.ok && res.data) {
        setComments(prev => [res.data as Comment, ...prev]);
        setCommentInput('');
        setReport(prev => prev && prev.stats ? { ...prev, stats: { ...prev.stats, comments: prev.stats.comments + 1 } } : prev);
      } else {
        throw new Error('Failed');
      }
    } catch {
      toast.push('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleModRequest = async () => {
    if (!report) return;
    setRequestingMod(true);
    try {
      const res = await requestModeration(report.id, { reason: modReason });
      if (res.ok) {
        toast.push('Moderation requested');
        setShowModConfirm(false);
        setReport(prev => prev ? { ...prev, can_request_moderation: false } : prev);
      } else {
        throw new Error('Failed');
      }
    } catch {
      toast.push('Failed to request moderation');
    } finally {
      setRequestingMod(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 animate-pulse max-w-2xl mx-auto space-y-6">
        <div className="w-10 h-10 bg-muted rounded-full" />
        <div className="h-6 w-3/4 bg-muted rounded" />
        <div className="h-40 bg-muted rounded-2xl" />
        <div className="h-20 bg-muted rounded-xl" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Shield className="w-12 h-12 text-destructive mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">Report Not Found</h2>
        <p className="text-muted-foreground mb-6">{error || 'This report may have been removed or sealed.'}</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-secondary rounded-full font-medium">Go Back</button>
      </div>
    );
  }

  const isPositive = report.type === 'positive';
  const score = report.report_score ?? report.base_score ?? 0;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Top Nav */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-sm font-medium text-muted-foreground flex items-center">
          <span className={cn("w-2 h-2 rounded-full mr-2", isPositive ? 'bg-emerald-500' : 'bg-destructive')} />
          {isPositive ? 'Praise' : 'Concern'} Report
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Account Subject Chip */}
        {report.account && (() => {
          const subject = report.account;
          return (
            <div
              onClick={() => navigate(`/accounts/${subject.id}`)}
              className="inline-flex items-center space-x-2 bg-card border border-border/50 hover:bg-muted/50 transition-colors p-1.5 pr-4 rounded-full cursor-pointer"
            >
              <img
                src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(subject.display_name ?? subject.handle)}`}
                alt=""
                className="w-8 h-8 rounded-full bg-background"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-tight">{subject.display_name ?? subject.handle}</span>
                <span className="text-xs text-muted-foreground leading-tight">@{subject.handle.replace(/^@/, '')}</span>
              </div>
            </div>
          );
        })()}

        {/* Hero Info */}
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={cn("px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wide", 
              isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
            )}>
              {report.category || 'Uncategorised'}
            </span>
            <span className="px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wide bg-muted text-muted-foreground">
              {report.deed || 'Report'}
            </span>
            {score !== 0 && (
              <span className={cn("px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wide ml-auto",
                score > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
              )}>
                {score > 0 ? '+' : ''}{score} Impact
              </span>
            )}
          </div>
          
          <p className="text-foreground text-lg leading-relaxed whitespace-pre-wrap">
            {report.description}
          </p>
          
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-muted-foreground">{formatDate(report.created_at || '')}</span>
            {report.reporter ? (
              <div className="flex items-center text-xs text-muted-foreground">
                By <img src={report.reporter.photo_url || `https://api.dicebear.com/9.x/initials/svg?seed=${report.reporter.username}`} alt="" className="w-4 h-4 rounded-full mx-1.5" /> 
                <span className="font-medium">{report.reporter.display_name || report.reporter.username}</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded">Anonymous Report</span>
            )}
          </div>
        </div>

        {/* Media */}
        {report.media.length > 0 && (
          <div className="space-y-2">
            {report.media.map((item, index) => (
              <div key={index} className="rounded-2xl overflow-hidden border border-border/50 bg-black/5">
                {item.media_type === 'video' ? (
                  <video src={item.url} controls className="w-full h-auto object-cover max-h-[500px]" />
                ) : (
                  <img src={item.url} alt="Evidence" className="w-full h-auto object-cover max-h-[500px]" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Vote Bar */}
        <div className="flex items-center space-x-2 bg-card border border-border/50 p-2 rounded-2xl">
          <button
            onClick={() => handleVote('ALIGN')}
            className={cn("flex-1 flex justify-center items-center py-2.5 rounded-xl font-bold transition-all",
              report.viewer?.vote === 'ALIGN' 
                ? "bg-emerald-500 text-white" 
                : "bg-muted/50 hover:bg-muted text-foreground"
            )}
          >
            <ThumbsUp className={cn("w-4 h-4 mr-2", report.viewer?.vote === 'ALIGN' ? "fill-current" : "")} />
            {report.stats?.aligns || 0}
          </button>
          <button
            onClick={() => handleVote('OPPOSE')}
            className={cn("flex-1 flex justify-center items-center py-2.5 rounded-xl font-bold transition-all",
              report.viewer?.vote === 'OPPOSE' 
                ? "bg-destructive text-white" 
                : "bg-muted/50 hover:bg-muted text-foreground"
            )}
          >
            <ThumbsDown className={cn("w-4 h-4 mr-2", report.viewer?.vote === 'OPPOSE' ? "fill-current" : "")} />
            {report.stats?.opposes || 0}
          </button>
        </div>

        {/* Mod Request */}
        {report.can_request_moderation && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4">
            {!showModConfirm ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center text-destructive text-sm font-medium">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Is this report inaccurate or abusive?
                </div>
                <button 
                  onClick={() => setShowModConfirm(true)}
                  className="px-4 py-1.5 bg-background border border-destructive/20 text-destructive text-xs font-bold rounded-full hover:bg-destructive hover:text-white transition-colors"
                >
                  Request Review
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-foreground font-medium">Request Admin Moderation</p>
                <input 
                  type="text" 
                  placeholder="Optional: Why does this need review?" 
                  value={modReason}
                  onChange={(e) => setModReason(e.target.value)}
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-destructive/50"
                />
                <div className="flex justify-end space-x-2">
                  <button onClick={() => setShowModConfirm(false)} className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted rounded-lg">Cancel</button>
                  <button 
                    onClick={handleModRequest} 
                    disabled={requestingMod}
                    className="px-3 py-1.5 bg-destructive text-white text-xs font-bold rounded-lg hover:bg-destructive/90 disabled:opacity-50"
                  >
                    {requestingMod ? 'Sending...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Comments */}
        <div className="pt-6 border-t border-border/50 space-y-6">
          <h3 className="font-bold flex items-center text-lg">
            <MessageSquare className="w-5 h-5 mr-2 opacity-70" />
            Comments <span className="ml-2 text-muted-foreground text-sm bg-muted px-2 py-0.5 rounded-full">{report.stats?.comments || 0}</span>
          </h3>

          <div className="flex space-x-3">
            <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0">
              {profile?.photo_url && <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 relative">
              <textarea 
                placeholder="Add your perspective..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                className="w-full bg-card border border-border/50 rounded-2xl p-3 pr-12 min-h-[80px] resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-sm"
              />
              <button 
                onClick={handlePostComment}
                disabled={!commentInput.trim() || submittingComment}
                className="absolute bottom-3 right-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground transition-colors"
              >
                <Send className="w-4 h-4 -ml-0.5" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {comments.map(c => (
              <div key={c.id} className="flex space-x-3">
                <img src={c.author.photo_url || `https://api.dicebear.com/9.x/initials/svg?seed=${c.author.username}`} alt="" className="w-8 h-8 rounded-full bg-card shrink-0" />
                <div className="flex-1 bg-card border border-border/50 rounded-2xl rounded-tl-none p-3 relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{c.author.display_name || c.author.username}</span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{c.body}</p>
                </div>
              </div>
            ))}
            
            {comments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No comments yet. Be the first to share your perspective.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
