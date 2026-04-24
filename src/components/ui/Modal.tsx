'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function Modal({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <section className="max-h-[92vh] w-full max-w-md overflow-y-auto border border-border bg-bg p-4 shadow-lime">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-4xl">{title}</h2>
          <Button aria-label="Close modal" variant="ghost" className="h-11 w-11 p-0" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}
