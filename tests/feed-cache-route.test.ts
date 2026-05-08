import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  getCurrentUserReadOnly: vi.fn(),
}));

vi.mock('@/lib/cache', () => ({
  cached: vi.fn(),
}));

vi.mock('@/lib/repos/reportInteractions', () => ({
  getViewerState: vi.fn(),
}));

vi.mock('@/lib/repos/accounts', () => ({
  findById: vi.fn(),
}));

vi.mock('@/lib/repos/reports', () => ({
  listPublicFeed: vi.fn(),
}));

vi.mock('@/lib/repos/siteSettings', () => ({
  get: vi.fn(),
  publicFeedStatuses: vi.fn(),
}));

vi.mock('@/lib/repos/users', () => ({
  findById: vi.fn(),
}));

import { GET } from '@/app/api/feed/route';
import { cached } from '@/lib/cache';
import { getCurrentUserReadOnly } from '@/lib/auth';
import * as interactionsRepo from '@/lib/repos/reportInteractions';

const baseFeed = {
  settings: {
    enabledPlatforms: ['x'],
    liveFeedEnabled: false,
  },
  liveNews: [],
  feed: [
    {
      _id: 'report-1',
      accountId: 'x_user',
      reporterId: 'author-1',
      publicAnonymous: false,
      type: 'positive',
      status: 'approved',
      description: 'Helpful',
      stats: { aligns: 1, opposes: 0, comments: 0, shares: 0 },
      createdAt: '2026-05-08T00:00:00.000Z',
      account: {
        _id: 'x_user',
        username: 'user',
        displayName: 'User',
        platform: 'x',
      },
      reporter: {
        _id: 'author-1',
        username: 'author',
      },
    },
  ],
};

describe('GET /api/feed cache behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cached).mockResolvedValue(baseFeed as any);
  });

  it('recomputes viewer state per request instead of sharing it through cached feed data', async () => {
    vi.mocked(getCurrentUserReadOnly)
      .mockResolvedValueOnce({ _id: 'viewer-1' } as any)
      .mockResolvedValueOnce({ _id: 'viewer-2' } as any);
    vi.mocked(interactionsRepo.getViewerState)
      .mockResolvedValueOnce({ vote: 'align', bookmarked: true } as any)
      .mockResolvedValueOnce({ vote: null, bookmarked: false } as any);

    const first = await GET(new Request('http://localhost/api/feed?filter=for_you'));
    const second = await GET(new Request('http://localhost/api/feed?filter=for_you'));

    const firstBody = await first.json();
    const secondBody = await second.json();
    expect(firstBody.data[0].viewer).toEqual({ vote: 'align', bookmarked: true });
    expect(secondBody.data[0].viewer).toEqual({ vote: null, bookmarked: false });
    expect(interactionsRepo.getViewerState).toHaveBeenNthCalledWith(1, 'report-1', 'viewer-1');
    expect(interactionsRepo.getViewerState).toHaveBeenNthCalledWith(2, 'report-1', 'viewer-2');
  });
});

