'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  MessageSquare, 
  Share2, 
  Bookmark, 
  MapPin, 
  Globe, 
  CheckCircle2, 
  Plus, 
  Minus,
  PlayCircle,
  ImageIcon,
  Twitter,
  Instagram,
  Facebook,
  AtSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

export interface FeedItemProps {
  id: string;
  user: {
    name: string;
    handle: string;
    avatar: string;
    isVerified: boolean;
    platform?: string;
  };
  timestamp: string;
  type: 'positive' | 'negative';
  title: string;
  location?: string;
  media?: {
    type: 'image' | 'video';
    url: string;
    count?: number;
  };
  stats: {
    aligns: number;
    opposes: number;
    comments: number;
    shares: number;
  };
  delta: number;
  viewer?: {
    vote: 'align' | 'oppose' | null;
    bookmarked: boolean;
  };
}

export function FeedItem({
  id,
  user,
  timestamp,
  type,
  title,
  location,
  media,
  stats,
  viewer
}: FeedItemProps) {
  const router = useRouter();
  const toast = useToast();
  const isPositive = type === 'positive';
  const [localStats, setLocalStats] = useState(stats);
  const [viewerState, setViewerState] = useState(viewer ?? { vote: null, bookmarked: false });
  const [busy, setBusy] = useState<string | null>(null);

  async function interact(action: 'align' | 'oppose' | 'comment' | 'share' | 'bookmark') {
    let text = '';
    if (action === 'comment') {
      text = window.prompt('Add a short public comment')?.trim() ?? '';
      if (!text) return;
    }

    setBusy(action);
    try {
      const response = await fetch(`/api/reports/${id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'comment' ? { action, text } : { action })
      });
      const payload = await response.json();
      if (!payload.ok) {
        if (response.status === 401) {
          router.push('/sign-in');
          return;
        }
        throw new Error(payload.error?.message ?? 'Action failed.');
      }
      if (payload.data.stats) setLocalStats(payload.data.stats);
      if (payload.data.vote !== undefined) setViewerState((current) => ({ ...current, vote: payload.data.vote }));
      if (payload.data.bookmarked !== undefined) {
        setViewerState((current) => ({ ...current, bookmarked: payload.data.bookmarked }));
      }
      if (action === 'share') {
        await navigator.clipboard?.writeText(window.location.href);
        toast.push('Share counted and link copied.');
      }
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Action failed.');
    } finally {
      setBusy(null);
    }
  }

  function compact(value: number) {
    return value > 1000 ? `${(value / 1000).toFixed(1)}K` : value;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      className="mb-6 overflow-hidden rounded-[24px] border border-border bg-card shadow-sm transition-all hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-muted shadow-sm">
             {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
             ) : (
                <div className="flex h-full w-full items-center justify-center font-bold text-muted-foreground">
                  {user.name[0]}
                </div>
             )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-[16px] font-bold text-foreground leading-tight">{user.name}</span>
              {user.isVerified && <CheckCircle2 size={16} className="text-foreground fill-foreground/10" />}
            </div>
            <p className="text-[12px] text-muted-foreground">@{user.handle}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 mt-0.5">
              <span>{timestamp}</span>
              <span className="text-[8px]">●</span>
              {user.platform === 'twitter' ? <Twitter size={10} /> :
               user.platform === 'instagram' ? <Instagram size={10} /> :
               user.platform === 'facebook' ? <Facebook size={10} /> :
               user.platform === 'threads' ? <AtSign size={10} /> :
               <Globe size={10} />}
            </div>
          </div>
        </div>
        
        <div className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-all",
          isPositive ? "bg-primary/10 text-primary border border-primary/20" : "bg-destructive/10 text-destructive border border-destructive/20"
        )}>
          {isPositive ? <Plus size={12} strokeWidth={3} /> : <Minus size={12} strokeWidth={3} />}
          {type}
        </div>
      </div>

      {/* Media Content */}
      {media && (
        <div className="relative mx-5 mt-2 overflow-hidden rounded-[16px] bg-muted aspect-video shadow-sm group cursor-pointer">
          {media.type === 'video' ? (
            <video 
              src={media.url} 
              autoPlay 
              muted 
              loop 
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <img 
              src={media.url} 
              alt={title} 
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" 
              onError={(e) => {
                // Hide the media container if image fails to load
                (e.target as HTMLImageElement).parentElement?.classList.add('hidden');
              }}
            />
          )}
          
          {media.type === 'video' && (
            <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/10">
              <PlayCircle size={16} className="text-white" fill="white" />
            </div>
          )}
          
          {media.count && media.count > 1 && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-md shadow-sm border border-white/10">
              <ImageIcon size={12} />
              1/{media.count}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className="px-5 py-4">
        <h3 className="text-[18px] font-bold leading-snug text-foreground">{title}</h3>
        {location && (
          <div className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            <MapPin size={14} />
            {location}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 px-5 pb-5">
        <button
          type="button"
          disabled={busy === 'align'}
          onClick={() => interact('align')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-bold transition-all active:scale-[0.98] border disabled:opacity-60',
            viewerState.vote === 'align'
              ? 'bg-primary text-background border-primary'
              : 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20'
          )}
        >
          <Plus size={18} strokeWidth={3} />
          {compact(localStats.aligns)}
        </button>
        <button
          type="button"
          disabled={busy === 'oppose'}
          onClick={() => interact('oppose')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-bold transition-all active:scale-[0.98] border disabled:opacity-60',
            viewerState.vote === 'oppose'
              ? 'bg-destructive text-background border-destructive'
              : 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20'
          )}
        >
          <Minus size={18} strokeWidth={3} />
          {compact(localStats.opposes)}
        </button>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-5 py-3 text-muted-foreground">
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => interact('comment')}
            disabled={busy === 'comment'}
            className="flex items-center gap-2 transition-colors hover:text-foreground active:scale-95 disabled:opacity-60"
          >
            <MessageSquare size={18} />
            <span className="text-[13px] font-bold">{localStats.comments}</span>
          </button>
          <button
            type="button"
            onClick={() => interact('share')}
            disabled={busy === 'share'}
            className="flex items-center gap-2 transition-colors hover:text-foreground active:scale-95 disabled:opacity-60"
          >
            <Share2 size={18} />
            <span className="text-[13px] font-bold">{localStats.shares}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => interact('bookmark')}
          disabled={busy === 'bookmark'}
          className={cn('transition-colors hover:text-foreground active:scale-95 disabled:opacity-60', viewerState.bookmarked && 'text-foreground')}
        >
          <Bookmark size={18} fill={viewerState.bookmarked ? 'currentColor' : 'none'} />
        </button>
      </div>
    </motion.div>
  );
}
