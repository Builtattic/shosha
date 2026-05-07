import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin, isSuperAdmin } from '@/lib/auth';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import {
  adminDataRecordIdSchema,
  createAdminDataRecord,
  getAdminDataCollection,
  listAdminDataRecords,
} from '@/lib/adminData';

function parseLimit(url: string) {
  const value = Number(new URL(url).searchParams.get('limit') ?? 100);
  return Number.isFinite(value) ? value : 100;
}

export async function GET(request: Request, { params }: { params: { collection: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can inspect data.', 403);

  const collection = getAdminDataCollection(params.collection);
  if (!collection) return fail('not_found', 'Unknown data collection.', 404);

  const url = new URL(request.url);
  const result = await listAdminDataRecords(collection, {
    q: url.searchParams.get('q') ?? '',
    limit: parseLimit(request.url),
  });

  return ok({
    collection: {
      id: collection.id,
      label: collection.label,
      description: collection.description,
      readOnly: Boolean(collection.readOnly),
      createEnabled: Boolean(collection.createEnabled && !collection.readOnly),
      deleteEnabled: Boolean(collection.deleteEnabled && !collection.readOnly),
      columns: collection.columns,
      lockedFields: collection.lockedFields ?? [],
    },
    canWrite: isSuperAdmin(user),
    ...result,
  });
}

export async function POST(request: Request, { params }: { params: { collection: string } }) {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) return fail('forbidden', 'Only super admins can create Data Center records.', 403);

  const collection = getAdminDataCollection(params.collection);
  if (!collection) return fail('not_found', 'Unknown data collection.', 404);

  const json = await request.json().catch(() => null);
  const id = typeof json?.id === 'string' && json.id.trim() ? json.id.trim() : null;
  if (id) {
    const parsedId = adminDataRecordIdSchema.safeParse(id);
    if (!parsedId.success) return fail('validation_error', parsedId.error.errors[0]?.message ?? 'Invalid id.', 422);
  }

  try {
    const created = await createAdminDataRecord(collection, id, json?.value);
    if (!created) return fail('create_failed', 'Record could not be created.', 500);
    await adminActionsRepo.create({
      actor: user!,
      action: `data.${collection.id}.create`,
      entityType: collection.entityType,
      entityId: created._id,
      before: null,
      after: created.value,
    });
    return ok(created, 201);
  } catch (error) {
    return fail('validation_error', error instanceof Error ? error.message : 'Invalid record payload.', 422);
  }
}
