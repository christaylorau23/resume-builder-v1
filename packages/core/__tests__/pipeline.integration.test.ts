import { describe, it, expect, vi } from 'vitest';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
// Import pdf-parse lib directly to avoid the debug-mode file read triggered when module.parent=null
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
  buf: Buffer,
) => Promise<{ numpages: number; text: string }>;
import { runPipeline, _makePipelineResult } from '../src/pipeline/run-pipeline';
import { buildPdf } from '../src/rendering/pdf/build-pdf';
import { computeKeywordHeatmap } from '../src/layout-prep/keyword-heatmap';
import { CANONICAL_RESUME, CANONICAL_JD_KEYWORDS } from './fixtures/canonical-resume';

describe('pipeline integration', () => {
  it('runPipeline: returns PipelineResult with pdf buffer on success', async () => {
    // Skip visual PDF in tests — Puppeteer/Chromium may not be available in CI
    const result = await runPipeline({ structuredResume: CANONICAL_RESUME }, { visualPdf: false });
    expect(result.pdf).toBeInstanceOf(Buffer);
    expect(result.pdf.length).toBeGreaterThan(0);
    expect(result.layoutPrep).toBeDefined();
    expect(result.layoutPrep.keywordHeatmap).toBeDefined();
    expect(result.warnings).toEqual([]);
  });

  it('runPipeline: visual PDF failure adds VISUAL_PDF_FAILED warning, not an exception', async () => {
    // Chromium may be missing system libs in WSL2/CI — the renderer must never throw
    const result = await runPipeline({ structuredResume: CANONICAL_RESUME });
    expect(result.pdf).toBeInstanceOf(Buffer);
    expect(result.pdf.length).toBeGreaterThan(0);
    // Either visual PDF succeeds or a warning is added — never an exception
    const visualPdfFailed = result.warnings.some((w) => w.code === 'VISUAL_PDF_FAILED');
    const hasVisualPdf = result.visualPdf !== undefined;
    expect(visualPdfFailed || hasVisualPdf).toBe(true);
  });

  it('runPipeline: visualPdf option false skips Puppeteer render entirely', async () => {
    const result = await runPipeline({ structuredResume: CANONICAL_RESUME }, { visualPdf: false });
    expect(result.visualPdf).toBeUndefined();
    expect(result.warnings.some((w) => w.code === 'VISUAL_PDF_FAILED')).toBe(false);
    expect(result.pdf.length).toBeGreaterThan(0);
  });

  it('runPipeline: layoutPrep.hadTruncation is false when no fields exceed limits', async () => {
    const result = await runPipeline({ structuredResume: CANONICAL_RESUME }, { visualPdf: false });
    expect(result.layoutPrep.hadTruncation).toBe(false);
  });

  it('runPipeline: structuredResume path yields heatmap with score 1 and empty present/missing when no JD', async () => {
    const result = await runPipeline({ structuredResume: CANONICAL_RESUME }, { visualPdf: false });
    expect(result.layoutPrep.keywordHeatmap).toBeDefined();
    expect(result.layoutPrep.keywordHeatmap!.score).toBe(1);
    expect(result.layoutPrep.keywordHeatmap!.present).toEqual([]);
    expect(result.layoutPrep.keywordHeatmap!.missing).toEqual([]);
  });

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
    expect(result.visualPdf).toBeUndefined();
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
