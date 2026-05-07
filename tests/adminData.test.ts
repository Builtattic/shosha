import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: vi.fn(),
}));

import {
  assertCollectionWritable,
  getAdminDataCollection,
  sanitizeEditableValue,
} from '@/lib/adminData';

describe('admin data registry', () => {
  it('registers expected collections with safety metadata', () => {
    const reports = getAdminDataCollection('reports');
    const actions = getAdminDataCollection('adminActions');

    expect(reports?.label).toBe('Reports');
    expect(reports?.lockedFields).toContain('status');
    expect(actions?.readOnly).toBe(true);
  });

  it('rejects writes to read-only collections', () => {
    const actions = getAdminDataCollection('adminActions');
    expect(actions).toBeTruthy();
    expect(() => assertCollectionWritable(actions!)).toThrow(/read-only/i);
  });

  it('blocks locked score fields in account edits', () => {
    const accounts = getAdminDataCollection('accounts');
    expect(accounts).toBeTruthy();

    expect(() =>
      sanitizeEditableValue(accounts!, { displayName: 'A', score: 1000 }, { displayName: 'A', score: 999 })
    ).toThrow(/score is locked/i);
  });

  it('normalizes account search fields and strips _id from editable JSON', () => {
    const accounts = getAdminDataCollection('accounts');
    const next = sanitizeEditableValue(
      accounts!,
      { displayName: 'Old', username: 'old', score: 1000 },
      { _id: 'accounts_1', displayName: 'New Name', username: 'NewUser', score: 1000 }
    );

    expect(next._id).toBeUndefined();
    expect(next.displayNameLower).toBe('new name');
    expect(next.usernameLower).toBe('newuser');
    expect(next.updatedAt).toEqual(expect.any(String));
  });

  it('keeps report status changes behind the review workflow', () => {
    const reports = getAdminDataCollection('reports');
    expect(() =>
      sanitizeEditableValue(reports!, { status: 'pending_ai', description: 'Existing report' }, { status: 'approved', description: 'Existing report' })
    ).toThrow(/status is locked/i);
  });
});
