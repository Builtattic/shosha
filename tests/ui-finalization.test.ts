import { describe, expect, it } from 'vitest';
import { reportCreateSchema } from '@/lib/validators';
import { socialFeedScore } from '@/lib/feedRanking';
import { swipeDelta } from '@/lib/swipeRules';
import { approvalThreshold } from '@/lib/bubbleRules';

const validReport = {
  accountId: 'website_test',
  type: 'positive',
  category: 'Community | Public Impact',
  deed: 'Volunteering',
  baseScore: 150,
  description: 'Helped organize a documented neighborhood cleanup with photos.',
  feelings: 'Helped organize a documented neighborhood cleanup with photos.',
  media: {
    url: 'https://example.com/proof.jpg',
    type: 'image',
    width: 0,
    height: 0,
    bytes: 100,
  },
  repetitionPattern: '1',
  intent: '1.5',
  circumstances: '1',
  aiUndertaking: true,
  publicAnonymous: false,
  evidenceSourceUrl: 'https://example.com/source',
};

describe('final UI workflow rules', () => {
  it('requires a source URL for report proof', () => {
    expect(reportCreateSchema.safeParse(validReport).success).toBe(true);
    expect(reportCreateSchema.safeParse({ ...validReport, evidenceSourceUrl: '' }).success).toBe(false);
  });

  it('ranks feed reports with editorial, impact, engagement, credibility, and safety signals', () => {
    const now = new Date('2026-05-07T00:00:00.000Z');
    const baseline = socialFeedScore({
      createdAt: '2026-05-06T00:00:00.000Z',
      reportScore: 50,
      credibilityWeight: 0.8,
      stats: { aligns: 4, opposes: 1, comments: 1, shares: 0 },
      aiVerdict: { confidence: 0.7, abuseFlags: [], isAiFabricated: false },
    }, now);
    const stronger = socialFeedScore({
      createdAt: '2026-05-06T00:00:00.000Z',
      reportScore: 500,
      credibilityWeight: 1,
      stats: { aligns: 40, opposes: 8, comments: 12, shares: 5 },
      aiVerdict: { confidence: 0.9, abuseFlags: [], isAiFabricated: false },
    }, now);
    const unsafe = socialFeedScore({
      createdAt: '2026-05-06T00:00:00.000Z',
      reportScore: 500,
      credibilityWeight: 1,
      stats: { aligns: 40, opposes: 8, comments: 12, shares: 5 },
      aiVerdict: { confidence: 0.9, abuseFlags: ['abuse_risk'], isAiFabricated: false },
    }, now);

    expect(stronger).toBeGreaterThan(baseline);
    expect(unsafe).toBeLessThan(stronger);
  });

  it('keeps swipe scoring additive and separate from ledger history', () => {
    expect(swipeDelta('align')).toBe(5);
    expect(swipeDelta('oppose')).toBe(-5);
  });

  it('requires more than half of bubble members to approve join requests', () => {
    expect(approvalThreshold(1)).toBe(1);
    expect(approvalThreshold(2)).toBe(2);
    expect(approvalThreshold(3)).toBe(2);
    expect(approvalThreshold(4)).toBe(3);
  });
});
