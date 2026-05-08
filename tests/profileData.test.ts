import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/cache', () => ({
  cacheKey: (...parts: Array<string | number>) => parts.join(':'),
  cached: vi.fn((_key, _ttl, loader) => loader()),
}));

vi.mock('@/lib/repos/accounts', () => ({
  findById: vi.fn(),
  findBySlug: vi.fn(),
  findByUsername: vi.fn(),
  listAll: vi.fn(),
}));

vi.mock('@/lib/repos/reports', () => ({
  listForAccount: vi.fn(),
}));

vi.mock('@/lib/repos/users', () => ({
  findById: vi.fn(),
}));

import { getCachedProfileBundle } from '@/lib/profileData';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import * as usersRepo from '@/lib/repos/users';

describe('profileData cache bundle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps website profile bundle data public-safe and reporter summaries minimal', async () => {
    vi.mocked(accountsRepo.findById).mockResolvedValue({
      _id: 'website_ada',
      platform: 'website',
      username: 'ada',
      displayName: 'Ada',
      bio: 'Builder',
      avatarUrl: '',
      verified: true,
      followers: '10',
      score: 1200,
      scoreHistory: [{ t: '2026-05-01T00:00:00.000Z', s: 1200, cause: 'seed' }],
      breakdown: { authenticity: 50, engagement: 50, community: 50, content: 50, impact: 50 },
      posts: [],
      claimed: true,
      claimedBy: 'user-1',
      email: 'private@example.com',
      region: 'Private City',
      sourceUrl: 'https://private.example',
      socialLinks: { x: { url: 'https://x.com/private' } },
    } as any);
    vi.mocked(reportsRepo.listForAccount).mockResolvedValue([
      {
        _id: 'report-1',
        reporterId: 'reporter-1',
        publicAnonymous: false,
      },
    ] as any);
    vi.mocked(accountsRepo.listAll).mockResolvedValue([]);
    vi.mocked(usersRepo.findById).mockResolvedValue({
      _id: 'reporter-1',
      username: 'reporter',
      name: 'Reporter',
      photoUrl: 'https://example.com/avatar.png',
      role: 'user',
      email: 'reporter@example.com',
    } as any);

    const bundle = await getCachedProfileBundle('website_ada');

    expect(bundle?.account).not.toHaveProperty('email');
    expect(bundle?.account).not.toHaveProperty('region');
    expect(bundle?.account).not.toHaveProperty('sourceUrl');
    expect(bundle?.account).not.toHaveProperty('socialLinks');
    expect(bundle?.reporters[0]).toEqual({
      _id: 'reporter-1',
      username: 'reporter',
      name: 'Reporter',
      photoUrl: 'https://example.com/avatar.png',
      role: 'user',
    });
  });
});

