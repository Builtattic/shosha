import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: vi.fn(),
}));

import { setVote, addComment, addShare } from '@/lib/repos/reportInteractions';
import { adminDb } from '@/lib/firebase/admin';

// ---------------------------------------------------------------------------
// Firebase mock helpers
// ---------------------------------------------------------------------------

function makeSnapshot(value: unknown, exists = value !== null && value !== undefined) {
  return {
    exists: () => exists,
    val: () => value,
    forEach: vi.fn(),
    key: 'snap-key',
  };
}

/**
 * Creates a mock Firebase database reference that simulates the shape
 * used by setVote / addComment / addShare.
 *
 * @param reportData  The value stored at `reports/<reportId>`
 * @param voteData    The value stored at `reportVotes/<safeKey>` (null if absent)
 * @param txCommit    Whether the transaction commits successfully
 * @param txResult    The value the transaction callback computes (post-tx stats)
 */
function makeDbMock(opts: {
  reportData?: object | null;
  voteData?: object | null;
  txCommit?: boolean;
  txResultStats?: object;
  pushKey?: string;
} = {}) {
  const {
    reportData = { stats: { aligns: 5, opposes: 2, comments: 1, shares: 0 } },
    voteData = null,
    txCommit = true,
    txResultStats = { aligns: 5, opposes: 2, comments: 1, shares: 0 },
    pushKey = 'comment-key-1',
  } = opts;

  const mockPush = vi.fn().mockResolvedValue({ key: pushKey });
  const mockSet = vi.fn().mockResolvedValue(undefined);
  const mockRemove = vi.fn().mockResolvedValue(undefined);
  const mockUpdate = vi.fn().mockResolvedValue(undefined);
  const mockTransaction = vi.fn().mockImplementation(async (cb: (data: unknown) => unknown) => {
    const result = cb(txResultStats);
    return {
      committed: txCommit,
      snapshot: makeSnapshot(txCommit ? result : null),
    };
  });

  // Track refs by path
  const refs: Record<string, any> = {};

  function makeRef(path: string) {
    if (refs[path]) return refs[path];

    const ref: any = {
      path,
      once: vi.fn().mockImplementation(() => {
        if (path.startsWith('reports/') && !path.includes('stats')) {
          return Promise.resolve(makeSnapshot(reportData, reportData !== null));
        }
        if (path.startsWith('reportVotes/')) {
          return Promise.resolve(makeSnapshot(voteData, voteData !== null));
        }
        return Promise.resolve(makeSnapshot(null, false));
      }),
      transaction: mockTransaction,
      set: mockSet,
      remove: mockRemove,
      update: mockUpdate,
      child: vi.fn().mockImplementation((childPath: string) => makeRef(`${path}/${childPath}`)),
      push: mockPush,
    };

    refs[path] = ref;
    return ref;
  }

  const mockRef = vi.fn().mockImplementation((path: string) => makeRef(path));

  const db: any = {
    ref: mockRef,
    _refs: refs,
    _mocks: { mockSet, mockRemove, mockUpdate, mockTransaction, mockPush },
  };

  return db;
}

// ---------------------------------------------------------------------------
// setVote
// ---------------------------------------------------------------------------

