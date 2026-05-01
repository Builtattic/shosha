'use client';

import { useState } from 'react';
import { Upload, Check } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function AccountShareButton({ displayName, username }: { displayName: string; username: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareData: ShareData = {
      title: `${displayName} on Shosha`,
      text: `See ${displayName} (@${username}) on the Shosha public ledger.`,
      url,
    };
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled — fall through to clipboard
    }
    try {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      toast.push('Profile link copied');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.push('Could not copy link');
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Share profile"
      className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95"
    >
      {copied ? <Check size={18} strokeWidth={2.5} /> : <Upload size={20} strokeWidth={2.5} />}
    </button>
  );
}
