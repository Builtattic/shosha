import { describe, expect, it } from 'vitest';
import { adjudicateReport } from '@/lib/gemini';

describe('Shosha adjudication fallback', () => {
  it('returns a bounded heuristic verdict without an API key', async () => {
    const previousKey = process.env.GEMINI_API_KEY;
    const previousModel = process.env.GEMINI_MODEL;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
    const verdict = await adjudicateReport({
      accountDisplayName: 'Case File',
      platform: 'x',
      type: 'negative',
      description: 'Yesterday a screenshot showed the account ignored a documented support request.',
      feelings: 'It felt dismissive and made the exchange hard to trust.'
    });
    process.env.GEMINI_API_KEY = previousKey;
    process.env.GEMINI_MODEL = previousModel;
    expect(verdict.confidence).toBeGreaterThanOrEqual(0);
    expect(verdict.confidence).toBeLessThanOrEqual(1);
    expect(verdict.proposedImpact).toBeLessThan(0);
  });
});
