'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import type { IssueReport, IssueStatus } from '@/lib/repos/issueReports';

function severityClasses(severity?: string) {
  switch (severity) {
    case 'Critical':
      return 'bg-red-100 text-red-700';
    case 'High':
      return 'bg-orange-100 text-orange-700';
    case 'Medium':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-secondary text-muted-foreground';
  }
}

function statusClasses(status: IssueStatus) {
  switch (status) {
    case 'open':
      return 'bg-blue-100 text-blue-700';
    case 'in_progress':
      return 'bg-amber-100 text-amber-700';
    case 'resolved':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-secondary text-muted-foreground';
  }
}

function looksLikeImage(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(url);
}

export function IssuesList({ items: initialItems }: { items: IssueReport[] }) {
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        const left = new Date(a.createdAt).getTime();
        const right = new Date(b.createdAt).getTime();
        return right - left;
      }),
    [items]
  );

  async function updateStatus(id: string, status: IssueStatus) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/issues/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Could not update status.');
      setItems((prev) => prev.map((item) => (item._id === id ? { ...item, status } : item)));
      toast.push(`Issue marked ${status.replace('_', ' ')}.`);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Could not update status.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="divide-y divide-border">
      {sorted.map((item) => {
        const isExpanded = expandedId === item._id;
        const busy = busyId === item._id || pending;
        const attachments = item.attachmentUrls ?? [];
        return (
          <article key={item._id} className="p-6 hover:bg-secondary/20 transition-colors">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${severityClasses(item.severity)}`}
                  >
                    {item.severity ?? 'Low'}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                    {item.issueType}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-100 text-cyan-700">
                    {item.page}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${statusClasses(item.status)}`}
                  >
                    {item.status.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-foreground">{item.title}</h3>
                  <p className="text-[12px] text-muted-foreground">
                    {formatDate(item.createdAt)} · {item.name} ({item.email})
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedId((prev) => (prev === item._id ? null : item._id))}
                  className="text-left w-full"
                >
                  <p className={`text-sm text-muted-foreground ${isExpanded ? '' : 'line-clamp-3'}`}>
                    {item.details}
                  </p>
                </button>

                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {attachments.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="group block"
                      >
                        {looksLikeImage(url) ? (
                          <img
                            src={url}
                            alt="Issue attachment"
                            className="h-20 w-20 rounded-lg object-cover border border-border"
                          />
                        ) : (
                          <span className="inline-flex max-w-[280px] items-center rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground group-hover:underline">
                            {url}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => updateStatus(item._id, 'resolved')}
                  className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-[12px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Mark Resolved
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => updateStatus(item._id, 'dismissed')}
                  className="h-10 px-4 rounded-xl border border-border bg-background text-[12px] font-black uppercase tracking-wider text-muted-foreground hover:border-red-200 hover:text-red-600 transition-all disabled:opacity-50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
