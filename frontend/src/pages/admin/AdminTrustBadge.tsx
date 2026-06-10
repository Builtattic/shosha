import { useEffect, useState } from 'react';
import { decideTrustBadge, listTrustBadgePending } from '@/api/admin';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';

type TrustBadgeUser = {
  id: string;
  username: string;
  display_name: string | null;
  email: string;
  trust_badge_submitted_at: string | null;
  trust_badge_doc_type: string | null;
  trust_badge_selfie_url: string | null;
  trust_badge_doc_url: string | null;
};

export default function AdminTrustBadge() {
  const toast = useToast();
  const [items, setItems] = useState<TrustBadgeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listTrustBadgePending();
        if (mounted) setItems(data as TrustBadgeUser[]);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load trust badge queue');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function decide(userId: string, verdict: 'approved' | 'rejected') {
    setBusyId(userId);
    try {
      await decideTrustBadge(userId, verdict, notesById[userId]?.trim() ?? '');
      setItems((prev) => prev.filter((item) => item.id !== userId));
      toast.push(`Trust badge ${verdict}.`);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Decision failed.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wide">Trust Badge Review</h2>
        <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-muted-foreground">
          {items.length} pending review
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-16 text-center">
          <h3 className="text-xl font-black">No trust badges pending</h3>
          <p className="mt-2 text-sm text-muted-foreground">All submissions are reviewed.</p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
          {items.map((item) => {
            const busy = busyId === item.id;
            return (
              <article key={item.id} className="p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-black uppercase text-purple-700">
                        {item.trust_badge_doc_type ?? 'unknown'}
                      </span>
                      {item.trust_badge_submitted_at && (
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(item.trust_badge_submitted_at)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black">{item.display_name ?? item.username}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      @{item.username} · {item.email}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      {item.trust_badge_selfie_url ? (
                        <img
                          src={item.trust_badge_selfie_url}
                          alt="Selfie"
                          className="h-20 w-20 rounded-full border border-border object-cover"
                        />
                      ) : null}
                      {item.trust_badge_doc_url ? (
                        <a
                          href={item.trust_badge_doc_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          View document
                        </a>
                      ) : null}
                    </div>
                    <label className="mt-4 block space-y-1">
                      <span className="text-[11px] font-bold uppercase text-muted-foreground">Note (optional)</span>
                      <input
                        value={notesById[item.id] ?? ''}
                        onChange={(e) => setNotesById((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                        placeholder="Add context for approval or rejection"
                      />
                    </label>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button
                      disabled={busy}
                      onClick={() => decide(item.id, 'approved')}
                      className="bg-emerald-600 hover:bg-emerald-600/90"
                    >
                      Approve
                    </Button>
                    <Button variant="outline" disabled={busy} onClick={() => decide(item.id, 'rejected')}>
                      Reject
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
