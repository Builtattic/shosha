import { useEffect, useRef, useState } from 'react';
import { Copy, Download, Loader2, X } from 'lucide-react';
import ProfileShareCard from '@/components/profile/ProfileShareCard';
import { useToast } from '@/components/ui/Toast';

interface ShareCardModalProps {
  open: boolean;
  onClose: () => void;
  displayName: string | null;
  username: string;
  score: number;
  platform?: string;
  bio?: string | null;
  totalFilings?: number;
}

export default function ShareCardModal({
  open,
  onClose,
  displayName,
  username,
  score,
  platform,
  bio,
  totalFilings,
}: ShareCardModalProps) {
  const toast = useToast();
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<'png' | 'pdf' | null>(null);

  const CARD_SIZE = 600;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function getCanvas() {
    const { default: html2canvas } = await import('html2canvas');
    const node = exportRef.current;
    if (!node) throw new Error('Card element not found');
    return html2canvas(node, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#18181b',
      logging: false,
      width: CARD_SIZE,
      height: CARD_SIZE,
    });
  }

  async function handlePng() {
    setExporting('png');
    try {
      const canvas = await getCanvas();
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shosha_${username.replace(/^@/, '')}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.push('PNG saved');
      }, 'image/png');
    } catch {
      toast.push('PNG export failed');
    } finally {
      setExporting(null);
    }
  }

  async function handlePdf() {
    setExporting('pdf');
    try {
      const [canvas, { jsPDF }] = await Promise.all([
        getCanvas(),
        import('jspdf'),
      ]);
      const imgData = canvas.toDataURL('image/png');
      const w = CARD_SIZE * 0.2646;
      const h = CARD_SIZE * 0.2646;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [w, h] });
      pdf.addImage(imgData, 'PNG', 0, 0, w, h);
      pdf.save(`shosha_${username.replace(/^@/, '')}.pdf`);
      toast.push('PDF saved');
    } catch {
      toast.push('PDF export failed');
    } finally {
      setExporting(null);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.push('Link copied');
    } catch {
      toast.push('Could not copy link');
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <div className="flex w-full items-center justify-between">
          <p className="text-[12px] font-bold uppercase tracking-widest text-white/60">
            Profile Card
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePng}
              disabled={exporting !== null}
              className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50"
            >
              {exporting === 'png' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              PNG
            </button>
            <button
              type="button"
              onClick={handlePdf}
              disabled={exporting !== null}
              className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50"
            >
              {exporting === 'pdf' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              PDF
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[12px] font-bold text-white"
            >
              <Copy size={13} />
              Copy Link
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl shadow-2xl">
          <ProfileShareCard
            displayName={displayName}
            username={username}
            score={score}
            platform={platform}
            bio={bio}
            totalFilings={totalFilings}
          />
        </div>

        <div
          ref={exportRef}
          style={{
            position: 'fixed',
            left: -9999,
            top: 0,
            zIndex: -1,
            pointerEvents: 'none',
            width: CARD_SIZE,
            height: CARD_SIZE,
          }}
          aria-hidden
        >
          <ProfileShareCard
            displayName={displayName}
            username={username}
            score={score}
            platform={platform}
            bio={bio}
            totalFilings={totalFilings}
          />
        </div>
      </div>
    </div>
  );
}
