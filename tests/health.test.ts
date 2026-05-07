import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock firebase admin before importing the route
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: vi.fn(),
}));

import { GET } from '@/app/api/health/route';
import { adminDb } from '@/lib/firebase/admin';

function makeDbMock(shouldThrow: boolean) {
  return {
    ref: vi.fn().mockReturnValue({
      set: shouldThrow
        ? vi.fn().mockRejectedValue(new Error('Firebase offline'))
        : vi.fn().mockResolvedValue(undefined),
    }),
  };
}

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with status "steady" when database write succeeds', async () => {
    vi.mocked(adminDb).mockReturnValue(makeDbMock(false) as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, data: { status: 'steady' } });
  });

  it('returns 503 (not 200) with status "database_offline" when database write fails', async () => {
    vi.mocked(adminDb).mockReturnValue(makeDbMock(true) as any);

    const res = await GET();
    // Key change in the PR: was 200, now 503
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, data: { status: 'database_offline' } });
  });

  it('does NOT return 200 when database is offline (regression guard)', async () => {
    vi.mocked(adminDb).mockReturnValue(makeDbMock(true) as any);

    const res = await GET();
    expect(res.status).not.toBe(200);
  });

  it('calls adminDb().ref("health/ping").set() with a numeric timestamp', async () => {
    const mockSet = vi.fn().mockResolvedValue(undefined);
    const mockRef = vi.fn().mockReturnValue({ set: mockSet });
    vi.mocked(adminDb).mockReturnValue({ ref: mockRef } as any);

    await GET();

    expect(mockRef).toHaveBeenCalledWith('health/ping');
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ ts: expect.any(Number) }));
  });
});