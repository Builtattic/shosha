import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import type { AdminEntityType } from '@/lib/repos/adminActions';

export type AdminDataColumn = {
  key: string;
  label: string;
};

export type AdminDataCollection = {
  id: string;
  label: string;
  path: string;
  description: string;
  readOnly?: boolean;
  createEnabled?: boolean;
  deleteEnabled?: boolean;
  updatedAtFields: string[];
  searchableFields: string[];
  columns: AdminDataColumn[];
  lockedFields?: string[];
  entityType: AdminEntityType;
};

export type AdminDataRecord = {
  _id: string;
  value: unknown;
  updatedAt: string | null;
  summary: Record<string, string>;
};

const baseColumns: AdminDataColumn[] = [
  { key: '_id', label: 'ID' },
  { key: 'updatedAt', label: 'Updated' },
];

export const ADMIN_DATA_COLLECTIONS: readonly AdminDataCollection[] = [
  {
    id: 'accounts',
    label: 'Accounts',
    path: 'accounts',
    description: 'Tracked social and website dossiers.',
    createEnabled: false,
    deleteEnabled: true,
    updatedAtFields: ['updatedAt', 'createdAt'],
    searchableFields: ['displayName', 'username', 'profileId', 'platform', 'email'],
    columns: [
      { key: 'displayName', label: 'Name' },
      { key: 'platform', label: 'Platform' },
      { key: 'username', label: 'Handle' },
      { key: 'score', label: 'Score' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    lockedFields: ['score', 'displayScore', 'globalScore', 'windowScores', 'scoreHistory', 'breakdown'],
    entityType: 'account',
  },
  {
    id: 'users',
    label: 'Users',
    path: 'users',
    description: 'Registered Firebase users and profile settings.',
    createEnabled: false,
    deleteEnabled: true,
    updatedAtFields: ['updatedAt', 'createdAt'],
    searchableFields: ['username', 'email', 'name', 'role'],
    columns: [
      { key: 'username', label: 'Username' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'reporterScore', label: 'Reporter' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    lockedFields: ['score', 'scoreHistory', 'weeklyStats'],
    entityType: 'user',
  },
  {
    id: 'reports',
    label: 'Reports',
    path: 'reports',
    description: 'Filings, AI verdicts, visibility, and interaction counts.',
    createEnabled: false,
    deleteEnabled: true,
    updatedAtFields: ['updatedAt', 'createdAt'],
    searchableFields: ['accountId', 'reporterId', 'description', 'feelings', 'status', 'type'],
    columns: [
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'accountId', label: 'Account' },
      { key: 'reporterId', label: 'Reporter' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    lockedFields: ['status', 'reportScore', 'ledgerEntryId', 'eventId', 'adminDecision'],
    entityType: 'report',
  },
  {
    id: 'events',
    label: 'Events',
    path: 'events',
    description: 'Scoring events produced by report decisions.',
    readOnly: true,
    updatedAtFields: ['timestamp', 'createdAt'],
    searchableFields: ['subjectId', 'reporterId', 'description', 'status', 'eventType'],
    columns: [
      { key: 'eventType', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'subjectId', label: 'Subject' },
      { key: 'delta', label: 'Delta' },
      { key: 'timestamp', label: 'When' },
    ],
    entityType: 'score',
  },
  {
    id: 'ledgerEntries',
    label: 'Ledger Entries',
    path: 'ledgerEntries',
    description: 'Canonical score ledger. Inspect only; use replay workflows to change scores.',
    readOnly: true,
    updatedAtFields: ['timestamp', 'createdAt'],
    searchableFields: ['profileId', 'reportId', 'category', 'deed'],
    columns: [
      { key: 'profileId', label: 'Profile' },
      { key: 'reportId', label: 'Report' },
      { key: 'delta', label: 'Delta' },
      { key: 'timestamp', label: 'When' },
    ],
    entityType: 'score',
  },
  {
    id: 'reportMetadata',
    label: 'Report Metadata',
    path: 'reportMetadata',
    description: 'Workbook multipliers and metadata attached to reports.',
    createEnabled: true,
    deleteEnabled: true,
    updatedAtFields: ['updatedAt', 'createdAt'],
    searchableFields: ['reportId', 'profileId'],
    columns: [
      { key: 'reportId', label: 'Report' },
      { key: 'profileId', label: 'Profile' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    entityType: 'data',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: 'notifications',
    description: 'Per-user notification buckets.',
    readOnly: true,
    updatedAtFields: ['updatedAt', 'createdAt'],
    searchableFields: ['_id'],
    columns: baseColumns,
    entityType: 'data',
  },
  {
    id: 'disputes',
    label: 'Disputes',
    path: 'disputes',
    description: 'User disputes and resolution records.',
    createEnabled: true,
    deleteEnabled: true,
    updatedAtFields: ['updatedAt', 'createdAt'],
    searchableFields: ['userId', 'accountId', 'reportId', 'status', 'reason'],
    columns: [
      { key: 'status', label: 'Status' },
      { key: 'userId', label: 'User' },
      { key: 'reportId', label: 'Report' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    entityType: 'dispute',
  },
  {
    id: 'claimRequests',
    label: 'Claim Requests',
    path: 'claimRequests',
    description: 'Profile ownership requests.',
    createEnabled: true,
    deleteEnabled: true,
    updatedAtFields: ['updatedAt', 'createdAt'],
    searchableFields: ['userId', 'accountId', 'status', 'proofType'],
    columns: [
      { key: 'status', label: 'Status' },
      { key: 'userId', label: 'User' },
      { key: 'accountId', label: 'Account' },
      { key: 'createdAt', label: 'Created' },
    ],
    entityType: 'claim',
  },
  {
    id: 'auditRequests',
    label: 'Audit Requests',
    path: 'auditRequests',
    description: 'Dossier audit requests.',
    createEnabled: true,
    deleteEnabled: true,
    updatedAtFields: ['updatedAt', 'createdAt'],
    searchableFields: ['userId', 'accountId', 'status', 'reason'],
    columns: [
      { key: 'status', label: 'Status' },
      { key: 'userId', label: 'User' },
      { key: 'accountId', label: 'Account' },
      { key: 'createdAt', label: 'Created' },
    ],
    entityType: 'audit',
  },
  {
    id: 'evidenceProposals',
    label: 'Evidence Proposals',
    path: 'evidenceProposals',
    description: 'AI/admin evidence suggestions awaiting review.',
    createEnabled: true,
    deleteEnabled: true,
    updatedAtFields: ['updatedAt', 'createdAt'],
    searchableFields: ['accountId', 'title', 'summary', 'status', 'scoringDeed'],
    columns: [
      { key: 'status', label: 'Status' },
      { key: 'title', label: 'Title' },
      { key: 'accountId', label: 'Account' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    entityType: 'evidence',
  },
  {
    id: 'moderationRequests',
    label: 'Moderation Requests',
    path: 'moderationRequests',
    description: 'Requests to moderate or revisit reports.',
    createEnabled: true,
    deleteEnabled: true,
    updatedAtFields: ['updatedAt', 'createdAt'],
    searchableFields: ['reportId', 'accountId', 'requestedBy', 'status', 'reason'],
    columns: [
      { key: 'status', label: 'Status' },
      { key: 'reportId', label: 'Report' },
      { key: 'requestedBy', label: 'Requested By' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    entityType: 'moderationRequest',
  },
  {
    id: 'reportVotes',
    label: 'Report Votes',
    path: 'reportVotes',
    description: 'Align/oppose state by report and user.',
    createEnabled: true,
    deleteEnabled: true,
    updatedAtFields: ['updatedAt', 'createdAt'],
    searchableFields: ['reportId', 'userId', 'value'],
    columns: [
      { key: 'value', label: 'Vote' },
      { key: 'reportId', label: 'Report' },
      { key: 'userId', label: 'User' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    entityType: 'data',
  },
  {
    id: 'reportComments',
    label: 'Report Comments',
    path: 'reportComments',
    description: 'Comments attached to reports.',
    createEnabled: true,
    deleteEnabled: true,
    updatedAtFields: ['createdAt'],
    searchableFields: ['reportId', 'userId', 'text'],
    columns: [
      { key: 'reportId', label: 'Report' },
      { key: 'userId', label: 'User' },
      { key: 'text', label: 'Text' },
      { key: 'createdAt', label: 'Created' },
    ],
    entityType: 'data',
  },
  {
    id: 'reportBookmarks',
    label: 'Report Bookmarks',
    path: 'reportBookmarks',
    description: 'Saved reports by user.',
    createEnabled: true,
    deleteEnabled: true,
    updatedAtFields: ['createdAt'],
    searchableFields: ['reportId', 'userId'],
    columns: [
      { key: 'reportId', label: 'Report' },
      { key: 'userId', label: 'User' },
      { key: 'createdAt', label: 'Created' },
    ],
    entityType: 'data',
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    path: 'subscriptions',
    description: 'Free/pro subscription state and daily limits.',
    createEnabled: true,
    deleteEnabled: true,
    updatedAtFields: ['updatedAt', 'dailyReportsResetAt', 'createdAt'],
    searchableFields: ['userId', 'tier'],
    columns: [
      { key: 'tier', label: 'Tier' },
      { key: 'userId', label: 'User' },
      { key: 'dailyReportsUsed', label: 'Daily Used' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    entityType: 'data',
  },
  {
    id: 'siteSettings',
    label: 'Site Settings',
    path: 'siteSettings',
    description: 'Runtime settings. Prefer the Settings page for common changes.',
    createEnabled: false,
    deleteEnabled: false,
    updatedAtFields: ['updatedAt'],
    searchableFields: ['_id'],
    columns: [
      { key: '_id', label: 'ID' },
      { key: 'feedRankingMode', label: 'Feed Mode' },
      { key: 'liveFeedEnabled', label: 'Live Feed' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    entityType: 'settings',
  },
  {
    id: 'adminActions',
    label: 'Admin Actions',
    path: 'adminActions',
    description: 'Audit trail for privileged changes. Inspect only.',
    readOnly: true,
    updatedAtFields: ['createdAt'],
    searchableFields: ['actorUsername', 'action', 'entityType', 'entityId'],
    columns: [
      { key: 'actorUsername', label: 'Actor' },
      { key: 'action', label: 'Action' },
      { key: 'entityType', label: 'Entity' },
      { key: 'createdAt', label: 'Created' },
    ],
    entityType: 'data',
  },
] as const;

export const adminDataCollectionIds = ADMIN_DATA_COLLECTIONS.map((collection) => collection.id);
export const adminDataCollectionIdSchema = z.enum(adminDataCollectionIds as [string, ...string[]]);
export const adminDataRecordIdSchema = z.string().min(1).max(240).refine((value) => !/[.#$/[\]]/.test(value), {
  message: 'Record id cannot contain Firebase path separators or reserved key characters.',
});

export function getAdminDataCollection(id: string): AdminDataCollection | null {
  return ADMIN_DATA_COLLECTIONS.find((collection) => collection.id === id) ?? null;
}

export function assertCollectionWritable(collection: AdminDataCollection) {
  if (collection.readOnly) {
    throw new Error(`${collection.label} is read-only in Data Center.`);
  }
}

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
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function recordUpdatedAt(collection: AdminDataCollection, value: unknown): string | null {
  for (const field of collection.updatedAtFields) {
    const found = getValueAtPath(value, field);
    if (typeof found === 'string' && found) return found;
  }
  return null;
}

function summarize(collection: AdminDataCollection, id: string, value: unknown): Record<string, string> {
  const valueWithId = isRecord(value) ? { _id: id, ...value } : { _id: id, value };
  return Object.fromEntries(
    collection.columns.map((column) => {
      const raw = column.key === 'updatedAt' ? recordUpdatedAt(collection, valueWithId) : getValueAtPath(valueWithId, column.key);
      return [column.key, displayValue(raw).slice(0, 160)];
    })
  );
}

function recordMatches(collection: AdminDataCollection, id: string, value: unknown, query: string) {
  const cleaned = query.trim().toLowerCase();
  if (!cleaned) return true;
  const valueWithId = isRecord(value) ? { _id: id, ...value } : { _id: id, value };
  const fieldText = collection.searchableFields
    .map((field) => displayValue(getValueAtPath(valueWithId, field)))
    .join(' ')
    .toLowerCase();
  if (fieldText.includes(cleaned)) return true;
  return JSON.stringify(valueWithId).toLowerCase().includes(cleaned);
}

export async function listAdminDataCollections() {
  const summaries = await Promise.all(
    ADMIN_DATA_COLLECTIONS.map(async (collection) => {
      const snap = await adminDb().ref(collection.path).once('value');
      let latest: string | null = null;
      snap.forEach((child) => {
        const updated = recordUpdatedAt(collection, { _id: child.key, ...(child.val() ?? {}) });
        if (updated && (!latest || updated > latest)) latest = updated;
      });
      return {
        id: collection.id,
        label: collection.label,
        description: collection.description,
        count: snap.numChildren(),
        latest,
        readOnly: Boolean(collection.readOnly),
        createEnabled: Boolean(collection.createEnabled && !collection.readOnly),
        deleteEnabled: Boolean(collection.deleteEnabled && !collection.readOnly),
      };
    })
  );
  return summaries;
}

export async function listAdminDataRecords(collection: AdminDataCollection, options: { q?: string; limit?: number } = {}) {
  const limit = Math.max(1, Math.min(options.limit ?? 100, 500));
  const snap = await adminDb().ref(collection.path).once('value');
  const records: AdminDataRecord[] = [];
  snap.forEach((child) => {
    const id = child.key!;
    const value = child.val();
    if (!recordMatches(collection, id, value, options.q ?? '')) return;
    records.push({
      _id: id,
      value,
      updatedAt: recordUpdatedAt(collection, { _id: id, ...(isRecord(value) ? value : { value }) }),
      summary: summarize(collection, id, value),
    });
  });
  records.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  return { total: snap.numChildren(), matched: records.length, records: records.slice(0, limit) };
}

export async function findAdminDataRecord(collection: AdminDataCollection, id: string) {
  const snap = await adminDb().ref(collection.path).child(id).once('value');
  if (!snap.exists()) return null;
  const value = snap.val();
  return {
    _id: id,
    value,
    updatedAt: recordUpdatedAt(collection, { _id: id, ...(isRecord(value) ? value : { value }) }),
    summary: summarize(collection, id, value),
  } satisfies AdminDataRecord;
}

export function sanitizeEditableValue(collection: AdminDataCollection, before: unknown, next: unknown) {
  assertCollectionWritable(collection);
  if (!isRecord(next)) throw new Error('Record JSON must be an object.');
  const clean: Record<string, unknown> = { ...next };
  delete clean._id;

  for (const field of collection.lockedFields ?? []) {
    const beforeValue = getValueAtPath(before, field);
    const nextValue = getValueAtPath(clean, field);
    if (JSON.stringify(beforeValue ?? null) !== JSON.stringify(nextValue ?? null)) {
      throw new Error(`${field} is locked in Data Center. Use the dedicated workflow for this change.`);
    }
  }

  if (collection.id === 'accounts' && typeof clean.username === 'string') {
    clean.usernameLower = clean.username.toLowerCase();
  }
  if (collection.id === 'accounts' && typeof clean.displayName === 'string') {
    clean.displayNameLower = clean.displayName.toLowerCase();
  }
  if (collection.id !== 'reportComments' && collection.id !== 'reportBookmarks') {
    clean.updatedAt = new Date().toISOString();
  }
  return clean;
}

export async function createAdminDataRecord(collection: AdminDataCollection, id: string | null, value: unknown) {
  assertCollectionWritable(collection);
  if (!collection.createEnabled) throw new Error(`${collection.label} does not allow record creation from Data Center.`);
  const clean = sanitizeEditableValue(collection, {}, value);
  const ref = id ? adminDb().ref(collection.path).child(id) : adminDb().ref(collection.path).push();
  if (id) {
    const existing = await ref.once('value');
    if (existing.exists()) throw new Error('A record with that id already exists.');
  }
  await ref.set(clean);
  return findAdminDataRecord(collection, ref.key!);
}

export async function updateAdminDataRecord(collection: AdminDataCollection, id: string, value: unknown) {
  const before = await findAdminDataRecord(collection, id);
  if (!before) return null;
  const clean = sanitizeEditableValue(collection, before.value, value);
  await adminDb().ref(collection.path).child(id).set(clean);
  return findAdminDataRecord(collection, id);
}

export async function deleteAdminDataRecord(collection: AdminDataCollection, id: string) {
  assertCollectionWritable(collection);
  if (!collection.deleteEnabled) throw new Error(`${collection.label} does not allow deletion from Data Center.`);
  const before = await findAdminDataRecord(collection, id);
  if (!before) return null;
  await adminDb().ref(collection.path).child(id).remove();
  return before;
}
