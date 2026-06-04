import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { FeedItem } from './FeedItem';
import { type FeedReport, toFeedItem } from '@/lib/feed';
import { getReport } from '@/api/reports';

export function PostDetailModal({
  reportId,
  open,
  onClose,
}: {
  reportId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [report, setReport] = useState<FeedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch report data whenever the modal opens with a new reportId
  useEffect(() => {
    if (open && reportId) {
      setReport(null);
      setLoading(true);
      setError(null);

      getReport(reportId)
        .then((res) => {
          if (res.ok && res.data) {
            setReport(res.data);
          } else {
            setError(res.error ?? 'Failed to load report');
          }
        })
        .catch(() => setError('Failed to load report'))
        .finally(() => setLoading(false));
    } else if (!open) {
      // Reset after close animation finishes
      const timer = setTimeout(() => {
        setReport(null);
        setError(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, reportId]);

  // Body scroll lock while open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-2xl overflow-hidden rounded-[32px] border border-border bg-background shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4 px-6">
              <h2 className="text-lg font-black">Filing Details</h2>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-6 no-scrollbar">
              {loading && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="mt-4 text-sm font-medium">Loading report data...</p>
                </div>
              )}

              {error && (
                <div className="py-20 text-center">
                  <p className="font-bold text-destructive">{error}</p>
                  <button
                    onClick={onClose}
                    className="mt-4 rounded-full bg-foreground px-6 py-2 text-sm font-bold text-background"
                  >
                    Close
                  </button>
                </div>
              )}

              {report && !loading && (
                <div className="mx-auto max-w-xl">
                  <FeedItem {...toFeedItem(report)} />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
