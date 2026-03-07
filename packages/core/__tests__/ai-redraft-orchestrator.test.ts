/**
 * AI Redraft Orchestrator test suite — AC1/AC2/AC3/AC4
 *
 * AC1 — JD Ingestion: paste path and URL-success path both produce a JD string
 * AC2 — Mobile Resilience: URL failure → IngestError(JD_URL_FETCH_FAILED) for fallback
 * AC3 — Keyword Weaving: hard keywords from JD appear naturally in resume bullets/summary
 * AC4 — Layout Safety: applyConstraints enforces per-section character limits
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ingestJd, IngestError } from '../src/pipeline/ingest';
import { applyConstraints } from '../src/layout-prep/apply-constraints';
import { computeKeywordHeatmap } from '../src/layout-prep/keyword-heatmap';
import { MVP_TEMPLATE_CONTRACT } from '../src/contract/mvp-template';
import { CANONICAL_RESUME, CANONICAL_JD_KEYWORDS } from './fixtures/canonical-resume';
import type { StructuredResume } from '@repo/types';

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// AC1 — JD Ingestion
// ---------------------------------------------------------------------------
describe('AC1: JD ingestion', () => {
  it('paste path: returns trimmed text directly', async () => {
    const jd = '  We need a TypeScript engineer.  ';
    const result = await ingestJd({ text: jd });
    expect(result).toBe('We need a TypeScript engineer.');
  });

  it('URL path: fetches and returns body on HTTP 200', async () => {
    const body = 'TypeScript React engineer needed.';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => body,
    }));
    const result = await ingestJd({ url: 'https://example.com/job' });
    expect(result).toBe(body);
  });

  it('both paths produce the same output type (string)', async () => {
    const pasteResult = await ingestJd({ text: 'some JD text' });
    expect(typeof pasteResult).toBe('string');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'some JD text',
    }));
    const urlResult = await ingestJd({ url: 'https://example.com/job' });
    expect(typeof urlResult).toBe('string');
  });

  it('paste path takes priority over URL when both provided', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await ingestJd({ text: 'paste wins', url: 'https://example.com/job' });
    expect(result).toBe('paste wins');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AC2 — Mobile Resilience: URL failures → IngestError fallback trigger
// ---------------------------------------------------------------------------
describe('AC2: URL failure → IngestError fallback', () => {
  it('throws IngestError(JD_URL_FETCH_FAILED) on HTTP 403 (paywall/auth)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    }));
    await expect(ingestJd({ url: 'https://example.com/blocked' }))
      .rejects.toMatchObject({ code: 'JD_URL_FETCH_FAILED' });
  });

  it('throws IngestError(JD_URL_FETCH_FAILED) on HTTP 503 (server error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    }));
    await expect(ingestJd({ url: 'https://example.com/down' }))
      .rejects.toMatchObject({ code: 'JD_URL_FETCH_FAILED' });
  });

  it('throws IngestError(JD_URL_FETCH_FAILED) on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failure')));
    await expect(ingestJd({ url: 'https://example.com/offline' }))
      .rejects.toMatchObject({ code: 'JD_URL_FETCH_FAILED' });
  });

  it('throws IngestError(JD_URL_FETCH_FAILED) on AbortError (timeout)', async () => {
    const abortErr = new DOMException('The operation was aborted.', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortErr));
    await expect(ingestJd({ url: 'https://example.com/slow' }))
      .rejects.toMatchObject({ code: 'JD_URL_FETCH_FAILED' });
  });

  it('throws IngestError(JD_MISSING) when no input provided', async () => {
    await expect(ingestJd({}))
      .rejects.toMatchObject({ code: 'JD_MISSING' });
  });

  it('thrown error is an IngestError instance with correct name', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    let caught: unknown;
    try {
      await ingestJd({ url: 'https://example.com/timeout' });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(IngestError);
    expect((caught as IngestError).name).toBe('IngestError');
    expect((caught as IngestError).code).toBe('JD_URL_FETCH_FAILED');
  });

  it('paste JD after URL failure produces a valid string (same pipeline)', async () => {
    // Simulate: URL failed → user pastes JD → same output shape
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('blocked')));
    let pastedJd: string | undefined;
    try {
      await ingestJd({ url: 'https://example.com/blocked' });
    } catch {
      // fallback: use paste
      pastedJd = await ingestJd({ text: 'TypeScript engineer role at Acme' });
    }
    expect(typeof pastedJd).toBe('string');
    expect(pastedJd).toBe('TypeScript engineer role at Acme');
  });
});

// ---------------------------------------------------------------------------
// AC3 — Keyword Weaving: hard keywords appear naturally in resume narrative
// ---------------------------------------------------------------------------
describe('AC3: hard keywords present in resume', () => {
  it('hard keywords (TypeScript, React) appear in the keyword heatmap', () => {
    const { keywordHeatmap } = computeKeywordHeatmap(CANONICAL_RESUME, CANONICAL_JD_KEYWORDS);
    const hardTerms = CANONICAL_JD_KEYWORDS
      .filter(k => k.tier === 'hard')
      .map(k => k.term);

    for (const term of hardTerms) {
      expect(keywordHeatmap.present, `"${term}" must be in heatmap.present`).toContain(term);
    }
  });

  it('ATS score > 0 when hard keywords are present', () => {
    const { keywordHeatmap } = computeKeywordHeatmap(CANONICAL_RESUME, CANONICAL_JD_KEYWORDS);
    expect(keywordHeatmap.score).toBeGreaterThan(0);
  });

  it('hard keyword "TypeScript" appears in experience bullets (natural weaving)', () => {
    const bulletText = CANONICAL_RESUME.experience.flatMap(e => e.bullets).join(' ');
    expect(bulletText).toContain('TypeScript');
  });

  it('hard keyword "React" appears in experience bullets (natural weaving)', () => {
    const bulletText = CANONICAL_RESUME.experience.flatMap(e => e.bullets).join(' ');
    expect(bulletText).toContain('React');
  });

  it('heatmap nonNegotiable flag set for sections containing hard keywords', () => {
    const { keywordHeatmap } = computeKeywordHeatmap(CANONICAL_RESUME, CANONICAL_JD_KEYWORDS);
    // summary contains TypeScript (hard) → nonNegotiable
    expect(keywordHeatmap.sections.summary.nonNegotiable).toBe(true);
  });

  it('heatmap score stays > 0 after layout constraints applied', () => {
    const { resume: constrained } = applyConstraints(CANONICAL_RESUME, MVP_TEMPLATE_CONTRACT);
    const { keywordHeatmap } = computeKeywordHeatmap(constrained, CANONICAL_JD_KEYWORDS);
    expect(keywordHeatmap.score).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC4 — Layout Safety: character limits enforced per section
// ---------------------------------------------------------------------------
describe('AC4: layout safety / character limits', () => {
  it('name is trimmed to maxChars when over limit', () => {
    const maxChars = MVP_TEMPLATE_CONTRACT.fields.name!.maxChars!;
    const resume: StructuredResume = { ...CANONICAL_RESUME, name: 'A'.repeat(maxChars + 50) };
    const { resume: out, metadata } = applyConstraints(resume, MVP_TEMPLATE_CONTRACT);
    expect(out.name.length).toBeLessThanOrEqual(maxChars);
    expect(metadata.hadTruncation).toBe(true);
  });

  it('headline is truncated with ellipsis to maxChars', () => {
    const maxChars = MVP_TEMPLATE_CONTRACT.fields.headline!.maxChars!;
    const resume: StructuredResume = { ...CANONICAL_RESUME, headline: 'B'.repeat(maxChars + 50) };
    const { resume: out } = applyConstraints(resume, MVP_TEMPLATE_CONTRACT);
    expect(out.headline.length).toBeLessThanOrEqual(maxChars);
    expect(out.headline.endsWith('\u2026')).toBe(true); // ellipsis strategy
  });

  it('summary is truncated to maxChars', () => {
    const maxChars = MVP_TEMPLATE_CONTRACT.fields.summary!.maxChars!;
    const resume: StructuredResume = { ...CANONICAL_RESUME, summary: 'C'.repeat(maxChars + 200) };
    const { resume: out } = applyConstraints(resume, MVP_TEMPLATE_CONTRACT);
    expect(out.summary.length).toBeLessThanOrEqual(maxChars);
  });

  it('experience bullets are truncated to maxChars', () => {
    const maxChars = MVP_TEMPLATE_CONTRACT.fields['experience[].bullets[]']!.maxChars!;
    const longBullet = 'Z'.repeat(maxChars + 100);
    const resume: StructuredResume = {
      ...CANONICAL_RESUME,
      experience: [{ ...CANONICAL_RESUME.experience[0], bullets: [longBullet] }],
    };
    const { resume: out } = applyConstraints(resume, MVP_TEMPLATE_CONTRACT);
    expect(out.experience[0].bullets[0].length).toBeLessThanOrEqual(maxChars);
  });

  it('canonical resume passes through constraints without truncation', () => {
    // Canonical resume is designed to be within limits
    const { metadata } = applyConstraints(CANONICAL_RESUME, MVP_TEMPLATE_CONTRACT);
    expect(metadata.hadTruncation).toBe(false);
  });

  it('all fields in constrained resume satisfy contract limits', () => {
    const longResume: StructuredResume = {
      ...CANONICAL_RESUME,
      name: 'N'.repeat(200),
      headline: 'H'.repeat(200),
      summary: 'S'.repeat(800),
      experience: [
        {
          ...CANONICAL_RESUME.experience[0],
          title: 'T'.repeat(200),
          company: 'C'.repeat(200),
          bullets: ['B'.repeat(300), 'B'.repeat(300)],
        },
      ],
    };
    const { resume: out } = applyConstraints(longResume, MVP_TEMPLATE_CONTRACT);
    const f = MVP_TEMPLATE_CONTRACT.fields;

    if (f.name?.maxChars) expect(out.name.length).toBeLessThanOrEqual(f.name.maxChars);
    if (f.headline?.maxChars) expect(out.headline.length).toBeLessThanOrEqual(f.headline.maxChars);
    if (f.summary?.maxChars) expect(out.summary.length).toBeLessThanOrEqual(f.summary.maxChars);

    const bulletMax = f['experience[].bullets[]']?.maxChars;
    if (bulletMax) {
      for (const exp of out.experience) {
        for (const bullet of exp.bullets) {
          expect(bullet.length).toBeLessThanOrEqual(bulletMax);
        }
      }
    }
    const titleMax = f['experience[].title']?.maxChars;
    if (titleMax) {
      for (const exp of out.experience) {
        expect(exp.title.length).toBeLessThanOrEqual(titleMax);
      }
    }
  });

  it('applyConstraints is idempotent: double-applying yields same result', () => {
    const resume: StructuredResume = { ...CANONICAL_RESUME, summary: 'D'.repeat(800) };
    const first = applyConstraints(resume, MVP_TEMPLATE_CONTRACT).resume;
    const second = applyConstraints(first, MVP_TEMPLATE_CONTRACT).resume;
    expect(second.summary).toBe(first.summary);
    expect(second.name).toBe(first.name);
  });

  it('truncation metadata records all truncated fields', () => {
    const maxName = MVP_TEMPLATE_CONTRACT.fields.name!.maxChars!;
    const maxSummary = MVP_TEMPLATE_CONTRACT.fields.summary!.maxChars!;
    const resume: StructuredResume = {
      ...CANONICAL_RESUME,
      name: 'N'.repeat(maxName + 1),
      summary: 'S'.repeat(maxSummary + 1),
    };
    const { metadata } = applyConstraints(resume, MVP_TEMPLATE_CONTRACT);
    expect(metadata.truncatedFields).toContain('name');
    expect(metadata.truncatedFields).toContain('summary');
    expect(metadata.truncationDetails?.['name']).toBeDefined();
    expect(metadata.truncationDetails?.['summary']).toBeDefined();
  });
});
