'use client';

import { useCallback, useEffect, useState } from 'react';
import { 
  Bell, 
  Globe, 
  SlidersHorizontal, 
  Loader2, 
  ShieldCheck, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  Search,
  Menu,
  Plus,
  ArrowLeft
} from 'lucide-react';
import { cn, formatPlatform } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export type PeopleDeckItem = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  platform: string;
  role: string;
  region: string;
  score: number;
  followers: string;
  verified: boolean;
  profileKind?: string;
  bio?: string;
  categories?: string[];
  topReports: Array<{ title: string; delta: number; type: 'positive' | 'negative' | string }>;
};

function compact(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function compactFollowers(raw: string | number | undefined): string {
  if (!raw) return '—';
  const n = typeof raw === 'string' ? parseFloat(raw.replace(/[^0-9.]/g, '')) : raw;
  if (isNaN(n)) return String(raw);
  return compact(n);
}

const FILTER_OPTIONS = ['Global', 'Trending', 'Newest', 'Followed'];

export function PeoplePanel({ initialItems }: { initialItems: PeopleDeckItem[] }) {
  const router = useRouter();
  const toast = useToast();
  
  const [items, setItems] = useState(initialItems);
  const [activeFilter, setActiveFilter] = useState('Global');
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(initialItems.length);
  const [hasMore, setHasMore] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);

  const fetchMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/people/deck?cursor=${cursor}`);
      const data = await res.json();
      const payload = data.ok ? data.data : undefined;
      if (payload?.items?.length) {
        setItems((prev) => [...prev, ...payload.items]);
        setCursor(payload.nextCursor);
        setHasMore(payload.hasMore);
      } else {
        setHasMore(false);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading]);

  const handleVote = async (personId: string, direction: 'align' | 'oppose') => {
    if (voting) return;
    setVoting(`${personId}-${direction}`);
    
    try {
      const res = await fetch(`/api/accounts/${personId}/swipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? 'Action failed');

      toast.push(
        direction === 'align'
          ? '✓ Aligned! Impact score increased.'
          : '✗ Opposed. Impact score decreased.'
      );
      
      // Update local score for visual feedback
      setItems(prev => prev.map(item => 
        item.id === personId 
          ? { ...item, score: direction === 'align' ? item.score + 5 : item.score - 5 } 
          : item
      ));
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setVoting(null);
    }
  };

  return (
    <main className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 lg:px-12">
        
        {/* Header Section */}
        <header className="mb-10 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-[32px] md:text-[40px] font-black leading-tight tracking-tight text-foreground uppercase">SHOSHA</h1>
              <p className="text-[14px] md:text-[16px] font-bold text-muted-foreground uppercase tracking-widest">Public Impact Discovery</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-foreground transition-all hover:bg-muted active:scale-90">
                <Bell size={22} />
                <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white ring-2 ring-background">3</span>
              </button>
              <button className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-foreground transition-all hover:bg-muted active:scale-90">
                <Menu size={22} />
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input 
                placeholder="Search profiles, roles, or regions..." 
                className="h-14 w-full rounded-[24px] border border-border bg-card/50 pl-12 pr-4 text-sm md:text-base outline-none transition-all focus:bg-card focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {FILTER_OPTIONS.map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={cn(
                      "shrink-0 rounded-full border px-5 py-2 text-[13px] md:text-[14px] font-bold transition-all",
                      activeFilter === f 
                        ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/10" 
                        : "border-border bg-card text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[24px] border border-border bg-card text-foreground transition-all hover:border-primary/50">
                <SlidersHorizontal size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* People Grid */}
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {items.map((person) => (
              <motion.article
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={person.id}
                className="group relative overflow-hidden rounded-[32px] border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl active:scale-[0.99]"
              >
                {/* Card Header (Avatar + Basic Info) */}
                <div className="relative h-44 w-full overflow-hidden">
                  <img 
                    src={person.avatar} 
                    alt={person.name} 
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="truncate text-[20px] font-black text-white drop-shadow-md">{person.name}</h2>
                        {person.verified && <ShieldCheck size={16} className="shrink-0 text-blue-400" />}
                      </div>
                      <p className="text-[12px] font-medium text-white/70">@{person.handle}</p>
                    </div>
                  </div>
                  
                  <div className="absolute left-4 top-4 flex gap-1.5">
                    <span className="rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md border border-white/10">
                      {person.role || 'Public Figure'}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="flex flex-col p-5 space-y-4">
                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-muted/50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Impact Score</p>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-emerald-500" />
                        <span className="text-[15px] font-black tabular-nums">{compact(person.score)}</span>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-muted/50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Followers</p>
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-muted-foreground" />
                        <span className="text-[15px] font-black tabular-nums">{compactFollowers(person.followers)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bio or Top Reports */}
                  <div className="h-[60px]">
                    {person.bio ? (
                      <p className="line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
                        {person.bio}
                      </p>
                    ) : person.topReports.length > 0 ? (
                      <div className="space-y-1.5">
                        {person.topReports.slice(0, 2).map((r, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 text-[12px]">
                            <span className="truncate text-muted-foreground font-medium">{r.title}</span>
                            <span className={cn(
                              "shrink-0 font-black",
                              r.delta >= 0 ? "text-emerald-500" : "text-red-500"
                            )}>
                              {r.delta > 0 ? '+' : ''}{Math.round(r.delta)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px] italic text-muted-foreground/50">No recent activity recorded.</p>
                    )}
                  </div>

                  {/* Action Row */}
                  <div className="flex items-center gap-2 pt-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(person.id, 'oppose');
                      }}
                      disabled={!!voting}
                      className="flex-1 flex h-11 items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50/50 text-red-600 transition-all hover:bg-red-50 active:scale-95 disabled:opacity-50"
                    >
                      <ArrowLeft size={16} strokeWidth={2.5} />
                      <span className="text-[12px] font-black uppercase">Oppose</span>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(person.id, 'align');
                      }}
                      disabled={!!voting}
                      className="flex-1 flex h-11 items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/50 text-emerald-600 transition-all hover:bg-emerald-50 active:scale-95 disabled:opacity-50"
                    >
                      <span className="text-[12px] font-black uppercase">Align</span>
                      <ArrowRight size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => router.push(`/account/${person.id}`)}
                    className="w-full h-10 rounded-xl text-[12px] font-bold text-muted-foreground hover:text-primary transition-colors"
                  >
                    View Full Dossier
                  </button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </section>

        {/* Load More Trigger */}
        {hasMore && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={fetchMore}
              disabled={loading}
              className="flex h-14 items-center justify-center gap-3 rounded-full border-2 border-border px-10 text-[15px] font-black transition-all hover:bg-muted active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Load More Profiles'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
