'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  AtSign,
  Send,
  Loader2,
  X,
  Download,
  ShieldAlert,
  Link2
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { handleAvatarError, resolveAvatarUrl } from '@/lib/media';
import { useToast } from '@/components/ui/Toast';
import { FeedShareCard } from './FeedShareCard';

type CommentItem = {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; name: string; username: string; avatar: string };
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(1, Math.floor((now - then) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return formatDate(iso);
}

export interface FeedItemProps {
  id: string;
  user: {
    name: string;
    handle: string;
    avatar: string;
    isVerified: boolean;
    platform?: string;
    accountId?: string;
    followers?: string;
  };
  timestamp: string;
  type: 'positive' | 'negative';
  title: string;
  description?: string;
  reportScore?: number;
  evidenceSourceUrl?: string;
  links?: Array<{ url: string; title?: string }>;
  media?: {
    type: 'image' | 'video';
    url: string;
    thumbUrl?: string;
    count?: number;
  };
  category?: string;
  deed?: string;
  disputeStatus?: string;
  location?: string;
  stats: {
    aligns: number;
    opposes: number;
    comments: number;
    shares: number;
  };
  delta: number;
  credibility?: number;
  viewer?: {
    vote: 'align' | 'oppose' | null;
    bookmarked: boolean;
  };
  reporter?: {
    name: string;
    handle: string;
    avatar: string;
    isVerified: boolean;
  };
  canRequestModeration?: boolean;
}

export function FeedItem({
  id,
  user,
  timestamp,
  type,
  title,
  description,
  location,
  media,
  category,
  deed,
  disputeStatus,
  reportScore,
  evidenceSourceUrl,
  links,
  stats,
  delta,
  credibility,
  viewer,
  reporter,
  canRequestModeration
}: FeedItemProps) {
  const router = useRouter();
  const toast = useToast();
  const isPositive = type === 'positive';
  const [localStats, setLocalStats] = useState(stats);
  const [viewerState, setViewerState] = useState(viewer ?? { vote: null, bookmarked: false });
  const [busy, setBusy] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [moderationOpen, setModerationOpen] = useState(false);
  const [moderationReason, setModerationReason] = useState('');
  const [moderationEvidenceUrl, setModerationEvidenceUrl] = useState('');
  const [moderationSubmitting, setModerationSubmitting] = useState(false);

  // Share Card State
  const [generatingImage, setGeneratingImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  async function handleShareClick(e?: React.MouseEvent) {
    e?.stopPropagation();
    setGeneratingImage(true);
    try {
      // interact('share') just to bump the count and optionally log
      fetch(`/api/reports/${id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'share' })
      }).catch(console.error);

      // Wait a tick for portal to mount
      await new Promise(r => setTimeout(r, 200));

      const { default: html2canvas } = await import('html2canvas');
      if (!cardRef.current) throw new Error('Card element not found');

      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#f5f5f5',
        logging: false,
        width: 600,
      });

      setPreviewUrl(canvas.toDataURL('image/png'));
    } catch (error) {
      console.error('Failed to generate share image:', error);
      toast.push('Could not generate share image. Fallback to link copied.');
      await navigator.clipboard?.writeText(window.location.href);
    } finally {
      setGeneratingImage(false);
    }
  }

  async function handleDownload() {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.download = `shosha_report_${id}.png`;
    link.href = previewUrl;
    link.click();
    toast.push('Image downloaded!');
  }

  async function handleNativeShare() {
    if (!previewUrl) return;
    try {
      const blob = await (await fetch(previewUrl)).blob();
      const file = new File([blob], `shosha_${id}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title,
          text: `Check out this report on Shosha: ${title}`,
        });
        return;
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast.push('Image copied to clipboard!');
    } catch {
      toast.push('Share cancelled or not supported.');
    }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  async function loadComments() {
    setCommentsLoading(true);
    try {
      const response = await fetch(`/api/reports/${id}/comments`);
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Failed to load comments.');
      setComments(payload.data ?? []);
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Failed to load comments.');
    } finally {
      setCommentsLoading(false);
    }
  }

  async function toggleComments(e?: React.MouseEvent) {
    e?.stopPropagation();
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments === null) await loadComments();
  }

  async function submitComment() {
    const text = commentDraft.trim();
    if (!text) return;
    setBusy('comment');
    try {
      const response = await fetch(`/api/reports/${id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'comment', text })
      });
      const payload = await response.json();
      if (!payload.ok) {
        if (response.status === 401) {
          router.push('/sign-in');
          return;
        }
        throw new Error(payload.error?.message ?? 'Comment failed.');
      }
      if (payload.data.stats) setLocalStats(payload.data.stats);
      setCommentDraft('');
      // Refresh comment list so the new one appears.
      await loadComments();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Comment failed.');
    } finally {
      setBusy(null);
    }
  }

  async function interact(action: 'align' | 'oppose' | 'share' | 'bookmark', e?: React.MouseEvent) {
    e?.stopPropagation();
    setBusy(action);
    try {
      const response = await fetch(`/api/reports/${id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
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

  async function submitModerationRequest() {
    const reason = moderationReason.trim();
    if (reason.length < 10) {
      toast.push('Please add at least 10 characters explaining the request.');
      return;
    }
    setModerationSubmitting(true);
    try {
      const response = await fetch(`/api/reports/${id}/moderation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          evidenceUrl: moderationEvidenceUrl.trim() || undefined
        })
      });
      const payload = await response.json();
      if (!payload.ok) {
        if (response.status === 401) {
          router.push('/sign-in');
          return;
        }
        throw new Error(payload.error?.message ?? 'Could not submit moderation request.');
      }
      toast.push('Moderation request sent.');
      setModerationOpen(false);
      setModerationReason('');
      setModerationEvidenceUrl('');
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not submit moderation request.');
    } finally {
      setModerationSubmitting(false);
    }
  }

  function compact(value: number) {
    return value > 1000 ? `${(value / 1000).toFixed(1)}K` : value;
  }

  const isLiveNews = id.startsWith('twitter-') || id.startsWith('ig-') || id.startsWith('fb-') || id.startsWith('news-') || id.startsWith('reddit-');
  const displayAuthor = reporter || (isLiveNews ? user : { name: 'Anonymous', handle: 'anonymous', avatar: '', isVerified: false });
  const displaySubject = isLiveNews ? null : user;

  const authorLink = displayAuthor.handle === 'anonymous' ? '#' : `/account/website_${displayAuthor.handle.replace(/^@/, '')}`;
  const subjectLink = displaySubject ? `/account/${displaySubject.accountId || displaySubject.handle}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mb-6 overflow-hidden rounded-[24px] border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-foreground/10"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 p-5 pb-3">

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-muted shadow-sm flex items-center justify-center">
                  <img
                    src={resolveAvatarUrl(displayAuthor.avatar, displayAuthor.name)}
                    alt={displayAuthor.name}
                    className="h-full w-full object-cover"
                    onError={(e) => handleAvatarError(e, displayAuthor.name)}
                  />
               <div className={cn(
                 "avatar-fallback font-bold text-muted-foreground",
                 (displayAuthor.avatar && displayAuthor.avatar !== 'null' && displayAuthor.avatar !== 'undefined') && "hidden"
               )}>
                 {displayAuthor.name[0]}
               </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <Link href={authorLink} className="text-[16px] font-bold text-foreground leading-tight hover:underline transition-all">
                  {displayAuthor.name}
                </Link>
                {displayAuthor.isVerified && <CheckCircle2 size={16} className="text-foreground fill-foreground/10" />}
              </div>
              
              {displaySubject && (
                <p className="text-[12px] text-muted-foreground">
                  <span className="text-muted-foreground/70">reported</span>{' '}
                  <Link href={subjectLink || '#'} className="font-semibold text-foreground hover:underline">
                    {displaySubject.name}
                  </Link>
                </p>
              )}

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

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] transition-all",
              isPositive
                ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                : "bg-destructive/10 text-destructive ring-1 ring-destructive/20"
            )}
          >
            {isPositive ? <Plus size={12} strokeWidth={3.5} /> : <Minus size={12} strokeWidth={3.5} />}
            {type}
          </motion.div>
        </div>
      </div>

      {/* Media Content */}
      {media && (
        <div className={cn(
          "relative mx-5 mt-2 overflow-hidden rounded-[16px] bg-muted shadow-sm group cursor-pointer",
          media.type === 'video' && "aspect-video"
        )}>
          {media.type === 'video' ? (
            <video
              src={media.url}
              poster={media.thumbUrl || undefined}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={media.thumbUrl || media.url}
              alt={title}
              className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (media.thumbUrl && img.src !== media.url) {
                  img.src = media.url;
                } else {
                  img.parentElement?.classList.add('hidden');
                }
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
        {(category || deed || reportScore !== undefined || disputeStatus) && (
          <div className="mb-3 flex flex-wrap gap-2">
            {category && (
              <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {category}
              </span>
            )}
            {evidenceSourceUrl && (
              <a
                href={evidenceSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 transition-colors"
              >
                Source
              </a>
            )}
            {deed && (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                {deed}
              </span>
            )}
            {reportScore !== undefined && (
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
                Score {reportScore > 0 ? '+' : ''}{Math.round(reportScore)}
              </span>
            )}
            {disputeStatus && disputeStatus !== 'none' && (
              <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {disputeStatus}
              </span>
            )}
          </div>
        )}
        {Array.isArray(links) && links.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition-colors max-w-full truncate"
              >
                <Link2 size={12} className="shrink-0" />
                <span className="truncate">
                  {link.title || link.url}
                </span>
              </a>
            ))}
          </div>
        )}
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
        <motion.button
          type="button"
          disabled={busy === 'align'}
          onClick={() => interact('align')}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-black transition-colors duration-200 border disabled:opacity-60',
            viewerState.vote === 'align'
              ? 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
          )}
        >
          <Plus size={18} strokeWidth={3.2} />
          <span>Align</span>
          <span className="tabular-nums">{compact(localStats.aligns)}</span>
        </motion.button>
        <motion.button
          type="button"
          disabled={busy === 'oppose'}
          onClick={() => interact('oppose')}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-black transition-colors duration-200 border disabled:opacity-60',
            viewerState.vote === 'oppose'
              ? 'bg-rose-100 text-rose-600 border-rose-200 shadow-sm'
              : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200'
          )}
        >
          <Minus size={18} strokeWidth={3.2} />
          <span>Oppose</span>
          <span className="tabular-nums">{compact(localStats.opposes)}</span>
        </motion.button>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-5 py-3 text-muted-foreground">
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={toggleComments}
            className={cn(
              'flex items-center gap-2 transition-colors hover:text-foreground active:scale-95',
              commentsOpen && 'text-foreground'
            )}
            aria-expanded={commentsOpen}
          >
            <MessageSquare size={18} />
            <span className="text-[13px] font-bold">{localStats.comments}</span>
          </button>
          <button
            type="button"
            onClick={handleShareClick}
            disabled={busy === 'share' || generatingImage}
            className="flex items-center gap-2 transition-colors hover:text-foreground active:scale-95 disabled:opacity-60"
          >
            {generatingImage ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
          </button>
          {canRequestModeration && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setModerationOpen(true);
              }}
              className="flex items-center gap-2 transition-colors hover:text-foreground active:scale-95"
              aria-label="Request moderation"
            >
              <ShieldAlert size={18} />
            </button>
          )}
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

      <AnimatePresence initial={false}>
        {commentsOpen && (
          <motion.div
            key="comments"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/60 bg-background"
          >
            <div className="px-5 py-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitComment();
                }}
                className="flex items-center gap-2 mb-4"
              >
                <input
                  type="text"
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Add a public comment..."
                  maxLength={280}
                  className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="submit"
                  disabled={busy === 'comment' || !commentDraft.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background disabled:opacity-40"
                  aria-label="Post comment"
                >
                  <Send size={16} />
                </button>
              </form>

              {commentsLoading && (
                <p className="text-[12px] text-muted-foreground">Loading comments…</p>
              )}

              {!commentsLoading && comments && comments.length === 0 && (
                <p className="text-[12px] text-muted-foreground">No comments yet — be the first.</p>
              )}

              {!commentsLoading && comments && comments.length > 0 && (
                <ul className="space-y-3">
                  {comments.map((c) => (
                    <li key={c.id} className="flex items-start gap-3">
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                        {c.author.avatar ? (
                          <img src={c.author.avatar} alt={c.author.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[12px] font-bold text-muted-foreground">
                            {c.author.name[0]?.toUpperCase() ?? '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <Link 
                            href={c.author.username === 'anonymous' ? '#' : `/account/website_${c.author.username.replace(/^@/, '')}`} 
                            className={cn(
                              "text-[13px] font-bold text-foreground truncate hover:underline",
                              c.author.username === 'anonymous' && "pointer-events-none opacity-70"
                            )}
                          >
                            {c.author.name}
                          </Link>
                          <span className="text-[11px] text-muted-foreground/70">{relativeTime(c.createdAt)}</span>
                        </div>
                        <p className="text-[13px] text-foreground/90 break-words">{c.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden offscreen card for html2canvas capture */}
      {generatingImage && typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: '-9999px',
              top: 0,
              zIndex: -1,
              pointerEvents: 'none',
              opacity: 0,
            }}
            aria-hidden
          >
            <FeedShareCard
              ref={cardRef}
              id={id}
              user={user}
              timestamp={timestamp}
              type={type}
              title={title}
              description={description}
              location={location}
              media={media}
              links={links}
              category={category}
              deed={deed}
              disputeStatus={disputeStatus}
              reportScore={reportScore}
              evidenceSourceUrl={evidenceSourceUrl}
              stats={localStats}
              viewer={viewerState}
              reporter={reporter}
              delta={delta}
              credibility={credibility}
            />
          </div>,
          document.body
        )
      }

      {/* Preview Modal */}
      {previewUrl && typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative flex max-h-full max-w-2xl flex-col items-center gap-6">
              <button
                type="button"
                onClick={closePreview}
                className="absolute -right-4 -top-12 rounded-full bg-muted/50 p-2 text-foreground transition-colors hover:bg-muted"
                aria-label="Close preview"
              >
                <X size={24} />
              </button>

              <div className="relative overflow-hidden rounded-xl border border-border/50 shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Share Preview" className="max-h-[70vh] w-auto object-contain" />
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-muted px-6 py-3 font-semibold text-foreground transition-all hover:bg-muted/80 active:scale-95 sm:flex-none"
                >
                  <Download size={20} />
                  Save Image
                </button>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 font-semibold text-background transition-all hover:opacity-90 active:scale-95 sm:flex-none shadow-lg"
                >
                  <Share2 size={20} />
                  Share to Socials
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {moderationOpen && typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[110] flex items-end justify-center bg-background/90 p-4 backdrop-blur-sm sm:items-center">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[16px] font-black text-foreground">Request Moderation</h3>
                  <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                    Ask moderators to review or hide your filing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModerationOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
                  aria-label="Close moderation request"
                >
                  <X size={18} />
                </button>
              </div>
              <textarea
                value={moderationReason}
                onChange={(event) => setModerationReason(event.target.value.slice(0, 1000))}
                placeholder="Explain why this filing should be reviewed or hidden..."
                className="min-h-32 w-full resize-none rounded-2xl border border-border bg-background p-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                value={moderationEvidenceUrl}
                onChange={(event) => setModerationEvidenceUrl(event.target.value)}
                placeholder="Optional evidence or citation URL"
                className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={submitModerationRequest}
                disabled={moderationSubmitting || moderationReason.trim().length < 10}
                className="mt-4 flex w-full items-center justify-center rounded-full bg-foreground px-5 py-3 text-[13px] font-black text-background transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {moderationSubmitting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>,
          document.body
        )}
    </motion.div>
  );
}
