'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReportModal } from '@/components/report/ReportModal';

type ReportModalContextValue = {
  open: (options?: { accountId?: string; onSubmitted?: (accountId: string) => void }) => void;
  close: () => void;
};

const ReportModalContext = createContext<ReportModalContextValue | null>(null);

export function ReportModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [submittedCallback, setSubmittedCallback] = useState<((accountId: string) => void) | null>(null);

  const open = useCallback((options?: { accountId?: string; onSubmitted?: (accountId: string) => void }) => {
    setAccountId(options?.accountId);
    setSubmittedCallback(() => options?.onSubmitted ?? null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setAccountId(undefined);
    setSubmittedCallback(null);
  }, []);

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <ReportModalContext.Provider value={value}>
      {children}
      <ReportModal
        open={isOpen}
        accountId={accountId}
        onClose={close}
        onSubmitted={(submittedAccountId) => {
          submittedCallback?.(submittedAccountId);
          router.refresh();
        }}
      />
    </ReportModalContext.Provider>
  );
}

export function useReportModal() {
  const ctx = useContext(ReportModalContext);
  if (!ctx) throw new Error('useReportModal must be used inside ReportModalProvider');
  return ctx;
}
