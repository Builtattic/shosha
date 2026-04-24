'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Toast = { id: number; message: string };
type ToastContextValue = { push: (message: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string) => {
    const id = Date.now();
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-24 left-1/2 z-50 w-full max-w-md -translate-x-1/2 space-y-2 px-4">
        {toasts.map((toast) => (
          <div key={toast.id} className="border border-accent bg-bg px-4 py-3 text-sm text-text shadow-lime">
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
}
