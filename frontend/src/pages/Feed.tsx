import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Users, TrendingUp, Sparkles } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { FeedItem } from '@/components/feed/FeedItem';
import { PostDetailModal } from '@/components/feed/PostDetailModal';
import { getFeed } from '@/api/feed';
import { toFeedItem } from '@/lib/feed';
import type { FeedReport, FeedFilter } from '@/types/feed';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

const FILTERS: { id: FeedFilter; label: string; icon: any }[] = [
  { id: 'for_you', label: 'For You', icon: Sparkles },
  { id: 'following', label: 'Following', icon: Users },
  { id: 'top', label: 'Top', icon: TrendingUp },
  { id: 'near', label: 'Near You', icon: MapPin },
];

export default function Feed() {
  const navigate = useNavigate();
  const { profile: _profile } = useAuth();
  
  const [filter, setFilter] = useState<FeedFilter>('for_you');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const [reports, setReports] = useState<FeedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchFeed = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getFeed(filter);
        if (mounted) {
          if (res.ok && res.data) {
            setReports(res.data);
          } else {
            setError(res.error || 'Failed to load feed');
          }
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'An error occurred');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchFeed();
    return () => { mounted = false; };
  }, [filter]);

  const filteredReports = useMemo(() => {
    if (!debouncedSearch) return reports;
    const q = debouncedSearch.toLowerCase();
    return reports.filter(r => 
      r.description?.toLowerCase().includes(q) ||
      r.account?.displayName?.toLowerCase().includes(q) ||
      r.account?.username?.toLowerCase().includes(q)
    );
  }, [reports, debouncedSearch]);



  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header & Tabs */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 pt-2 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Search Bar */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Search reports, accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted/50 border-none rounded-full text-sm focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-1 overflow-x-auto no-scrollbar pb-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "flex items-center px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                  filter === f.id 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <f.icon className={cn("w-4 h-4 mr-2", filter === f.id ? "opacity-100" : "opacity-70")} />
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feed Content */}
      <div className="max-w-2xl mx-auto p-4">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-card rounded-2xl p-4 space-y-4 border border-border/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-muted rounded-full" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                  <div className="h-40 bg-muted rounded-xl w-full" />
                </div>
              ))}
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
                <span className="text-destructive font-bold">!</span>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Failed to load feed</h3>
              <p className="text-muted-foreground text-sm">{error}</p>
              <button 
                onClick={() => setFilter(filter)} 
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium"
              >
                Try Again
              </button>
            </motion.div>
          ) : filteredReports.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              {filter === 'following' ? (
                <>
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-medium text-foreground mb-2">No active following</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                    You aren't following anyone yet, or the people you follow haven't posted any reports.
                  </p>
                  <button 
                    onClick={() => navigate('/accounts/search')}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium"
                  >
                    Find accounts to follow
                  </button>
                </>
              ) : filter === 'near' ? (
                <>
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-medium text-foreground mb-2">Location features coming soon</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    We're working on bringing you hyper-local reports. Check back later!
                  </p>
                </>
              ) : (
                <>
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-medium text-foreground mb-2">No reports found</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    {searchQuery ? "We couldn't find anything matching your search." : "It's quiet in here. Why not be the first to report something?"}
                  </p>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {filteredReports.map((report) => (
                <div key={report._id} onClick={() => navigate(`/reports/${report._id}`)} className="cursor-pointer">
                  <FeedItem {...toFeedItem(report)} />
                </div>
              ))}
              
              {/* End of feed marker */}
              <div className="py-8 text-center text-muted-foreground text-sm flex items-center justify-center space-x-2">
                <Sparkles className="w-4 h-4 opacity-50" />
                <span>You're all caught up</span>
                <Sparkles className="w-4 h-4 opacity-50" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PostDetailModal 
        reportId={selectedReportId}
        open={!!selectedReportId}
        onClose={() => setSelectedReportId(null)}
      />
    </div>
  );
}
