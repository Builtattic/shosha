import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Edit2, MapPin, Briefcase, Calendar } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { D3ScoreGauge } from '@/components/viz/D3ScoreGauge';
import { FeedItem } from '@/components/feed/FeedItem';
import { toFeedItem } from '@/lib/feed';
import { listReports } from '@/api/reports';
import type { FeedReport } from '@/types/feed';
import { formatDate } from '@/lib/utils';

export default function Profile() {
  const navigate = useNavigate();
  const { profile, isLoading } = useAuth();
  
  const [reports, setReports] = useState<FeedReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    let mounted = true;
    
    const fetchReports = async () => {
      setReportsLoading(true);
      try {
        const res = await listReports({ reporter_user_id: profile.id });
        if (mounted && res.ok && res.data) {
          setReports(res.data.items);
        }
      } catch (err) {
        console.error('Failed to load user reports:', err);
      } finally {
        if (mounted) setReportsLoading(false);
      }
    };
    
    fetchReports();
    return () => { mounted = false; };
  }, [profile?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 animate-pulse">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex justify-between items-start">
            <div className="w-24 h-24 bg-muted rounded-full" />
            <div className="w-32 h-10 bg-muted rounded-full" />
          </div>
          <div className="space-y-4">
            <div className="w-48 h-8 bg-muted rounded" />
            <div className="w-32 h-4 bg-muted rounded" />
          </div>
          <div className="h-40 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="flex justify-between items-start">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-background bg-muted shadow-xl relative z-10">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt={profile.display_name || ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary uppercase">
                  {profile.display_name?.charAt(0) || profile.username?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <button 
              onClick={() => navigate('/profile/edit')}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-full text-sm font-medium flex items-center hover:bg-secondary/80 transition-colors"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {profile.display_name || profile.username || 'Anonymous User'}
              </h1>
              {profile.username && (
                <p className="text-muted-foreground font-medium">@{profile.username}</p>
              )}
            </div>

            {profile.bio && (
              <p className="text-foreground/90 max-w-md text-sm leading-relaxed pt-2">
                {profile.bio}
              </p>
            )}

            <div className="flex flex-wrap gap-4 pt-4 text-sm text-muted-foreground">
              {profile.city && (
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1.5 opacity-70" />
                  {profile.city}{profile.country ? `, ${profile.country}` : ''}
                </div>
              )}
              {profile.occupation_role && (
                <div className="flex items-center">
                  <Briefcase className="w-4 h-4 mr-1.5 opacity-70" />
                  {profile.occupation_role}
                </div>
              )}
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1.5 opacity-70" />
                Joined {formatDate(profile.created_at)}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Dashboard Score Area */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border/50 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between shadow-sm overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
          
          <div className="space-y-2 text-center md:text-left mb-6 md:mb-0 relative z-10">
            <h2 className="text-xl font-bold">Your Credibility</h2>
            <p className="text-muted-foreground text-sm max-w-[250px]">
              Your score represents your accuracy and trustworthiness when filing reports.
            </p>
          </div>
          
          <div className="relative z-10">
            <D3ScoreGauge score={1000} size={140} />
          </div>
        </motion.div>

        {/* My Reports */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6 pt-4"
        >
          <div className="border-b border-border/50 pb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold">My Reports</h2>
            <span className="bg-muted px-2 py-1 rounded text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {reports.length} Filed
            </span>
          </div>

          {reportsLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="h-40 bg-card rounded-2xl animate-pulse border border-border/50" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border/50 rounded-2xl border-dashed">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Edit2 className="w-6 h-6 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-lg font-medium mb-1">No reports filed yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                You haven't submitted any reports against accounts.
              </p>
              <button 
                onClick={() => navigate('/accounts/search')}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium"
              >
                Find an account to report
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