describe('setVote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when the report does not exist', async () => {
    vi.mocked(adminDb).mockReturnValue(makeDbMock({ reportData: null }) as any);
    const result = await setVote('report-1', 'user-1', 'align');
    expect(result).toBeNull();
  });

  it('returns null when the transaction does not commit', async () => {
    vi.mocked(adminDb).mockReturnValue(makeDbMock({ txCommit: false }) as any);
    const result = await setVote('report-1', 'user-1', 'align');
    expect(result).toBeNull();
  });

  it('adds a new align vote and returns updated stats with vote="align"', async () => {
    const initialStats = { aligns: 5, opposes: 2, comments: 1, shares: 0 };
    vi.mocked(adminDb).mockReturnValue(
      makeDbMock({ reportData: { stats: initialStats }, voteData: null, txResultStats: { aligns: 6, opposes: 2, comments: 1, shares: 0 } }) as any
    );

    const result = await setVote('report-1', 'user-1', 'align');
    expect(result).not.toBeNull();
    expect(result!.vote).toBe('align');
    expect(result!.stats.aligns).toBe(6);
  });

  it('adds a new oppose vote and returns vote="oppose"', async () => {
    const initialStats = { aligns: 5, opposes: 2, comments: 1, shares: 0 };
    vi.mocked(adminDb).mockReturnValue(
      makeDbMock({ reportData: { stats: initialStats }, voteData: null, txResultStats: { aligns: 5, opposes: 3, comments: 1, shares: 0 } }) as any
    );

    const result = await setVote('report-1', 'user-1', 'oppose');
    expect(result).not.toBeNull();
    expect(result!.vote).toBe('oppose');
    expect(result!.stats.opposes).toBe(3);
  });

  it('toggles off an existing align vote (returns vote=null)', async () => {
    // User already voted align, voting align again should remove the vote
    vi.mocked(adminDb).mockReturnValue(
      makeDbMock({
        reportData: { stats: { aligns: 5, opposes: 2, comments: 1, shares: 0 } },
        voteData: { value: 'align' },
        txResultStats: { aligns: 4, opposes: 2, comments: 1, shares: 0 },
      }) as any
    );

    const result = await setVote('report-1', 'user-1', 'align');
    expect(result).not.toBeNull();
    expect(result!.vote).toBeNull();
    expect(result!.stats.aligns).toBe(4);
  });

  it('toggles off an existing oppose vote (returns vote=null)', async () => {
    vi.mocked(adminDb).mockReturnValue(
      makeDbMock({
        reportData: { stats: { aligns: 5, opposes: 2, comments: 1, shares: 0 } },
        voteData: { value: 'oppose' },
        txResultStats: { aligns: 5, opposes: 1, comments: 1, shares: 0 },
      }) as any
    );

    const result = await setVote('report-1', 'user-1', 'oppose');
    expect(result!.vote).toBeNull();
    expect(result!.stats.opposes).toBe(1);
  });

  it('switches from align to oppose', async () => {
    vi.mocked(adminDb).mockReturnValue(
      makeDbMock({
        reportData: { stats: { aligns: 5, opposes: 2, comments: 1, shares: 0 } },
        voteData: { value: 'align' },
        txResultStats: { aligns: 4, opposes: 3, comments: 1, shares: 0 },
      }) as any
    );

    const result = await setVote('report-1', 'user-1', 'oppose');
    expect(result!.vote).toBe('oppose');
    expect(result!.stats.aligns).toBe(4);
    expect(result!.stats.opposes).toBe(3);
  });

  it('transaction callback clamps stats to minimum 0', async () => {
    // Stats with 0 aligns — toggling off should not go negative
    vi.mocked(adminDb).mockReturnValue(
      makeDbMock({
        reportData: { stats: { aligns: 0, opposes: 0, comments: 0, shares: 0 } },
        voteData: { value: 'align' },
        txResultStats: { aligns: 0, opposes: 0, comments: 0, shares: 0 }, // Math.max(0, ...)
      }) as any
    );

    const result = await setVote('report-1', 'user-1', 'align');
    expect(result!.stats.aligns).toBeGreaterThanOrEqual(0);
  });

  it('sanitises non-finite stats to 0 (safeStats guard)', async () => {
    // Simulates a database with corrupted stats (NaN/Infinity)
    vi.mocked(adminDb).mockReturnValue(
      makeDbMock({
        reportData: { stats: { aligns: NaN, opposes: Infinity, comments: null, shares: undefined } },
        txResultStats: { aligns: 1, opposes: 0, comments: 0, shares: 0 },
      }) as any
    );

    const result = await setVote('report-1', 'user-1', 'align');
    expect(result).not.toBeNull();
    expect(result!.stats.aligns).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result!.stats.opposes)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// addComment
// ---------------------------------------------------------------------------

describe('addComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when the report does not exist', async () => {
    vi.mocked(adminDb).mockReturnValue(makeDbMock({ reportData: null }) as any);
    const result = await addComment('report-1', 'user-1', 'hello');
    expect(result).toBeNull();
  });

  it('returns null when the transaction does not commit', async () => {
    vi.mocked(adminDb).mockReturnValue(makeDbMock({ txCommit: false }) as any);
    const result = await addComment('report-1', 'user-1', 'hello');
    expect(result).toBeNull();
  });

  it('returns stats and commentId on success', async () => {
    vi.mocked(adminDb).mockReturnValue(
      makeDbMock({
        reportData: { stats: { aligns: 0, opposes: 0, comments: 2, shares: 0 } },
        txResultStats: { aligns: 0, opposes: 0, comments: 3, shares: 0 },
        pushKey: 'new-comment-id',
      }) as any
    );

    const result = await addComment('report-1', 'user-1', 'Great post!');
    expect(result).not.toBeNull();
    expect(result!.commentId).toBe('new-comment-id');
    expect(result!.stats.comments).toBe(3);
  });

  it('increments comments by 1 in the transaction', async () => {
    let capturedCallback: ((s: any) => any) | undefined;

    const db = makeDbMock({
      reportData: { stats: { aligns: 0, opposes: 0, comments: 5, shares: 0 } },
      txResultStats: { aligns: 0, opposes: 0, comments: 6, shares: 0 },
    }) as any;

    // Intercept the transaction to capture the callback
    const originalTx = db._mocks.mockTransaction;
    db._mocks.mockTransaction.mockImplementationOnce(async (cb: any) => {
      capturedCallback = cb;
      const result = cb({ aligns: 0, opposes: 0, comments: 5, shares: 0 });
      return { committed: true, snapshot: makeSnapshot(result) };
    });

    vi.mocked(adminDb).mockReturnValue(db);
    await addComment('report-1', 'user-1', 'A comment');

    expect(capturedCallback).toBeDefined();
    const stats = capturedCallback!({ aligns: 0, opposes: 0, comments: 5, shares: 0 });
    expect(stats.comments).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// addShare
// ---------------------------------------------------------------------------

describe('addShare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when the report does not exist', async () => {
    vi.mocked(adminDb).mockReturnValue(makeDbMock({ reportData: null }) as any);
    const result = await addShare('report-1');
    expect(result).toBeNull();
  });

  it('returns null when the transaction does not commit', async () => {
    vi.mocked(adminDb).mockReturnValue(makeDbMock({ txCommit: false }) as any);
    const result = await addShare('report-1');
    expect(result).toBeNull();
  });

  it('returns updated stats with incremented shares on success', async () => {
    vi.mocked(adminDb).mockReturnValue(
      makeDbMock({
        reportData: { stats: { aligns: 10, opposes: 1, comments: 2, shares: 4 } },
        txResultStats: { aligns: 10, opposes: 1, comments: 2, shares: 5 },
      }) as any
    );

    const result = await addShare('report-1');
    expect(result).not.toBeNull();
    expect(result!.stats.shares).toBe(5);
  });

  it('increments shares by 1 in the transaction callback', async () => {
    let capturedCallback: ((s: any) => any) | undefined;

    const db = makeDbMock({
      reportData: { stats: { aligns: 0, opposes: 0, comments: 0, shares: 3 } },
      txResultStats: { aligns: 0, opposes: 0, comments: 0, shares: 4 },
    }) as any;

    db._mocks.mockTransaction.mockImplementationOnce(async (cb: any) => {
      capturedCallback = cb;
      const result = cb({ aligns: 0, opposes: 0, comments: 0, shares: 3 });
      return { committed: true, snapshot: makeSnapshot(result) };
    });

    vi.mocked(adminDb).mockReturnValue(db);
    await addShare('report-1');

    expect(capturedCallback).toBeDefined();
    const stats = capturedCallback!({ aligns: 0, opposes: 0, comments: 0, shares: 3 });
    expect(stats.shares).toBe(4);
  });

  it('clamps shares to 0 minimum (Math.max guard)', async () => {
    let capturedCallback: ((s: any) => any) | undefined;

    const db = makeDbMock({
      reportData: { stats: { aligns: 0, opposes: 0, comments: 0, shares: 0 } },
      txResultStats: { aligns: 0, opposes: 0, comments: 0, shares: 1 },
    }) as any;

    db._mocks.mockTransaction.mockImplementationOnce(async (cb: any) => {
      capturedCallback = cb;
      const result = cb({ aligns: 0, opposes: 0, comments: 0, shares: 0 });
      return { committed: true, snapshot: makeSnapshot(result) };
    });

    vi.mocked(adminDb).mockReturnValue(db);
    await addShare('report-1');

    // Verify all fields have Math.max(0, ...) applied
    const stats = capturedCallback!({ aligns: -5, opposes: -3, comments: -1, shares: -2 });
    expect(stats.aligns).toBeGreaterThanOrEqual(0);
    expect(stats.opposes).toBeGreaterThanOrEqual(0);
    expect(stats.comments).toBeGreaterThanOrEqual(0);
    expect(stats.shares).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// safeStats – tested indirectly via transaction callbacks
// ---------------------------------------------------------------------------

describe('safeStats (via transaction callback behaviour)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('treats null stats as all-zero', async () => {
    let capturedCallback: ((s: any) => any) | undefined;

    const db = makeDbMock({
      reportData: { stats: null },
      txResultStats: { aligns: 0, opposes: 0, comments: 0, shares: 1 },
    }) as any;

    db._mocks.mockTransaction.mockImplementationOnce(async (cb: any) => {
      capturedCallback = cb;
      const result = cb(null);
      return { committed: true, snapshot: makeSnapshot(result) };
    });

    vi.mocked(adminDb).mockReturnValue(db);
    await addShare('report-1');

    const stats = capturedCallback!(null);
    expect(stats.aligns).toBe(0);
    expect(stats.opposes).toBe(0);
    expect(stats.comments).toBe(0);
    expect(stats.shares).toBeGreaterThanOrEqual(0); // shares += 1 from addShare
  });

  it('treats NaN stats values as 0', async () => {
    let capturedCallback: ((s: any) => any) | undefined;

    const db = makeDbMock({
      reportData: { stats: { aligns: NaN, opposes: NaN, comments: NaN, shares: NaN } },
      txResultStats: { aligns: 0, opposes: 0, comments: 0, shares: 1 },
    }) as any;

    db._mocks.mockTransaction.mockImplementationOnce(async (cb: any) => {
      capturedCallback = cb;
      const result = cb({ aligns: NaN, opposes: NaN, comments: NaN, shares: NaN });
      return { committed: true, snapshot: makeSnapshot(result) };
    });

    vi.mocked(adminDb).mockReturnValue(db);
    await addShare('report-1');

    const stats = capturedCallback!({ aligns: NaN, opposes: NaN, comments: NaN, shares: NaN });
    // safeStats converts NaN to 0, then Math.max(0, 0+1) = 1 for shares
    expect(Number.isFinite(stats.shares)).toBe(true);
    expect(Number.isFinite(stats.aligns)).toBe(true);
  });

  it('treats Infinity stats values as 0', async () => {
    let capturedCallback: ((s: any) => any) | undefined;

    const db = makeDbMock({
      txResultStats: { aligns: 0, opposes: 0, comments: 0, shares: 1 },
    }) as any;

    db._mocks.mockTransaction.mockImplementationOnce(async (cb: any) => {
      capturedCallback = cb;
      const result = cb({ aligns: Infinity, opposes: Infinity, comments: Infinity, shares: Infinity });
      return { committed: true, snapshot: makeSnapshot(result) };
    });

    vi.mocked(adminDb).mockReturnValue(db);
    await addShare('report-1');

    const stats = capturedCallback!({ aligns: Infinity, opposes: Infinity, comments: Infinity, shares: Infinity });
    expect(Number.isFinite(stats.aligns)).toBe(true);
    expect(Number.isFinite(stats.opposes)).toBe(true);
    expect(Number.isFinite(stats.comments)).toBe(true);
    expect(Number.isFinite(stats.shares)).toBe(true);
  });
});