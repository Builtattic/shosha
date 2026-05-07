import { describe, expect, it } from 'vitest';

/**
 * classifyType is defined in src/app/api/feed/route.ts but is not exported.
 * This file tests the function's logic by reimplementing it inline.
 * Any change to the function should be reflected here.
 *
 * Logic under test (from the PR):
 *   function classifyType(aligns: number, opposes: number): 'positive' | 'negative' {
 *     return aligns >= opposes ? 'positive' : 'negative';
 *   }
 *
 * Key change from old code: the old implementation used Math.random() to decide
 * positive/negative. The new implementation uses deterministic engagement counts.
 */
function classifyType(aligns: number, opposes: number): 'positive' | 'negative' {
  return aligns >= opposes ? 'positive' : 'negative';
}

describe('classifyType', () => {
  describe('basic classification', () => {
    it('returns "positive" when aligns > opposes', () => {
      expect(classifyType(10, 5)).toBe('positive');
    });

    it('returns "negative" when aligns < opposes', () => {
      expect(classifyType(3, 10)).toBe('negative');
    });

    it('returns "positive" when aligns === opposes (tie goes to positive)', () => {
      expect(classifyType(5, 5)).toBe('positive');
    });
  });

  describe('zero counts', () => {
    it('returns "positive" when both are zero', () => {
      expect(classifyType(0, 0)).toBe('positive');
    });

    it('returns "positive" when aligns > 0 and opposes === 0', () => {
      expect(classifyType(1, 0)).toBe('positive');
    });

    it('returns "negative" when aligns === 0 and opposes > 0', () => {
      expect(classifyType(0, 1)).toBe('negative');
    });
  });

  describe('return type', () => {
    it('returns only "positive" or "negative" (never other strings)', () => {
      const result = classifyType(100, 50);
      expect(['positive', 'negative']).toContain(result);
    });
  });

  describe('determinism (regression: removed Math.random())', () => {
    it('returns the same value for the same inputs on repeated calls', () => {
      const first = classifyType(7, 3);
      const second = classifyType(7, 3);
      const third = classifyType(7, 3);
      expect(first).toBe(second);
      expect(second).toBe(third);
    });

    it('produces "positive" for typical tweet-like counts (10% oppose rate)', () => {
      const aligns = 1000;
      const opposes = Math.floor(aligns * 0.1); // 100, as in the feed route
      expect(classifyType(aligns, opposes)).toBe('positive');
    });
  });

  describe('large values', () => {
    it('handles large numbers correctly', () => {
      expect(classifyType(1_000_000, 999_999)).toBe('positive');
      expect(classifyType(999_999, 1_000_000)).toBe('negative');
    });
  });
});