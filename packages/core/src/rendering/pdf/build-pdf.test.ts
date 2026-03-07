import { describe, it, expect } from 'vitest';
// Import pdf-parse lib directly to avoid the debug-mode file read triggered when module.parent=null
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
  buf: Buffer,
) => Promise<{ numpages: number; text: string }>;
import { buildPdf } from './build-pdf';
import { CANONICAL_RESUME, CANONICAL_JD_KEYWORDS } from '../../../__tests__/fixtures/canonical-resume';
import { computeKeywordHeatmap } from '../../layout-prep/keyword-heatmap';

function makeHeatmap() {
  const { keywordHeatmap } = computeKeywordHeatmap(CANONICAL_RESUME, CANONICAL_JD_KEYWORDS);
  return keywordHeatmap;
}

describe('buildPdf', () => {
  it('produces a Buffer for the canonical StructuredResume', async () => {
    const buf = await buildPdf(CANONICAL_RESUME, makeHeatmap());
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('PDF contains searchable text — candidate name is readable', async () => {
    const buf = await buildPdf(CANONICAL_RESUME, makeHeatmap());
    const parsed = await pdfParse(buf);
    expect(parsed.text).toContain(CANONICAL_RESUME.name);
  });

  it('PDF contains at least one hard keyword (TypeScript) as readable text', async () => {
    const buf = await buildPdf(CANONICAL_RESUME, makeHeatmap());
    const parsed = await pdfParse(buf);
    expect(parsed.text).toContain('TypeScript');
  });

  it('rendered PDF is exactly 1 page — no overflow for canonical resume', async () => {
    const buf = await buildPdf(CANONICAL_RESUME, makeHeatmap());
    const parsed = await pdfParse(buf);
    expect(parsed.numpages).toBe(1);
  });

  it('buildPdf completes in under 5 seconds', async () => {
    const start = Date.now();
    await buildPdf(CANONICAL_RESUME, makeHeatmap());
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  it('includes all resume sections: headline, summary, experience, education, skills', async () => {
    const buf = await buildPdf(CANONICAL_RESUME, makeHeatmap());
    const parsed = await pdfParse(buf);
    expect(parsed.text).toContain(CANONICAL_RESUME.headline);
    expect(parsed.text).toContain('Summary');
    expect(parsed.text).toContain('Experience');
    expect(parsed.text).toContain('Education');
    expect(parsed.text).toContain('Skills');
  });

  it('throws a descriptive error when nonNegotiable summary is missing', async () => {
    const heatmap = makeHeatmap();
    const manipulatedHeatmap = {
      ...heatmap,
      sections: {
        ...heatmap.sections,
        summary: { ...heatmap.sections.summary, nonNegotiable: true },
      },
    };
    const resumeWithoutSummary = { ...CANONICAL_RESUME, summary: '' };
    await expect(buildPdf(resumeWithoutSummary, manipulatedHeatmap)).rejects.toThrow(
      'nonNegotiable',
    );
  });
});
