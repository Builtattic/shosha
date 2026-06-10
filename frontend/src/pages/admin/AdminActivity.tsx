import { useEffect, useMemo, useState } from 'react';
import { listAdminActions } from '@/api/admin';
import { formatDate } from '@/lib/utils';

type AdminAction = {
  id: string;
  actor_user_id: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  created_at: string;
};

function shortId(id: string | null) {
  if (!id) return '—';
  return id.slice(0, 8);
}

export default function AdminActivity() {
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listAdminActions();
        if (mounted) setActions(data as AdminAction[]);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load activity');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const sorted = useMemo(
    () =>
      [...actions].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [actions],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-2xl bg-muted" />
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
        <h2 className="text-sm font-black uppercase tracking-wide">Admin Activity</h2>
        <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-muted-foreground">
          {actions.length} actions
        </span>
      </div>

      {/* TODO: resolve actor_user_id to username when user lookup is batched */}

      <div className="overflow-x-auto rounded-3xl border border-border bg-card">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="bg-secondary/30">
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-muted-foreground">When</th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-muted-foreground">Actor</th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-muted-foreground">Action</th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-muted-foreground">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((action) => (
              <tr key={action.id}>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {formatDate(action.created_at)}
                </td>
                <td className="px-4 py-3 font-mono text-xs font-bold">
                  {shortId(action.actor_user_id)}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-black uppercase text-primary">
                    {action.action_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {action.target_type} {shortId(action.target_id)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
