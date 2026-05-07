import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
  isAdmin: vi.fn(),
}));

vi.mock('@/lib/repos/accounts', () => ({
  findById: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/repos/users', () => ({
  findById: vi.fn(),
  findByUsername: vi.fn(),
}));

vi.mock('@/lib/profilePrivacy', () => ({
  canViewProfileField: vi.fn().mockReturnValue(true),
}));

import { PATCH } from '@/app/api/accounts/[id]/route';
import * as auth from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';

const mockUser = { _id: 'user-123', role: 'user' };
const mockAdmin = { _id: 'admin-1', role: 'admin' };
const mockAccount = { _id: 'account-abc', claimedBy: 'user-123', platform: 'x', username: 'testuser' };

function makePatchRequest(body: object, id = 'account-abc'): [Request, { params: { id: string } }] {
  const req = new Request('http://localhost/api/accounts/account-abc', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return [req, { params: { id } }];
}

describe('PATCH /api/accounts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      vi.mocked(auth.requireUser).mockRejectedValue(new Error('unauthorized'));

      const [req, ctx] = makePatchRequest({ displayName: 'New Name' });
      const res = await PATCH(req, ctx);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('unauthorized');
    });
  });

  describe('account not found', () => {
    it('returns 404 for invalid account id format', async () => {
      vi.mocked(auth.requireUser).mockResolvedValue(mockUser as any);
      vi.mocked(auth.isAdmin).mockReturnValue(false);

      // Use a clearly invalid id (not a valid format per idSchema)
      const req = new Request('http://localhost/api/accounts/!!invalid', {
        method: 'PATCH',
        body: JSON.stringify({ displayName: 'X' }),
      });
      const res = await PATCH(req, { params: { id: '' } });
      expect(res.status).toBe(404);
    });

    it('returns 404 when account does not exist in the database', async () => {
      vi.mocked(auth.requireUser).mockResolvedValue(mockUser as any);
      vi.mocked(auth.isAdmin).mockReturnValue(false);
      vi.mocked(accountsRepo.findById).mockResolvedValue(null);

      const [req, ctx] = makePatchRequest({ displayName: 'New Name' });
      const res = await PATCH(req, ctx);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe('not_found');
    });
  });

  describe('authorization (new in PR)', () => {
    it('returns 403 when user does not own the account and is not admin', async () => {
      const otherUserAccount = { ...mockAccount, claimedBy: 'different-user-999' };
      vi.mocked(auth.requireUser).mockResolvedValue(mockUser as any);
      vi.mocked(auth.isAdmin).mockReturnValue(false);
      vi.mocked(accountsRepo.findById).mockResolvedValue(otherUserAccount as any);

      const [req, ctx] = makePatchRequest({ displayName: 'Hijacked Name' });
      const res = await PATCH(req, ctx);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe('forbidden');
      expect(body.error.message).toContain('permission');
    });

    it('returns 403 when account is unclaimed and user is not admin', async () => {
      const unclaimedAccount = { ...mockAccount, claimedBy: undefined };
      vi.mocked(auth.requireUser).mockResolvedValue(mockUser as any);
      vi.mocked(auth.isAdmin).mockReturnValue(false);
      vi.mocked(accountsRepo.findById).mockResolvedValue(unclaimedAccount as any);

      const [req, ctx] = makePatchRequest({ displayName: 'New Name' });
      const res = await PATCH(req, ctx);
      expect(res.status).toBe(403);
    });

    it('allows account owner to edit their own account', async () => {
      vi.mocked(auth.requireUser).mockResolvedValue(mockUser as any);
      vi.mocked(auth.isAdmin).mockReturnValue(false);
      vi.mocked(accountsRepo.findById).mockResolvedValue(mockAccount as any);
      vi.mocked(accountsRepo.update).mockResolvedValue({ ...mockAccount, displayName: 'New Name' } as any);

      const [req, ctx] = makePatchRequest({ displayName: 'New Name' });
      const res = await PATCH(req, ctx);
      expect(res.status).toBe(200);
    });

    it('allows admin to edit any account (regardless of ownership)', async () => {
      const otherUserAccount = { ...mockAccount, claimedBy: 'different-user-999' };
      vi.mocked(auth.requireUser).mockResolvedValue(mockAdmin as any);
      vi.mocked(auth.isAdmin).mockReturnValue(true); // admin
      vi.mocked(accountsRepo.findById).mockResolvedValue(otherUserAccount as any);
      vi.mocked(accountsRepo.update).mockResolvedValue({ ...otherUserAccount, displayName: 'Admin Override' } as any);

      const [req, ctx] = makePatchRequest({ displayName: 'Admin Override' });
      const res = await PATCH(req, ctx);
      expect(res.status).toBe(200);
    });

    it('passes the authenticated user to isAdmin for role check', async () => {
      vi.mocked(auth.requireUser).mockResolvedValue(mockUser as any);
      vi.mocked(auth.isAdmin).mockReturnValue(false);
      vi.mocked(accountsRepo.findById).mockResolvedValue({ ...mockAccount, claimedBy: 'other' } as any);

      const [req, ctx] = makePatchRequest({ displayName: 'X' });
      await PATCH(req, ctx);

      // isAdmin must be called with the authenticated user
      expect(auth.isAdmin).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('validation', () => {
    it('returns 422/400 for invalid patch body', async () => {
      vi.mocked(auth.requireUser).mockResolvedValue(mockUser as any);
      vi.mocked(auth.isAdmin).mockReturnValue(false);
      vi.mocked(accountsRepo.findById).mockResolvedValue(mockAccount as any);

      const req = new Request('http://localhost/api/accounts/account-abc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json{{{',
      });
      const res = await PATCH(req, { params: { id: 'account-abc' } });
      // fromZod returns a validation error (typically 422)
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('successful update', () => {
    it('returns 200 with the updated account on success', async () => {
      const updatedAccount = { ...mockAccount, displayName: 'Updated Name' };
      vi.mocked(auth.requireUser).mockResolvedValue(mockUser as any);
      vi.mocked(auth.isAdmin).mockReturnValue(false);
      vi.mocked(accountsRepo.findById).mockResolvedValue(mockAccount as any);
      vi.mocked(accountsRepo.update).mockResolvedValue(updatedAccount as any);

      const [req, ctx] = makePatchRequest({ displayName: 'Updated Name' });
      const res = await PATCH(req, ctx);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.displayName).toBe('Updated Name');
    });

    it('returns 404 when update() returns null (account disappeared)', async () => {
      vi.mocked(auth.requireUser).mockResolvedValue(mockUser as any);
      vi.mocked(auth.isAdmin).mockReturnValue(false);
      vi.mocked(accountsRepo.findById).mockResolvedValue(mockAccount as any);
      vi.mocked(accountsRepo.update).mockResolvedValue(null);

      const [req, ctx] = makePatchRequest({ displayName: 'X' });
      const res = await PATCH(req, ctx);
      expect(res.status).toBe(404);
    });
  });
});