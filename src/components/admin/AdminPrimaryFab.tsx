'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, Plus, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminPrimaryFab() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={cn('fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[80] lg:hidden')}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-[calc(100%+0.5rem)] right-0 w-56 overflow-hidden rounded-2xl border border-border bg-background/95 py-1 shadow-xl backdrop-blur-xl"
          >
            <Link
              href="/admin/create"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-foreground transition-colors hover:bg-muted"
            >
              <FileText size={16} className="text-primary" />
              Publish claim
            </Link>
            <Link
              href="/admin/accounts#admin-create-dossier"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-foreground transition-colors hover:bg-muted"
            >
              <UserPlus size={16} className="text-primary" />
              Create dossier
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={open ? 'Close create actions' : 'Open create actions'}
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(0,0,0,0.25)] ring-4 ring-background transition-transform active:scale-90"
      >
        <Plus size={26} strokeWidth={2.5} className={cn('transition-transform', open && 'rotate-45')} />
      </button>
    </div>
  );
}
