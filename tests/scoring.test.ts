import { describe, expect, it } from 'vitest';
import { applyImpact, averageBreakdown, type ScoredAccount } from '@/lib/scoring';

describe('applyImpact', () => {
  it('clamps score and appends history', () => {
    const account: ScoredAccount = {
      score: 98,
      breakdown: averageBreakdown(),
      scoreHistory: []
    };
    applyImpact(account, 10, 'report');
    expect(account.score).toBe(100);
    expect(account.scoreHistory).toHaveLength(1);
    expect(account.scoreHistory[0].cause).toBe('report');
  });

  it('weights matching category traits', () => {
    const account: ScoredAccount = {
      score: 60,
      breakdown: averageBreakdown(),
      scoreHistory: []
    };
    applyImpact(account, 10, 'report', ['community']);
    expect(account.breakdown.community).toBeGreaterThan(account.breakdown.content);
  });
});
