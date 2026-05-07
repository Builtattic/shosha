import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  isAdmin: vi.fn(),
  isSuperAdmin: vi.fn(),
}));

vi.mock('@/lib/repos/adminActions', () => ({
  create: vi.fn(),
}));

vi.mock('@/lib/adminData', async () => {
  const { z } = await import('zod');
  return {
    adminDataRecordIdSchema: z.string().min(1),
    getAdminDataCollection: vi.fn(),
    listAdminDataRecords: vi.fn(),
    findAdminDataRecord: vi.fn(),
    updateAdminDataRecord: vi.fn(),
    deleteAdminDataRecord: vi.fn(),
    createAdminDataRecord: vi.fn(),
  };
});

import * as auth from '@/lib/auth';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as adminData from '@/lib/adminData';
import { GET as getCollection, POST } from '@/app/api/admin/data/[collection]/route';
import { DELETE, PATCH } from '@/app/api/admin/data/[collection]/[id]/route';

const adminUser = {
  _id: 'admin_1',
  username: 'admin',
  email: 'admin@example.com',
  role: 'admin',
  reporterScore: 50,
  claimedAccounts: [],
};

const reportsCollection = {
  id: 'reports',
  label: 'Reports',
  path: 'reports',
  description: 'Reports',
  readOnly: false,
  createEnabled: false,
  deleteEnabled: true,
  updatedAtFields: ['updatedAt'],
  searchableFields: ['status'],
  columns: [{ key: '_id', label: 'ID' }],
  lockedFields: ['status'],
  entityType: 'report' as const,
};

describe('admin data API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.getCurrentUser).mockResolvedValue(adminUser as any);
    vi.mocked(auth.isAdmin).mockReturnValue(true);
    vi.mocked(auth.isSuperAdmin).mockReturnValue(true);
    vi.mocked(adminData.getAdminDataCollection).mockReturnValue(reportsCollection as any);
  });

  it('forbids collection reads for non-admin users', async () => {
    vi.mocked(auth.isAdmin).mockReturnValue(false);

    const response = await getCollection(new Request('http://localhost/api/admin/data/reports'), {
      params: { collection: 'reports' },
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.ok).toBe(false);
  });

  it('returns records for admin users', async () => {
    vi.mocked(adminData.listAdminDataRecords).mockResolvedValue({
      total: 1,
      matched: 1,
      records: [{ _id: 'r1', value: { status: 'approved' }, updatedAt: null, summary: { _id: 'r1' } }],
    });

    const response = await getCollection(new Request('http://localhost/api/admin/data/reports?q=approved&limit=50'), {
      params: { collection: 'reports' },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.records).toHaveLength(1);
    expect(adminData.listAdminDataRecords).toHaveBeenCalledWith(reportsCollection, { q: 'approved', limit: 50 });
  });

  it('forbids writes for non-super admins', async () => {
    vi.mocked(auth.isSuperAdmin).mockReturnValue(false);

    const response = await POST(
      new Request('http://localhost/api/admin/data/reports', {
        method: 'POST',
        body: JSON.stringify({ value: { description: 'test' } }),
      }),
      { params: { collection: 'reports' } }
    );

    expect(response.status).toBe(403);
  });

  it('updates records and writes an audit action', async () => {
    vi.mocked(adminData.findAdminDataRecord).mockResolvedValue({
      _id: 'r1',
      value: { status: 'approved', description: 'before' },
      updatedAt: null,
      summary: {},
    });
    vi.mocked(adminData.updateAdminDataRecord).mockResolvedValue({
      _id: 'r1',
      value: { status: 'approved', description: 'after' },
      updatedAt: null,
      summary: {},
    });

    const response = await PATCH(
      new Request('http://localhost/api/admin/data/reports/r1', {
        method: 'PATCH',
        body: JSON.stringify({ value: { status: 'approved', description: 'after' } }),
      }),
      { params: { collection: 'reports', id: 'r1' } }
    );

    expect(response.status).toBe(200);
    expect(adminActionsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'data.reports.update',
        entityType: 'report',
        entityId: 'r1',
      })
    );
  });

  it('returns validation errors without audit logging failed updates', async () => {
    vi.mocked(adminData.findAdminDataRecord).mockResolvedValue({
      _id: 'r1',
      value: { status: 'pending_ai' },
      updatedAt: null,
      summary: {},
    });
    vi.mocked(adminData.updateAdminDataRecord).mockRejectedValue(new Error('status is locked'));

    const response = await PATCH(
      new Request('http://localhost/api/admin/data/reports/r1', {
        method: 'PATCH',
        body: JSON.stringify({ value: { status: 'approved' } }),
      }),
      { params: { collection: 'reports', id: 'r1' } }
    );

    expect(response.status).toBe(422);
    expect(adminActionsRepo.create).not.toHaveBeenCalled();
  });

  it('deletes records and writes an audit action', async () => {
    vi.mocked(adminData.deleteAdminDataRecord).mockResolvedValue({
      _id: 'r1',
      value: { status: 'approved' },
      updatedAt: null,
      summary: {},
    });

    const response = await DELETE(new Request('http://localhost/api/admin/data/reports/r1', { method: 'DELETE' }), {
      params: { collection: 'reports', id: 'r1' },
    });

    expect(response.status).toBe(200);
    expect(adminActionsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'data.reports.delete',
        entityType: 'report',
        entityId: 'r1',
        after: null,
      })
    );
  });
});
