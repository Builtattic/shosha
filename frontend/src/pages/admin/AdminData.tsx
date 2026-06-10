import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminDataCollections } from '@/api/admin';

const COLLECTION_ROUTES: Record<string, string> = {
  reports: '/admin/queue',
  accounts: '/admin/accounts',
  users: '/admin/users',
  deletion_requests: '/admin/deletion-requests',
  audit_requests: '/admin/audits',
  issue_reports: '/admin/issues',
  moderation_requests: '/admin/moderation',
  evidence_proposals: '/admin/evidence',
};

export default function AdminData() {
  const [collections, setCollections] = useState<
    Array<{ id: string; label: string; description: string }>
  >([]);
  const [canWrite, setCanWrite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAdminDataCollections();
        if (mounted) {
          setCollections(data.collections);
          setCanWrite(data.can_write);
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load collections');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="h-32 animate-pulse rounded-2xl bg-muted" />;
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide">Data Center</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Browse collections via dedicated admin pages.
          </p>
        </div>
        <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-muted-foreground">
          {collections.length} collections
          {canWrite ? ' · write enabled' : ''}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => {
          const href = COLLECTION_ROUTES[collection.id];
          const inner = (
            <div className="rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-secondary/30">
              <h3 className="font-black text-foreground">{collection.label}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{collection.description}</p>
              <p className="mt-3 font-mono text-[10px] uppercase text-muted-foreground">{collection.id}</p>
            </div>
          );
          return href ? (
            <Link key={collection.id} to={href}>
              {inner}
            </Link>
          ) : (
            <div key={collection.id}>{inner}</div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Full data browser not available in V2. Use dedicated admin pages above.
        {/* TODO: wire DataCenterPanel when backend CRUD endpoints are implemented */}
      </div>
    </div>
  );
}
