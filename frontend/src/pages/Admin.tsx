import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, CheckCircle2, XCircle, Trash2, ChevronDown, ExternalLink, Filter } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { isAdminRole } from '@/lib/roles';
import { getModerationQueue, moderateReport, type ModerationQueueItem } from '@/api/reports';
import { cn, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

export default function Admin() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [queue, setQueue] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modNote, setModNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Check auth
  const isMod = isAdminRole(profile?.role);

  useEffect(() => {
    if (!isMod) return;
    
    let mounted = true;
    const fetchQueue = async () => {
      setLoading(true);
      try {
        const res = await getModerationQueue({ status: statusFilter });
        if (mounted && res.ok && res.data) {
          setQueue(res.data.items);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load queue');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    fetchQueue();
    return () => { mounted = false; };
  }, [isMod, statusFilter]);

  if (!isMod) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ShieldCheck className="w-16 h-16 text-destructive mb-4 opacity-20" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground text-center max-w-md">
          You do not have the required permissions to view the moderation queue.
        </p>
      </div>
    );
  }

  const handleModerate = async (id: string, decision: 'APPROVED' | 'REJECTED' | 'REMOVED') => {
    setProcessingId(id);
    try {
      const res = await moderateReport(id, decision, modNote);
      if (res.ok) {
        toast.push(`Report ${decision.toLowerCase()}`);
        // Optimistically remove from queue
        setQueue(q => q.filter(item => item.id !== id));
        setExpandedId(null);
        setModNote('');
      } else {
        throw new Error('Action failed');
      }
    } catch {
      toast.push('Failed to apply moderation');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Admin Header */}
      <div className="bg-card border-b border-border/50 px-4 py-6 md:px-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Moderation Queue</h1>
              <p className="text-muted-foreground text-sm">Review incoming reports and appeals</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg">
            {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                  statusFilter === s 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-card animate-pulse rounded-xl border border-border/50" />)}
          </div>
        ) : error ? (
          <div className="p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 text-sm">
            {error}
          </div>
        ) : queue.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-50" />
            </div>
            <h3 className="text-xl font-bold mb-2">Queue is clear</h3>
            <p className="text-muted-foreground">There are no {statusFilter.toLowerCase()} reports at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
              <span>{queue.length} items to review</span>
              <button className="flex items-center hover:text-foreground">
                <Filter className="w-4 h-4 mr-1" /> Sort: Newest
              </button>
            </div>
            
            {queue.map(item => {
              const isExpanded = expandedId === item.id;
              
              return (
                <div key={item.id} className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm hover:border-primary/50 transition-colors">
                  {/* Row Summary */}
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="p-4 flex flex-col md:flex-row gap-4 cursor-pointer"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-muted rounded">
                          {item.account.platform}
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {item.account.display_name || item.account.handle}
                        </span>
                        <span className="text-sm text-muted-foreground">@{item.account.handle}</span>
                      </div>
                      <h4 className="font-medium text-foreground line-clamp-1">{item.title}</h4>
                      <div className="flex items-center text-xs text-muted-foreground gap-3 pt-1">
                        <span>Reported by: {item.reporter?.username || 'Anonymous'}</span>
                        <span>•</span>
                        <span>{formatDate(item.created_at)}</span>
                        {item.media && (
                          <>
                            <span>•</span>
                            <span className="text-primary font-medium">Has Media</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end md:w-32">
                      <span className={cn("px-2.5 py-1 text-xs font-bold rounded-md", 
                        item.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500' :
                        item.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                        'bg-destructive/10 text-destructive'
                      )}>
                        {item.status}
                      </span>
                      <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform md:hidden", isExpanded && "rotate-180")} />
                    </div>
                  </div>

                  {/* Expanded Detail View */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border/50 bg-muted/20"
                      >
                        <div className="p-4 space-y-6">
                          <div className="flex gap-4">
                            <div className="flex-1 space-y-4">
                              <div>
                                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Full Description</h5>
                                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{item.description}</p>
                              </div>
                              
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => navigate(`/accounts/${item.account.id}`)}
                                  className="text-xs flex items-center px-3 py-1.5 bg-background border border-border/50 rounded-lg hover:bg-muted"
                                >
                                  View Account Dossier <ExternalLink className="w-3 h-3 ml-1.5" />
                                </button>
                                <button 
                                  onClick={() => navigate(`/reports/${item.id}`)}
                                  className="text-xs flex items-center px-3 py-1.5 bg-background border border-border/50 rounded-lg hover:bg-muted"
                                >
                                  View Public Thread <ExternalLink className="w-3 h-3 ml-1.5" />
                                </button>
                              </div>
                            </div>

                            {item.media && (
                              <div className="w-48 shrink-0">
                                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Evidence</h5>
                                <div className="bg-black/10 rounded-lg overflow-hidden border border-border/50">
                                  <img src={item.media.thumbnail_url || item.media.url} alt="Evidence" className="w-full h-auto object-cover" />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Area */}
                          <div className="bg-background border border-border/50 rounded-xl p-4">
                            <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Moderation Decision</h5>
                            <textarea
                              placeholder="Optional internal note..."
                              value={modNote}
                              onChange={(e) => setModNote(e.target.value)}
                              className="w-full bg-muted/50 border border-border/50 rounded-lg p-2 text-sm mb-3 resize-none focus:outline-none focus:border-primary"
                              rows={2}
                            />
                            <div className="flex flex-wrap gap-2">
                              <button 
                                onClick={() => handleModerate(item.id, 'APPROVED')}
                                disabled={processingId === item.id}
                                className="flex-1 flex items-center justify-center px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg text-sm font-bold transition-colors"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve
                              </button>
                              <button 
                                onClick={() => handleModerate(item.id, 'REJECTED')}
                                disabled={processingId === item.id}
                                className="flex-1 flex items-center justify-center px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-lg text-sm font-bold transition-colors"
                              >
                                <XCircle className="w-4 h-4 mr-1.5" /> Reject
                              </button>
                              <button 
                                onClick={() => handleModerate(item.id, 'REMOVED')}
                                disabled={processingId === item.id}
                                className="flex-none flex items-center justify-center px-4 py-2 border border-destructive/20 text-destructive hover:bg-destructive hover:text-white rounded-lg text-sm font-bold transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
