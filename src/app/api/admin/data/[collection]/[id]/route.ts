import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin, isSuperAdmin } from '@/lib/auth';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import {
  adminDataRecordIdSchema,
  deleteAdminDataRecord,
  findAdminDataRecord,
  getAdminDataCollection,
  updateAdminDataRecord,
} from '@/lib/adminData';

export async function GET(_request: Request, { params }: { params: { collection: string; id: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can inspect data.', 403);

  const collection = getAdminDataCollection(params.collection);
  if (!collection) return fail('not_found', 'Unknown data collection.', 404);
  const id = adminDataRecordIdSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No record found for that id.', 404);

  const record = await findAdminDataRecord(collection, id.data);
  if (!record) return fail('not_found', 'No record found for that id.', 404);
  return ok(record);
}

export async function PATCH(request: Request, { params }: { params: { collection: string; id: string } }) {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) return fail('forbidden', 'Only super admins can edit Data Center records.', 403);

  const collection = getAdminDataCollection(params.collection);
  if (!collection) return fail('not_found', 'Unknown data collection.', 404);
  const id = adminDataRecordIdSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No record found for that id.', 404);

  const json = await request.json().catch(() => null);
  const before = await findAdminDataRecord(collection, id.data);
  if (!before) return fail('not_found', 'No record found for that id.', 404);

  try {
    const updated = await updateAdminDataRecord(collection, id.data, json?.value);
    if (!updated) return fail('not_found', 'No record found for that id.', 404);
    await adminActionsRepo.create({
      actor: user!,
      action: `data.${collection.id}.update`,
      entityType: collection.entityType,
      entityId: id.data,
      before: before.value,
      after: updated.value,
    });
    return ok(updated);
  } catch (error) {
    return fail('validation_error', error instanceof Error ? error.message : 'Invalid record payload.', 422);
  }
}

export async function DELETE(_request: Request, { params }: { params: { collection: string; id: string } }) {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) return fail('forbidden', 'Only super admins can delete Data Center records.', 403);

  const collection = getAdminDataCollection(params.collection);
  if (!collection) return fail('not_found', 'Unknown data collection.', 404);
  const id = adminDataRecordIdSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No record found for that id.', 404);

  try {
    const before = await deleteAdminDataRecord(collection, id.data);
    if (!before) return fail('not_found', 'No record found for that id.', 404);
    await adminActionsRepo.create({
      actor: user!,
      action: `data.${collection.id}.delete`,
      entityType: collection.entityType,
      entityId: id.data,
      before: before.value,
      after: null,
    });
    return ok({ deleted: id.data });
  } catch (error) {
    return fail('validation_error', error instanceof Error ? error.message : 'Record cannot be deleted.', 422);
  }
}
