import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Flag, ExternalLink, Activity, Target, Shield, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getAccount, getAccountSocialLinks, listAccountReports, type AccountDetail, type SocialLink } from '@/api/accounts';
import { FeedItem } from '@/components/feed/FeedItem';
import { toFeedItem } from '@/lib/feed';
import type { FeedReport } from '@/types/feed';
import { cn } from '@/lib/utils';
import { FollowButton } from '@/components/profile/FollowButton';

export default function AccountDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [reports, setReports] = useState<FeedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    let mounted = true;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [accRes, linksRes, repRes] = await Promise.all([
          getAccount(id),
          getAccountSocialLinks(id),
          listAccountReports(id)
        ]);
        
        if (!mounted) return;

        if (accRes.ok && accRes.data) {
          setAccount(accRes.data.account);
        } else {
          throw new Error(accRes.error || 'Account not found');
        }
        
        if (linksRes.ok && linksRes.data) {
          setLinks(linksRes.data.links);
        }
        
        if (repRes.ok && repRes.data) {
          setReports(repRes.data.items);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load account details');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    fetchData();
    return () => { mounted = false; };
  }, [id]);

  const platformColor = (platform: string) => {
    const p = platform.toLowerCase();
    if (p === 'x' || p === 'twitter') return 'bg-neutral-800 text-white';
    if (p === 'linkedin') return 'bg-blue-600 text-white';
    if (p === 'instagram') return 'bg-pink-600 text-white';
    if (p === 'youtube') return 'bg-red-600 text-white';
    return 'bg-muted text-foreground';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 max-w-3xl mx-auto space-y-8 animate-pulse">
        <div className="w-8 h-8 bg-muted rounded-full" />
        <div className="flex flex-col items-center space-y-4">
          <div className="w-24 h-24 bg-muted rounded-full" />
          <div className="w-48 h-6 bg-muted rounded" />
          <div className="w-32 h-4 bg-muted rounded" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}
        </div>
        <div className="space-y-4">
          {[1,2].map(i => <div key={i} className="h-40 bg-muted rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">Account Not Found</h2>
          <p className="text-muted-foreground">{error || "This account may have been removed."}</p>
          <button onClick={() => navigate(-1)} className="px-6 py-2 bg-secondary rounded-full font-medium">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const scoreColor = (score = 1000) => {
    if (score >= 1500) return 'text-emerald-500';
    if (score >= 1000) return 'text-primary';
    if (score >= 500) return 'text-yellow-500';
    return 'text-destructive';
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Top Navigation */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="font-medium text-sm text-muted-foreground">Account Dossier</span>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
        {/* Header Profile Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center space-y-4"
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-4 border-background shadow-lg text-3xl font-bold text-primary uppercase">
              {account.display_name?.charAt(0) || account.handle?.charAt(0) || '?'}
            </div>
            <div className={cn("absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-bold border-2 border-background", platformColor(account.platform))}>
              {account.platform}
            </div>
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {account.display_name || account.handle}
            </h1>
            <p className="text-muted-foreground">@{account.handle}</p>
          </div>

          {account.bio && (
            <p className="max-w-md mx-auto text-sm text-foreground/80 leading-relaxed">
              {account.bio}
            </p>
          )}

          <div className="flex items-center space-x-3 pt-2">
            <div className="w-32">
              <FollowButton targetUserId={account.id} />
            </div>
            <button 
              onClick={() => navigate(`/reports/new?account_id=${account.id}`)}
              className="flex items-center justify-center px-4 py-1.5 rounded-full bg-destructive/10 text-destructive text-[11px] font-bold hover:bg-destructive/20 transition-colors"
            >
              <Flag className="w-3 h-3 mr-1.5" />
              File Report
            </button>
          </div>
        </motion.div>

        {/* 4-Stat Row */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <div className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Activity className="w-4 h-4 text-muted-foreground mb-2" />
            <span className={cn("text-2xl font-black tracking-tight", scoreColor(account.shosha_score))}>
              {account.shosha_score?.toLocaleString() || '1,000'}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1">Shosha Score</span>
          </div>
          
          <div className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <Target className="w-4 h-4 text-muted-foreground mb-2" />
            <span className="text-2xl font-black text-foreground">{account.report_count || 0}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1">Reports</span>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <ArrowUpRight className="w-4 h-4 text-emerald-500 mb-2" />
            <span className="text-2xl font-black text-foreground">{account.align_count || 0}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1">Aligns</span>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <ArrowDownRight className="w-4 h-4 text-destructive mb-2" />
            <span className="text-2xl font-black text-foreground">{account.oppose_count || 0}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1">Opposes</span>
          </div>
        </motion.div>

        {/* Social Links */}
        {links.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border/50 rounded-2xl p-4"
          >
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Social Proof</h3>
            <div className="flex flex-wrap gap-2">
              {links.map((link, idx) => (
                <a 
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:opacity-90",
                    platformColor(link.platform)
                  )}
                >
                  <span className="mr-2">{link.platform}</span>
                  {link.is_verified && <Shield className="w-3 h-3 text-white/80" />}
                  <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
                </a>
              ))}
            </div>
          </motion.div>
        )}

        {/* Reports Tab */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6 pt-4"
        >
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <h2 className="text-lg font-bold">Reports</h2>
            <div className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">Approved only</div>
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border/50 border-dashed">
              <Shield className="w-12 h-12 text-muted-foreground opacity-20 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No verified reports yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                This account doesn't have any approved reports on record.
              </p>
              <button 
                onClick={() => navigate(`/reports/new?account_id=${account.id}`)}
                className="px-6 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-full text-sm font-bold transition-colors"
              >
                Be the first to report
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {reports.map((report) => (
                <div key={report._id} onClick={() => navigate(`/reports/${report._id}`)} className="cursor-pointer">
                  <FeedItem {...toFeedItem(report)} />
                </div>
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
