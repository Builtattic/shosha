import { describe, expect, it } from 'vitest';
import { usernameFromUrl } from '../src/lib/socialDiscovery';

describe('social discovery helpers', () => {
  it('extracts profile handles from major social URLs', () => {
    expect(usernameFromUrl('https://www.instagram.com/openai/', 'fallback')).toBe('openai');
    expect(usernameFromUrl('https://x.com/openai', 'fallback')).toBe('openai');
    expect(usernameFromUrl('https://www.facebook.com/openai', 'fallback')).toBe('openai');
    expect(usernameFromUrl('https://www.youtube.com/@OpenAI', 'fallback')).toBe('OpenAI');
    expect(usernameFromUrl('https://www.linkedin.com/company/openai/', 'fallback')).toBe('company-openai');
  });
});
