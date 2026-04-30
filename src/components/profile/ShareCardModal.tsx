'use client';

import { useRef, useState } from 'react';
import { X, Download, Image, Loader2 } from 'lucide-react';
import { ProfileShareCard } from './ProfileShareCard';

interface Props {
  open: boolean;
  onClose: () => void;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  ledgerScore: number;
  credibility: number;
  weeklyDelta: number;
  eventsCount: number;
  dimensions: Array<{ key: string; fullName: string; value: number; levelLabel: string }>;
  recentEvents: Array<{ title?: string; description?: string; delta?: number; impact?: number; type?: string; eventType?: string }>;
  role?: string;
  location?: string;
  isVerified?: boolean;
}

type ExportFormat = 'pdf' | 'png';

export function ShareCardModal({ open, onClose, ...cardProps }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  if (!open) return null;

  async function getCanvas() {
    const { default: html2canvas } = await import('html2canvas');
    return html2canvas(cardRef.current!, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
  }

  async function handlePDF() {
    setExporting('pdf');
    try {
      const [canvas, { jsPDF }] = await Promise.all([getCanvas(), import('jspdf')]);
      const imgData = canvas.toDataURL('image/png');
      const W = 640 * 0.2646; // px → mm
      const H = 853 * 0.2646;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [W, H] });
      pdf.addImage(imgData, 'PNG', 0, 0, W, H);
      pdf.save(`shosha_${cardProps.username}.pdf`);
    } catch (e) {
      console.error('PDF export failed', e);
    } finally {
      setExporting(null);
    }
  }

  async function handlePNG() {
    setExporting('png');
    try {
      const canvas = await getCanvas();
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shosha_${cardProps.username}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (e) {
      console.error('PNG export failed', e);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex flex-col items-center gap-4 w-full max-w-[680px]">

        {/* Toolbar */}
        <div className="flex w-full items-center justify-between">
          <p className="text-[12px] font-bold uppercase tracking-widest text-white/60">
            Profile Card
          </p>
          <div className="flex items-center gap-2">
            {/* PNG */}
            <button
              type="button"
              onClick={handlePNG}
              disabled={exporting !== null}
              className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[12px] font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-50"
            >
              {exporting === 'png'
                ? <Loader2 size={13} className="animate-spin" />
                : <Image size={13} />}
              {exporting === 'png' ? 'Saving…' : 'PNG'}
            </button>

            {/* PDF */}
            <button
              type="button"
              onClick={handlePDF}
              disabled={exporting !== null}
              className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[12px] font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-50"
            >
              {exporting === 'pdf'
                ? <Loader2 size={13} className="animate-spin" />
                : <Download size={13} />}
              {exporting === 'pdf' ? 'Saving…' : 'PDF'}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Card preview */}
        <div className="overflow-auto rounded-sm shadow-2xl" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <ProfileShareCard ref={cardRef} {...cardProps} />
        </div>

      </div>
    </div>
  );
}
