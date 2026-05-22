'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import { ProfileShareCard, type ProfileShareCardProps } from './ProfileShareCard';

interface Props extends ProfileShareCardProps {
  open: boolean;
  onClose: () => void;
}

type ExportFormat = 'pdf' | 'png';

const CARD_SIZE = 600;

export function ShareCardModal({ open, onClose, ...cardProps }: Props) {
  const exportRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!open) return;
    const el = previewContainerRef.current;
    if (!el) return;

    const updateScale = () => {
      const w = el.clientWidth;
      setScale(w > 0 ? Math.min(1, w / CARD_SIZE) : 1);
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

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
      backgroundColor: '#ffffff',
      logging: false,
      width: CARD_SIZE,
      height: CARD_SIZE,
    });
  }

  async function handlePDF() {
    setExporting('pdf');
    try {
      const [canvas, { jsPDF }] = await Promise.all([getCanvas(), import('jspdf')]);
      const imgData = canvas.toDataURL('image/png');
      const W = CARD_SIZE * 0.2646;
      const H = CARD_SIZE * 0.2646;
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

  if (!open) return null;

  const scaledHeight = CARD_SIZE * scale;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-x-hidden bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-[min(680px,calc(100vw-2rem))] flex-col items-center gap-4">

        {/* Toolbar */}
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] font-bold uppercase tracking-widest text-white/60">
            Profile Card
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePNG}
              disabled={exporting !== null}
              className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[12px] font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-50"
            >
              {exporting === 'png'
                ? <Loader2 size={13} className="animate-spin" />
                : <ImageIcon size={13} />}
              {exporting === 'png' ? 'Saving…' : 'PNG'}
            </button>

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

        {/* Scaled preview */}
        <div
          className="w-full max-w-[600px] overflow-y-auto overflow-x-hidden rounded-sm shadow-2xl"
          style={{ maxHeight: 'calc(100vh - 120px)' }}
        >
          <div ref={previewContainerRef} className="mx-auto w-full overflow-hidden">
            <div style={{ width: '100%', height: scaledHeight }}>
              <div
                style={{
                  width: CARD_SIZE,
                  height: CARD_SIZE,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                }}
              >
                <ProfileShareCard {...cardProps} />
              </div>
            </div>
          </div>
        </div>

        {/* Hidden full-size card for export */}
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
          <ProfileShareCard ref={exportRef} {...cardProps} />
        </div>
      </div>
    </div>
  );
}
