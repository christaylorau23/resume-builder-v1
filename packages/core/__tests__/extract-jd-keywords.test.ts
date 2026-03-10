/**
 * Unit tests for JD keyword extraction (ATS keyword extraction spec).
 *
 * Mocks Anthropic SDK so we do not call the real API. Asserts that extractJdKeywords
 * returns a valid TieredKeyword[] when the mock returns valid JSON.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractJdKeywords, ExtractKeywordsError } from '../src/ai/extract-jd-keywords';

const MOCK_KEYWORDS_JSON =
  '[{"term":"TypeScript","tier":"hard"},{"term":"React","tier":"alias"},{"term":"agile","tier":"contextual"}]';

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: MOCK_KEYWORDS_JSON }],
      }),
    },
  })),
}));

describe('extractJdKeywords', () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalEnv;
  });

  it('returns non-empty tiered list when API returns valid JSON array', async () => {
    const result = await extractJdKeywords('We need a TypeScript and React engineer.');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toEqual([
      { term: 'TypeScript', tier: 'hard' },
      { term: 'React', tier: 'alias' },
      { term: 'agile', tier: 'contextual' },
    ]);
  });

  it('each keyword has term (string) and tier (hard|alias|contextual)', async () => {
    const result = await extractJdKeywords('Job description here.');
    for (const kw of result) {
      expect(typeof kw.term).toBe('string');
      expect(kw.term.length).toBeGreaterThan(0);
      expect(['hard', 'alias', 'contextual']).toContain(kw.tier);
    }
  });

  it('throws ExtractKeywordsError with MISSING_ANTHROPIC_KEY when API key is unset', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(extractJdKeywords('JD text')).rejects.toThrow(ExtractKeywordsError);
    await expect(extractJdKeywords('JD text')).rejects.toMatchObject({
      code: 'MISSING_ANTHROPIC_KEY',
      name: 'ExtractKeywordsError',
    });
  });

  it('throws when API key is empty string', async () => {
    process.env.ANTHROPIC_API_KEY = '   ';
    await expect(extractJdKeywords('JD text')).rejects.toThrow(ExtractKeywordsError);
    await expect(extractJdKeywords('JD text')).rejects.toMatchObject({ code: 'MISSING_ANTHROPIC_KEY' });
  });
});
