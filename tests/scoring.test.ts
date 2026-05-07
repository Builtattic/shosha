import { describe, expect, it } from 'vitest';
import {
  applyImpact,
  averageBreakdown,
  calcDelta,
  calcMultiplierQuotient,
  calcProfileCredibility,
  calcSheetScoreTracker,
  resolveSheetBaseImpact,
  sheetDecay,
  type EventMultipliers,
  type ScoredAccount,
} from '@/lib/scoring';

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

describe('sheet-first scoring', () => {
  const sampleMultipliers: EventMultipliers = {
    reputation: 1.5,
    intent: 2.5,
    identity: 1.5,
    power: 3,
    means: 2,
    environment: 2.5,
    ability: 1,
    circumstances: 2,
    responsibility: 1.5,
    awareness: 2,
  };

  it('looks up base scores from the full sheet scoring index', () => {
    expect(resolveSheetBaseImpact('Murder / rape', 'negative')).toMatchObject({
      category: 'Extreme Impact',
      deed: 'Murder / rape',
      baseScore: -1000,
    });
    expect(resolveSheetBaseImpact('Helping someone with small tasks', 'positive').baseScore).toBe(30);
  });

  it('uses every visible multiplier column for the delta ledger', () => {
    expect(calcMultiplierQuotient(sampleMultipliers)).toBe(506.25);
    expect(calcDelta(-100, sampleMultipliers)).toBe(-5062.5);
  });

  it('matches the sheet decay and weekly score tracker screenshots', () => {
    expect(sheetDecay(-5062.5)).toBeCloseTo(0.8350515464, 10);

    const tracker = calcSheetScoreTracker({
      baseScore: 1000,
      w1Delta: -5062.5,
      w2P: 0,
      w2N: -15000,
    });

    expect(tracker.w1Decay).toBeCloseTo(0.8350515464, 10);
    expect(tracker.w1Score).toBe(-8289.9);
    expect(tracker.w2Delta).toBe(-15000);
    expect(tracker.w2Decay).toBeCloseTo(0.9375, 10);
    expect(tracker.w2Score).toBe(-37352.4);
  });

  it('matches the profile credibility tracker sample', () => {
    expect(calcProfileCredibility({
      baseCredibility: 80,
      trustBadgeBonus: 20,
      opposedPosts: 12,
      disputeLosses: 4,
      aiFlaggedPosts: 2,
    })).toMatchObject({
      totalCredibility: 100,
      updatedCredibility: 68,
    });
  });
});
