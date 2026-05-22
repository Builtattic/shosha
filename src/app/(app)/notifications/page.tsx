'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { MobileAppHeader } from '@/components/nav/MobileAppHeader';
import { useNotifications } from '@/contexts/NotificationsContext';

type Kind =
  | 'report_approved'
  | 'report_rejected'
  | 'report_flagged'
  | 'report_comment'
  | 'report_align'
  | 'report_oppose'
  | 'claim_approved'
  | 'claim_rejected'
  | 'abuse_dismissed'
  | 'dispute_resolved'
  | 'system';

type NotificationItem = {
  id: string;
  kind: Kind;
  title: string;
  body: string;
  link?: string;
  meta?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
};

function relativeTime(iso: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const sec = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return formatDate(iso);
}

function iconFor(kind: Kind) {
  switch (kind) {
    case 'report_approved':
      return { Icon: CheckCircle2, tone: 'text-primary bg-primary/10' };
    case 'report_rejected':
      return { Icon: XCircle, tone: 'text-destructive bg-destructive/10' };
    case 'report_flagged':
      return { Icon: AlertTriangle, tone: 'text-amber-500 bg-amber-500/10' };
    case 'report_comment':
      return { Icon: MessageSquare, tone: 'text-foreground bg-muted' };
    case 'report_align':
      return { Icon: ThumbsUp, tone: 'text-primary bg-primary/10' };
    case 'report_oppose':
      return { Icon: ThumbsDown, tone: 'text-destructive bg-destructive/10' };
    case 'claim_approved':
      return { Icon: ShieldCheck, tone: 'text-primary bg-primary/10' };
    case 'claim_rejected':
      return { Icon: ShieldAlert, tone: 'text-destructive bg-destructive/10' };
    case 'abuse_dismissed':
      return { Icon: ShieldCheck, tone: 'text-foreground bg-muted' };
    case 'dispute_resolved':
      return { Icon: ShieldCheck, tone: 'text-primary bg-primary/10' };
    default:
      return { Icon: Bell, tone: 'text-muted-foreground bg-muted' };
  }
}

export default function NotificationsPage() {
  const { unreadCount, refresh } = useNotifications();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      const payload = await response.json();
      if (payload.ok) {
        setItems(payload.data?.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' }).catch(() => {});
    refresh();
  }

  async function markAll() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background safe-bottom">
      <MobileAppHeader />

      <div className="mx-auto max-w-2xl px-4 pt-4">
        <div className="mb-4">
          <h1 className="text-[24px] font-serif font-black leading-none text-foreground">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-background">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Verdicts on your filings, claim decisions, and ledger activity.
          </p>
          <button
            type="button"
            onClick={markAll}
            disabled={busy || unreadCount === 0}
            className="mt-3 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[12px] font-bold transition-colors hover:bg-muted disabled:opacity-50"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3 rounded-[18px] border border-border bg-card p-4">
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 animate-pulse rounded-md bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded-md bg-muted" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-[24px] border border-border bg-card p-8 text-center">
            <Bell size={28} className="mx-auto text-muted-foreground/60" />
            <p className="mt-3 text-[15px] font-bold text-foreground">No notifications yet</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              You&apos;ll see verdicts, replies, and claim decisions here.
            </p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <ul className="space-y-2">
            {items.map((n) => {
              const { Icon, tone } = iconFor(n.kind);
              const inner = (
                <div
                  className={cn(
                    'flex items-start gap-3 rounded-[18px] border bg-card p-4 transition-colors',
                    n.read ? 'border-border' : 'border-primary/30 bg-primary/[0.03]'
                  )}
                >
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', tone)}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h3
                        className={cn(
                          'text-[14px] truncate',
                          n.read ? 'font-semibold text-foreground/90' : 'font-bold text-foreground'
                        )}
                      >
                        {n.title}
                      </h3>
                      <span className="text-[11px] text-muted-foreground/70 shrink-0">
                        {relativeTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-[13px] text-muted-foreground mt-0.5">{n.body}</p>
                  </div>
                  {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                </div>
              );

              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link href={n.link} onClick={() => !n.read && markRead(n.id)} className="block">
                      {inner}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => !n.read && markRead(n.id)}
                      className="w-full text-left"
                    >
                      {inner}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
