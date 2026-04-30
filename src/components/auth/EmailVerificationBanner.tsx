'use client';

import { useEffect, useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { Mail, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const DISMISS_KEY = 'shosha:email-verification-dismissed-until';

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = window.localStorage.getItem(DISMISS_KEY);
    if (stored && Number(stored) > Date.now()) {
      setDismissed(true);
    } else {
      setDismissed(false);
    }
  }, []);

  // Banner only shows for email-bearing accounts that aren't verified.
  if (!user || !user.email || user.emailVerified) return null;
  if (dismissed) return null;

  async function handleResend() {
    if (!user || sending) return;
    setSending(true);
    setError('');
    try {
      await sendEmailVerification(user);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend verification email.');
    } finally {
      setSending(false);
    }
  }

  function handleDismiss() {
    // Hide for 24 hours.
    window.localStorage.setItem(DISMISS_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    setDismissed(true);
  }

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
      <div className="mx-auto flex max-w-2xl items-start gap-3 px-4 py-3">
        <Mail size={18} className="mt-0.5 shrink-0" />
        <div className="flex-1 text-[13px] leading-snug">
          <p className="font-bold">Verify your email to file reports.</p>
          <p className="opacity-80 mt-0.5">
            We sent a confirmation link to <span className="font-mono">{user.email}</span>. Filings are blocked
            until you click it.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={sending || sent}
              className="rounded-full bg-foreground px-3 py-1.5 text-[12px] font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {sent ? 'Sent — check your inbox' : sending ? 'Sending…' : 'Resend email'}
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-[12px] font-bold underline-offset-2 hover:underline"
            >
              I&apos;ve verified — refresh
            </button>
            {error && <span className="text-[12px] text-destructive">{error}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss for 24h"
          className="text-amber-700/70 hover:text-amber-700 dark:text-amber-300/70 dark:hover:text-amber-300"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
