import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
// Import pdf-parse lib directly to avoid the debug-mode file read triggered when module.parent=null
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
  buf: Buffer,
) => Promise<{ numpages: number; text: string }>;
import { _makePipelineResult } from '../src/pipeline/run-pipeline';
import { buildPdf } from '../src/rendering/pdf/build-pdf';
import { computeKeywordHeatmap } from '../src/layout-prep/keyword-heatmap';
import { CANONICAL_RESUME, CANONICAL_JD_KEYWORDS } from './fixtures/canonical-resume';

describe('pipeline integration', () => {
  it.todo('runPipeline: returns PipelineResult with pdf buffer on success');
  it.todo('runPipeline: pdf is always present even when Canva fails');
  it.todo('runPipeline: Canva failure adds CANVA_EXPORT_FAILED warning, not an exception');
  it.todo('runPipeline: layoutPrep.hadTruncation is false when no fields exceed limits');

  // Shape contract test — verifies PipelineResult interface is correctly assembled.
  it('_makePipelineResult: assembles a valid PipelineResult shape', () => {
    const pdf = Buffer.from('fake-pdf');
    const result = _makePipelineResult(pdf, {
      truncatedFields: [],
      hadTruncation: false,
    });
    expect(result.pdf).toBe(pdf);
    expect(result.layoutPrep.hadTruncation).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(result.canva).toBeUndefined();
  });

  // AC6 — Output file verification gate
  it('buildPdf: writes output/test-resume.pdf and contains hard keyword "TypeScript"', async () => {
    const { keywordHeatmap } = computeKeywordHeatmap(CANONICAL_RESUME, CANONICAL_JD_KEYWORDS);
    const buf = await buildPdf(CANONICAL_RESUME, keywordHeatmap);

    // Write to output/test-resume.pdf (overwrite if exists)
    const outputDir = join(__dirname, '..', 'output');
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(outputDir, 'test-resume.pdf'), buf);

    // Parse and assert hard keyword "TypeScript" is readable text
    const parsed = await pdfParse(buf);
    expect(parsed.text).toContain('TypeScript');
    expect(parsed.numpages).toBe(1);
  });
});
