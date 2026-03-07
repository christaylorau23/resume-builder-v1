/**
 * Pipeline orchestrator — single entry point for all resume generation.
 *
 * Execution order (once implemented):
 *   ingest → ai/redraft → layout-prep (apply-constraints + keyword-heatmap)
 *   → rendering/pdf → (optional) rendering/canva → assemble PipelineResult
 *
 * ATS PDF note: rendering/pdf/build-pdf.ts MUST initialize PDFKit with:
 *   tagged: true       — enables Tagged PDF / PDF/UA for ATS text extraction
 *   pdfVersion: '1.5'  — minimum version required for Tagged PDF support
 * See rendering/pdf/build-pdf.ts for the full configuration.
 */
import type { PipelineResult, LayoutPrepMetadata } from '@repo/types';
import type { StructuredResume } from '@repo/types';

export interface PipelineInput {
  /** Raw job description text (paste or URL-fetched). */
  jd?: string;
  /** Pre-built structured resume — skips the AI redraft step. */
  structuredResume?: StructuredResume;
}

/**
 * Run the full resume pipeline and return a PipelineResult.
 *
 * - `pdf` is always present on success.
 * - Canva failure is non-fatal: it adds a warning but never blocks pdf.
 * - Throws on fatal error (AI failure, PDF generation failure).
 *
 * @placeholder — full implementation in a future story.
 */
export async function runPipeline(_input: PipelineInput): Promise<PipelineResult> {
  throw new Error(
    'runPipeline: not implemented yet. ' +
      'Implementation will follow: ingest → ai → layout-prep → rendering/pdf → (canva).'
  );
}

/** @internal Exported for testing the result shape contract only. */
export function _makePipelineResult(
  pdf: Buffer,
  layoutPrep: LayoutPrepMetadata
): PipelineResult {
  return { pdf, layoutPrep, warnings: [] };
}
