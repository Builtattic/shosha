'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Copy,
  Database,
  Download,
  Eye,
  FileJson,
  Image as ImageIcon,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  TableProperties,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

type CollectionSummary = {
  id: string;
  label: string;
  description: string;
  count: number;
  latest: string | null;
  readOnly: boolean;
  createEnabled: boolean;
  deleteEnabled: boolean;
};

type DataColumn = { key: string; label: string };

type CollectionDetail = {
  id: string;
  label: string;
  description: string;
  readOnly: boolean;
  createEnabled: boolean;
  deleteEnabled: boolean;
  columns: DataColumn[];
  lockedFields: string[];
};

type DataRecord = {
  _id: string;
  value: unknown;
  updatedAt: string | null;
  summary: Record<string, string>;
};

type RecordsPayload = {
  collection: CollectionDetail;
  canWrite: boolean;
  total: number;
  matched: number;
  records: DataRecord[];
};

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error?: { message?: string } };
type InspectorTab = 'overview' | 'media' | 'json' | 'edit';
type Density = 'comfortable' | 'compact';
type MediaAsset = { path: string; url: string; type: 'image' | 'video' | 'file' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getValueAtPath(value: unknown, key: string): unknown {
  if (key === '_id') return isRecord(value) ? value._id : undefined;
  if (!isRecord(value)) return undefined;
  return key.split('.').reduce<unknown>((current, part) => {
    if (!isRecord(current)) return undefined;
    return current[part];
  }, value);
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `${value.length} items`;
  if (isRecord(value)) return `${Object.keys(value).length} fields`;
  return String(value);
}

function preview(value: unknown, max = 90) {
  const text = displayValue(value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function formatWhen(value: string | null) {
  if (!value) return 'No timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function mediaTypeFromUrl(url: string): MediaAsset['type'] {
  const clean = url.split('?')[0]?.toLowerCase() ?? url.toLowerCase();
  if (/\.(mp4|webm|mov|m4v)$/i.test(clean) || /\/video\//i.test(url)) return 'video';
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(clean)) return 'image';
  if (/dicebear|firebasestorage|googleusercontent|images\.|\/image\//i.test(url)) return 'image';
  return 'file';
}

function collectMedia(value: unknown, basePath = '', out: MediaAsset[] = []): MediaAsset[] {
  if (typeof value === 'string') {
    const url = value.trim();
    const likelyUrl = /^https?:\/\//i.test(url) || url.startsWith('/');
    if (likelyUrl) {
      const type = mediaTypeFromUrl(url);
      if (type !== 'file' || /media|url|avatar|photo|thumb|image|video|public/i.test(basePath)) {
        out.push({ path: basePath || 'url', url, type });
      }
    }
    return out;
  }
  if (Array.isArray(value)) {
    value.slice(0, 50).forEach((item, index) => collectMedia(item, `${basePath}[${index}]`, out));
    return dedupeMedia(out);
  }
  if (isRecord(value)) {
    Object.entries(value).forEach(([key, item]) => collectMedia(item, basePath ? `${basePath}.${key}` : key, out));
  }
  return dedupeMedia(out);
}

function dedupeMedia(items: MediaAsset[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function primitiveEntries(value: unknown) {
  if (!isRecord(value)) return [];
  return Object.entries(value)
    .filter(([, item]) => item === null || ['string', 'number', 'boolean', 'undefined'].includes(typeof item))
    .slice(0, 32);
}

function recordCompleteness(value: unknown) {
  if (!isRecord(value)) return 0;
  const entries = Object.values(value);
  if (!entries.length) return 0;
  const filled = entries.filter((item) => {
    if (item === null || item === undefined || item === '') return false;
    if (Array.isArray(item)) return item.length > 0;
    if (isRecord(item)) return Object.keys(item).length > 0;
    return true;
  }).length;
  return Math.round((filled / entries.length) * 100);
}

function csvEscape(value: unknown) {
  const text = displayValue(value).replace(/\r?\n/g, ' ');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function readApi<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiResponse<T>;
  if (!payload.ok) throw new Error(payload.error?.message ?? 'Request failed');
  return payload.data;
}

function MediaPreview({ asset, compact = false }: { asset: MediaAsset; compact?: boolean }) {
  if (asset.type === 'video') {
    return (
      <div className={cn('overflow-hidden rounded-lg border border-border bg-black', compact ? 'h-9 w-12' : 'aspect-video w-full')}>
        <video src={asset.url} controls={!compact} muted={compact} className="h-full w-full object-cover" />
      </div>
    );
  }
  if (asset.type === 'image') {
    return (
      <div className={cn('overflow-hidden rounded-lg border border-border bg-secondary', compact ? 'h-9 w-9' : 'aspect-video w-full')}>
        <img src={asset.url} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }
  return (
    <a
      href={asset.url}
      target="_blank"
      rel="noreferrer"
      className={cn('inline-flex items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground', compact ? 'h-9 w-9' : 'h-24 w-full')}
    >
      <FileJson size={compact ? 14 : 22} />
    </a>
  );
}

export function DataCenterPanel({ initialCollections, canWrite }: { initialCollections: CollectionSummary[]; canWrite: boolean }) {
  const [collections, setCollections] = useState(initialCollections);
  const [selectedId, setSelectedId] = useState(initialCollections[0]?.id ?? 'accounts');
  const [payload, setPayload] = useState<RecordsPayload | null>(null);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('overview');
  const [density, setDensity] = useState<Density>('compact');
  const [editJson, setEditJson] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createId, setCreateId] = useState('');
  const [createJson, setCreateJson] = useState('{\n  "createdAt": ""\n}');
  const [deleteTarget, setDeleteTarget] = useState<DataRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const activeCollection = payload?.collection;
  const selectedSummary = useMemo(() => collections.find((collection) => collection.id === selectedId) ?? collections[0], [collections, selectedId]);
  const selectedRecord = useMemo(
    () => payload?.records.find((item) => item._id === selectedRecordId) ?? null,
    [payload?.records, selectedRecordId]
  );
  const selectedMedia = useMemo(() => collectMedia(selectedRecord?.value ?? {}), [selectedRecord]);
  const selectedFields = useMemo(() => primitiveEntries(selectedRecord?.value ?? {}), [selectedRecord]);
  const writeEnabled = Boolean(canWrite && activeCollection && !activeCollection.readOnly);

  async function refreshCollections() {
    const response = await fetch('/api/admin/data', { cache: 'no-store' });
    const data = await readApi<{ collections: CollectionSummary[] }>(response);
    setCollections(data.collections);
  }

  async function loadRecords(collectionId = selectedId) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: search, limit: String(limit) });
      const response = await fetch(`/api/admin/data/${encodeURIComponent(collectionId)}?${params}`, { cache: 'no-store' });
      const nextPayload = await readApi<RecordsPayload>(response);
      setPayload(nextPayload);
      setSelectedRecordId((current) =>
        current && nextPayload.records.some((item) => item._id === current) ? current : nextPayload.records[0]?._id ?? null
      );
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Failed to load records');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      loadRecords(selectedId);
    }, 180);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, search, limit]);

  useEffect(() => {
    if (selectedRecord) setEditJson(JSON.stringify(selectedRecord.value ?? {}, null, 2));
  }, [selectedRecord]);

  function openRecord(record: DataRecord, tab: InspectorTab = 'overview') {
    setSelectedRecordId(record._id);
    setInspectorTab(tab);
    setDrawerOpen(true);
  }

  function exportCsv() {
    if (!payload) return;
    const headers = ['_id', ...payload.collection.columns.filter((column) => column.key !== '_id').map((column) => column.key)];
    const rows = payload.records.map((item) => headers.map((key) => csvEscape(key === '_id' ? item._id : getValueAtPath(item.value, key))).join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${payload.collection.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyJson() {
    if (!selectedRecord) return;
    await navigator.clipboard.writeText(JSON.stringify(selectedRecord.value ?? {}, null, 2));
    toast.push('JSON copied.');
  }

  async function saveRecord() {
    if (!selectedRecord || !payload) return;
    try {
      const parsed = JSON.parse(editJson);
      const response = await fetch(`/api/admin/data/${payload.collection.id}/${encodeURIComponent(selectedRecord._id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: parsed }),
      });
      const updated = await readApi<DataRecord>(response);
      setPayload((current) =>
        current ? { ...current, records: current.records.map((item) => (item._id === updated._id ? updated : item)) } : current
      );
      setSelectedRecordId(updated._id);
      setEditJson(JSON.stringify(updated.value ?? {}, null, 2));
      toast.push('Record updated.');
      refreshCollections().catch(() => {});
      startTransition(() => router.refresh());
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Invalid JSON or save failed');
    }
  }

  async function createRecord() {
    if (!payload) return;
    try {
      const parsed = JSON.parse(createJson);
      const response = await fetch(`/api/admin/data/${payload.collection.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: createId.trim() || undefined, value: parsed }),
      });
      const created = await readApi<DataRecord>(response);
      setCreateOpen(false);
      toast.push('Record created.');
      await Promise.all([loadRecords(payload.collection.id), refreshCollections()]);
      setSelectedRecordId(created._id);
      startTransition(() => router.refresh());
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Invalid JSON or create failed');
    }
  }

  async function deleteRecord() {
    if (!deleteTarget || !payload || deleteConfirm !== deleteTarget._id) return;
    try {
      const response = await fetch(`/api/admin/data/${payload.collection.id}/${encodeURIComponent(deleteTarget._id)}`, { method: 'DELETE' });
      await readApi<{ deleted: string }>(response);
      setPayload((current) =>
        current ? { ...current, records: current.records.filter((item) => item._id !== deleteTarget._id), matched: Math.max(0, current.matched - 1) } : current
      );
      setDeleteTarget(null);
      setDeleteConfirm('');
      if (selectedRecordId === deleteTarget._id) {
        setSelectedRecordId(null);
        setDrawerOpen(false);
      }
      toast.push('Record deleted.');
      refreshCollections().catch(() => {});
      startTransition(() => router.refresh());
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Delete failed');
    }
  }

  const columns = activeCollection?.columns ?? [{ key: '_id', label: 'ID' }];

  return (
    <div className="min-w-0 space-y-4">
      <div className="grid min-w-0 gap-4 xl:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Collections</p>
          </div>
          <div className="max-h-[68vh] overflow-y-auto p-2">
            {collections.map((collection) => {
              const active = collection.id === selectedId;
              return (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => setSelectedId(collection.id)}
                  className={cn(
                    'mb-1.5 flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition',
                    active ? 'border-foreground bg-background' : 'border-transparent hover:border-border hover:bg-secondary/40'
                  )}
                >
                  <Database size={13} className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-black text-foreground">{collection.label}</span>
                  {collection.readOnly && <Lock size={11} className="shrink-0 text-muted-foreground" />}
                  <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-black text-foreground">{collection.count}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border bg-background/70 p-4">
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="truncate text-[15px] font-black text-foreground">{activeCollection?.label ?? selectedSummary?.label}</h3>
                  {activeCollection?.readOnly && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      <Lock size={10} />
                      Read only
                    </span>
                  )}
                  {!canWrite && <span className="rounded-md bg-secondary px-2 py-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">View only</span>}
                </div>
                <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                  {payload ? `${payload.matched} shown from ${payload.total} records` : 'Loading records...'}
                </p>
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="relative min-w-[14rem] flex-1 lg:w-72 lg:flex-none">
                  <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search records..."
                    className="h-9 w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-[12px] font-bold text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setDensity((current) => (current === 'compact' ? 'comfortable' : 'compact'))}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-[11px] font-black text-foreground transition hover:bg-secondary"
                >
                  <TableProperties size={13} />
                  {density === 'compact' ? 'Compact' : 'Comfort'}
                </button>
                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={!payload?.records.length}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-[11px] font-black text-foreground transition hover:bg-secondary disabled:opacity-40"
                >
                  <Download size={13} />
                  CSV
                </button>
                <select
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                  className="h-9 rounded-lg border border-border bg-background px-3 text-[11px] font-bold text-foreground outline-none"
                >
                  {[50, 100, 200, 500].map((value) => (
                    <option key={value} value={value}>
                      {value} rows
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => loadRecords()}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-[11px] font-black text-foreground transition hover:bg-secondary"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Refresh
                </button>
                {writeEnabled && activeCollection?.createEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      setCreateId('');
                      setCreateJson(JSON.stringify({ createdAt: new Date().toISOString() }, null, 2));
                      setCreateOpen(true);
                    }}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-[11px] font-black text-primary-foreground transition hover:bg-primary/90"
                  >
                    <Plus size={13} />
                    New
                  </button>
                )}
              </div>
            </div>
          </div>

          {activeCollection?.lockedFields?.length ? (
            <div className="border-b border-border bg-amber-500/5 px-4 py-2 text-[11px] font-medium text-muted-foreground">
              Protected fields: {activeCollection.lockedFields.join(', ')}
            </div>
          ) : null}

          <div className="max-h-[70vh] min-w-0 overflow-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr>
                  <th className="sticky left-0 z-20 w-12 border-b border-r border-border bg-card px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">#</th>
                  <th className="w-16 border-b border-r border-border bg-card px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Media</th>
                  {columns.map((column) => (
                    <th key={column.key} className="border-b border-r border-border bg-card px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {column.label}
                    </th>
                  ))}
                  <th className="sticky right-0 z-20 w-24 border-b border-border bg-card px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Open</th>
                </tr>
              </thead>
              <tbody>
                {payload?.records.map((item, index) => {
                  const selected = item._id === selectedRecordId;
                  const media = collectMedia(item.value);
                  return (
                    <tr key={item._id} onClick={() => openRecord(item)} className={cn('cursor-pointer transition', selected ? 'bg-primary/5' : 'hover:bg-secondary/20')}>
                      <td className={cn('sticky left-0 z-[5] border-b border-r border-border bg-inherit px-3 font-mono text-[11px] text-muted-foreground', density === 'compact' ? 'py-2' : 'py-4')}>{index + 1}</td>
                      <td className={cn('border-b border-r border-border px-3', density === 'compact' ? 'py-2' : 'py-4')}>
                        {media[0] ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openRecord(item, 'media');
                            }}
                            className="relative"
                          >
                            <MediaPreview asset={media[0]} compact />
                            {media.length > 1 && <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-black text-primary-foreground">{media.length}</span>}
                          </button>
                        ) : (
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                            <ImageIcon size={13} />
                          </span>
                        )}
                      </td>
                      {columns.map((column) => {
                        const raw = column.key === '_id' ? item._id : getValueAtPath(item.value, column.key);
                        return (
                          <td key={column.key} className={cn('max-w-[18rem] border-b border-r border-border px-4 align-middle', density === 'compact' ? 'py-2' : 'py-4')}>
                            <span className={cn('block truncate text-[12px]', column.key === '_id' ? 'font-mono text-muted-foreground' : 'font-bold text-foreground')}>{preview(raw)}</span>
                          </td>
                        );
                      })}
                      <td className={cn('sticky right-0 z-[5] border-b border-border bg-inherit px-4 text-right', density === 'compact' ? 'py-2' : 'py-4')}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openRecord(item);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                          title="Inspect"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && payload?.records.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 3} className="px-6 py-20 text-center text-[13px] font-medium text-muted-foreground">
                      No records match this filter.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={columns.length + 3} className="px-6 py-20 text-center text-[13px] font-medium text-muted-foreground">
                      <Loader2 size={18} className="mx-auto mb-3 animate-spin" />
                      Loading records...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {drawerOpen && selectedRecord && activeCollection && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)}>
          <aside className="flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-border p-5">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{activeCollection.label}</p>
                  <h3 className="mt-1 truncate font-mono text-[13px] font-black text-foreground">{selectedRecord._id}</h3>
                  <p className="mt-1 text-[11px] font-medium text-muted-foreground">{formatWhen(selectedRecord.updatedAt)}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={copyJson} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Copy JSON">
                    <Copy size={14} />
                  </button>
                  <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Close">
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-border bg-card p-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Fields</p>
                  <p className="mt-1 font-mono text-lg font-black text-foreground">{isRecord(selectedRecord.value) ? Object.keys(selectedRecord.value).length : 1}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Media</p>
                  <p className="mt-1 font-mono text-lg font-black text-foreground">{selectedMedia.length}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Filled</p>
                  <p className="mt-1 font-mono text-lg font-black text-foreground">{recordCompleteness(selectedRecord.value)}%</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-1 rounded-xl bg-secondary p-1">
                {[
                  { tab: 'overview' as const, label: 'Fields', icon: TableProperties },
                  { tab: 'media' as const, label: 'Media', icon: ImageIcon },
                  { tab: 'json' as const, label: 'JSON', icon: FileJson },
                  { tab: 'edit' as const, label: 'Edit', icon: Pencil },
                ].map(({ tab, label, icon: Icon }) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setInspectorTab(tab)}
                    className={cn('inline-flex h-9 items-center justify-center gap-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition', inspectorTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {inspectorTab === 'overview' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedFields.map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-border bg-card p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{key}</p>
                      <p className="mt-1 break-words text-[13px] font-bold text-foreground">{displayValue(value)}</p>
                    </div>
                  ))}
                  {selectedFields.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center text-[13px] font-medium text-muted-foreground sm:col-span-2">
                      This record is mostly nested JSON. Use the JSON tab.
                    </div>
                  )}
                </div>
              )}

              {inspectorTab === 'media' && (
                <div className="space-y-3">
                  {selectedMedia.map((asset) => (
                    <div key={`${asset.path}-${asset.url}`} className="rounded-xl border border-border bg-card p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="truncate font-mono text-[10px] font-bold text-muted-foreground">{asset.path}</p>
                        {asset.type === 'video' ? <Video size={13} className="text-muted-foreground" /> : <ImageIcon size={13} className="text-muted-foreground" />}
                      </div>
                      <MediaPreview asset={asset} />
                      <a href={asset.url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-[11px] font-bold text-primary underline-offset-4 hover:underline">
                        {asset.url}
                      </a>
                    </div>
                  ))}
                  {selectedMedia.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center text-[13px] font-medium text-muted-foreground">
                      No image, video, avatar, thumbnail, or media URL found in this record.
                    </div>
                  )}
                </div>
              )}

              {inspectorTab === 'json' && (
                <pre className="max-h-[65vh] overflow-auto rounded-xl border border-border bg-card p-4 text-[11px] leading-5 text-foreground">
                  {JSON.stringify(selectedRecord.value ?? {}, null, 2)}
                </pre>
              )}

              {inspectorTab === 'edit' && (
                <div className="space-y-3">
                  {activeCollection.lockedFields.length ? (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] font-medium leading-5 text-muted-foreground">
                      Protected: {activeCollection.lockedFields.join(', ')}
                    </div>
                  ) : null}
                  <textarea
                    value={editJson}
                    onChange={(event) => setEditJson(event.target.value)}
                    readOnly={!writeEnabled}
                    spellCheck={false}
                    className="min-h-[28rem] w-full resize-y rounded-xl border border-border bg-card p-4 font-mono text-[11px] leading-5 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 text-[11px] font-medium text-muted-foreground">
                      {writeEnabled ? 'Saving replaces this record and creates an audit entry.' : 'Edits require admin/super_admin access.'}
                    </p>
                    {writeEnabled && (
                      <button type="button" onClick={saveRecord} disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[11px] font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                        <Save size={13} />
                        Save
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border p-4">
              <p className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                {writeEnabled ? <ShieldAlert size={13} /> : <Lock size={13} />}
                {writeEnabled ? 'Audited workspace' : 'View-only workspace'}
              </p>
              {writeEnabled && activeCollection.deleteEnabled && (
                <button type="button" onClick={() => setDeleteTarget(selectedRecord)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-destructive/30 px-3 text-[11px] font-black text-destructive hover:bg-destructive/10">
                  <Trash2 size={13} />
                  Delete
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {createOpen && activeCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]" onClick={() => setCreateOpen(false)}>
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-background shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-border p-5">
              <h3 className="text-lg font-black text-foreground">Create {activeCollection.label} Record</h3>
              <p className="mt-1 text-[12px] font-medium text-muted-foreground">Leave the ID blank to use a Firebase push id.</p>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <input value={createId} onChange={(event) => setCreateId(event.target.value)} placeholder="Optional record id" className="admin-input h-12" />
              <textarea value={createJson} onChange={(event) => setCreateJson(event.target.value)} spellCheck={false} className="min-h-[22rem] w-full resize-y rounded-xl border border-border bg-secondary/40 p-4 font-mono text-[12px] leading-5 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-5">
              <button type="button" onClick={() => setCreateOpen(false)} className="h-11 rounded-xl border border-border px-4 text-[12px] font-black text-muted-foreground hover:bg-secondary">
                Cancel
              </button>
              <button type="button" onClick={createRecord} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-[12px] font-black text-primary-foreground hover:bg-primary/90">
                <Plus size={14} />
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Trash2 size={20} />
            </div>
            <h3 className="text-lg font-black text-foreground">Delete record?</h3>
            <p className="mt-2 text-[13px] font-medium leading-6 text-muted-foreground">
              Type <span className="font-mono font-black text-foreground">{deleteTarget._id}</span> to confirm. This writes an audit log entry.
            </p>
            <input value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} className="admin-input mt-5 h-12" placeholder="Record id" />
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="h-11 flex-1 rounded-xl border border-border text-[12px] font-black text-muted-foreground hover:bg-secondary">
                Cancel
              </button>
              <button type="button" onClick={deleteRecord} disabled={deleteConfirm !== deleteTarget._id} className="h-11 flex-1 rounded-xl bg-destructive text-[12px] font-black text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-50">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
