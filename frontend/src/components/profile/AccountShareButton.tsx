import { useCallback, useRef, useState } from 'react';
import { Loader2, Share2 } from 'lucide-react';
import ProfileShareCard from '@/components/profile/ProfileShareCard';
import { useToast } from '@/components/ui/Toast';

interface AccountShareButtonProps {
  displayName: string | null;
  username: string;
  score: number;
  platform?: string;
  bio?: string | null;
}

export default function AccountShareButton({
  displayName,
  username,
  score,
  platform,
  bio,
}: AccountShareButtonProps) {
  const toast = useToast();
  const [generating, setGenerating] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const downloadPng = useCallback(async () => {
    setGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 100));
      const { default: html2canvas } = await import('html2canvas');
      const node = captureRef.current;
      if (!node) throw new Error('Card element not found');

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#18181b',
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${(displayName ?? username).replace(/[^a-zA-Z0-9]/g, '_')}_shosha.png`;
      link.href = dataUrl;
      link.click();
      toast.push('Image downloaded');
    } catch {
      toast.push('Could not generate share image');
    } finally {
      setGenerating(false);
    }
    // TODO: add PDF export when jspdf is installed
  }, [displayName, username, toast]);

  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = `${displayName ?? username} on Shosha`;

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch {
      // cancelled or unsupported — fall through to PNG
    }

    await downloadPng();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        disabled={generating}
        aria-label="Share profile"
        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95 disabled:opacity-50"
      >
        {generating ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Share2 size={18} />
        )}
      </button>

      <div
        ref={captureRef}
        style={{
          position: 'fixed',
          left: -9999,
          top: 0,
          zIndex: -1,
          pointerEvents: 'none',
        }}
        aria-hidden
      >
        <ProfileShareCard
          displayName={displayName}
          username={username}
          score={score}
          platform={platform}
          bio={bio}
        />
      </div>
    </>
  );
}
