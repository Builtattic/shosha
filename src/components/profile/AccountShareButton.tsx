'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, Check, Download, X, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/ui/Toast';
import { ProfileShareCard, type ProfileShareCardProps } from './ProfileShareCard';

interface AccountShareButtonProps {
  displayName: string;
  username: string;
  /** Full card data for image generation */
  cardData?: ProfileShareCardProps;
}

export function AccountShareButton({ displayName, username, cardData }: AccountShareButtonProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const generateImage = useCallback(async () => {
    if (!cardData) {
      // Fallback: just share the URL
      await handleLinkShare();
      return;
    }

    setGenerating(true);
    try {
      // Wait a tick for the portal to mount
      await new Promise((r) => setTimeout(r, 200));

      const { default: html2canvas } = await import('html2canvas');
      const node = cardRef.current;
      if (!node) throw new Error('Card element not found');

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: 640,
        height: 900,
      });

      const dataUrl = canvas.toDataURL('image/png');
      setPreviewUrl(dataUrl);
    } catch (error) {
      console.error('[share-card] Generation failed:', error);
      toast.push('Could not generate share image. Try again.');
    } finally {
      setGenerating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardData, toast]);

  async function handleLinkShare() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareData: ShareData = {
      title: `${displayName} on Shosha`,
      text: `See ${displayName} (${username}) on the Shosha public ledger.`,
      url,
    };
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled — fall through to clipboard
    }
    try {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      toast.push('Profile link copied');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.push('Could not copy link');
    }
  }

  async function handleDownload() {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.download = `${displayName.replace(/[^a-zA-Z0-9]/g, '_')}_shosha_card.png`;
    link.href = previewUrl;
    link.click();
    toast.push('Image downloaded!');
  }

  async function handleNativeShare() {
    if (!previewUrl) return;
    try {
      const blob = await (await fetch(previewUrl)).blob();
      const file = new File([blob], `${displayName.replace(/[^a-zA-Z0-9]/g, '_')}_shosha.png`, {
        type: 'image/png',
      });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${displayName} on Shosha`,
          text: `Check out ${displayName}'s Shosha Score!`,
        });
        return;
      }
      // Fallback: copy image to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      toast.push('Image copied to clipboard!');
    } catch {
      toast.push('Share cancelled or not supported. Download the image instead.');
    }
  }

  function closePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={cardData ? generateImage : handleLinkShare}
        disabled={generating}
        aria-label="Share profile"
        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95 disabled:opacity-50"
      >
        {generating ? (
          <Loader2 size={18} className="animate-spin" />
        ) : copied ? (
          <Check size={18} strokeWidth={2.5} />
        ) : (
          <Upload size={20} strokeWidth={2.5} />
        )}
      </button>

      {/* Hidden offscreen card for html2canvas capture */}
      {cardData && generating && typeof document !== 'undefined' &&
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
            <ProfileShareCard ref={cardRef} {...cardData} />
          </div>,
          document.body
        )
      }

      {/* Preview Modal */}
      {previewUrl && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) closePreview();
            }}
          >
            <div className="relative w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-300">
              {/* Close button */}
              <button
                type="button"
                onClick={closePreview}
                className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:bg-foreground/80 transition-colors"
              >
                <X size={16} strokeWidth={3} />
              </button>

              {/* Card Image Preview */}
              <div className="overflow-hidden rounded-[20px] shadow-2xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={`${displayName}'s Shosha Card`}
                  className="w-full h-auto"
                />
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-[14px] font-bold text-background transition-all hover:bg-foreground/90 active:scale-[0.97]"
                >
                  <Download size={18} />
                  Download
                </button>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 py-3.5 text-[14px] font-bold text-white transition-all hover:bg-white/20 active:scale-[0.97]"
                >
                  <Upload size={18} />
                  Share
                </button>
              </div>

              <p className="mt-3 text-center text-[12px] text-white/50">
                Post this card on Instagram, X, Facebook, or any social platform
              </p>
            </div>
          </div>,
          document.body
        )
      }
    </>
  );
}
