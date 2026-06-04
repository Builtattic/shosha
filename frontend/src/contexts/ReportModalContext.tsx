import { createContext, useContext, useState } from 'react';

// ── Context shape ──────────────────────────────────────────────────────────────
interface ReportModalContextType {
  isOpen: boolean;
  /** Open the report filing modal, optionally pre-filling a subject account. */
  open: (accountId?: string) => void;
  close: () => void;
  accountId: string | undefined;
}

const ReportModalContext = createContext<ReportModalContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  accountId: undefined,
});

// ── Provider ───────────────────────────────────────────────────────────────────
// Stub — the full <ReportModal> will be mounted here once the Reports module
// is ported. For now the context is wired so MobileAppHeader compiles and the
// (+) button won't crash.
export function ReportModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [accountId, setAccountId] = useState<string | undefined>();

  return (
    <ReportModalContext.Provider value={{
      isOpen,
      accountId,
      open: (id?: string) => { setAccountId(id); setIsOpen(true); },
      close: () => { setIsOpen(false); setAccountId(undefined); },
    }}>
      {children}
      {/* TODO: <ReportModal open={isOpen} onClose={close} accountId={accountId} /> */}
    </ReportModalContext.Provider>
  );
}

export const useReportModal = () => useContext(ReportModalContext);
