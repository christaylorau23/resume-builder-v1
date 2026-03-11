/**
 * Pipeline orchestrator — single entry point for all resume generation.
 *
 * Execution order (JD path):
 *   extractJdKeywords → ai/redraft (with identity pillars + tiered keywords) → layout-prep
 *   (apply-constraints + keyword-heatmap) → rendering/pdf (ATS) → rendering/html (visual PDF)
 *   → assemble PipelineResult.
 * Direct JSON path: structuredResume only → layout-prep → rendering (jdKeywords empty).
 *
 * Identity injection: Name and email are static defaults (Chris Taylor, christaylorau23@gmail.com).
 * Phone comes from profile.targetMarket (US: 424-388-9521, AU: 0403 905 751) or profile.phone.
 * The redraft step receives resolved IdentityPillars and uses them verbatim.
 *
 * ATS PDF note: rendering/pdf/build-pdf.ts MUST initialize PDFKit with:
 *   tagged: true       — enables Tagged PDF / PDF/UA for ATS text extraction
 *   pdfVersion: '1.5'  — minimum version required for Tagged PDF support
 * See rendering/pdf/build-pdf.ts for the full configuration.
 */
import type { PipelineResult, LayoutPrepMetadata } from '@repo/types';
import type { StructuredResume } from '@repo/types';
import type { IdentityProfileInput } from '@repo/types';
import { resolveIdentityPillars } from '../identity-defaults';
import { applyConstraints } from '../layout-prep/apply-constraints';
import { computeKeywordHeatmap } from '../layout-prep/keyword-heatmap';
import { buildPdf } from '../rendering/pdf/build-pdf';
import { renderVisualPdf } from '../rendering/html/render-visual-pdf';
import { redraftResume, RedraftError } from '../ai/redraft';
import { extractJdKeywords, ExtractKeywordsError } from '../ai/extract-jd-keywords';
import { MVP_TEMPLATE_CONTRACT } from '../contract/mvp-template';
import type { TieredKeyword } from '../layout-prep/keyword-heatmap';

export interface PipelineInput {
  /** Raw job description text (paste or URL-fetched). */
  jd?: string;
  /** Pre-built structured resume — skips the AI redraft step. */
  structuredResume?: StructuredResume;
  /**
   * Identity profile for redraft: phone or target market (US/AU).
   * Name and email are always core static defaults (Chris Taylor, christaylorau23@gmail.com).
   */
  profile?: IdentityProfileInput;
}

export interface RunPipelineOptions {
  /**
   * Set to false to skip the visual (Puppeteer) PDF render.
   * Defaults to true — visual PDF is generated and returned as `visualPdf` in the result.
   */
  visualPdf?: boolean;
}

/**
 * Run the full resume pipeline and return a PipelineResult.
 *
 * - Direct JSON path: when input.structuredResume is set, skip ingest/redraft; run applyConstraints, computeKeywordHeatmap, buildPdf.
 * - JD Redraft path: when input.jd is set, resolve identity and call redraftResume, then common pipeline.
 * - pdf is always present on success.
 * - visualPdf is best-effort (Puppeteer HTML render); failure adds VISUAL_PDF_FAILED warning.
 */
export async function runPipeline(
  input: PipelineInput,
  options?: RunPipelineOptions
): Promise<PipelineResult> {
  const pillars = resolveIdentityPillars(input.profile);
  let structuredResume: StructuredResume;
  let jdKeywords: TieredKeyword[] = [];

  if (input.structuredResume != null) {
    structuredResume = input.structuredResume;
  } else if (input.jd != null) {
    try {
      jdKeywords = await extractJdKeywords(input.jd);
    } catch (err) {
      if (err instanceof ExtractKeywordsError) throw err;
      throw new Error(
        `Keyword extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    try {
      structuredResume = await redraftResume(input.jd, pillars, jdKeywords);
    } catch (err) {
      if (err instanceof RedraftError) throw err;
      throw new Error(`Redraft failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    throw new Error('Pipeline requires either structuredResume or jd input.');
  }

  const constraintResult = applyConstraints(structuredResume, MVP_TEMPLATE_CONTRACT);
  const heatmapResult = computeKeywordHeatmap(constraintResult.resume, jdKeywords);

  const layoutPrep: LayoutPrepMetadata = {
    ...constraintResult.metadata,
    keywordHeatmap: heatmapResult.keywordHeatmap,
  };

  const pdfBuffer = await buildPdf(constraintResult.resume, heatmapResult.keywordHeatmap);
  const warnings: PipelineResult['warnings'] = [];

  let visualPdfBuffer: Buffer | undefined;
  if (options?.visualPdf !== false) {
    visualPdfBuffer = await renderVisualPdf(constraintResult.resume, pillars);
    if (visualPdfBuffer === undefined) {
      warnings.push({
        code: 'VISUAL_PDF_FAILED',
        message: 'Visual PDF render failed. ATS PDF was still generated.',
      });
    }
  }

  const suggestedFilename = buildSuggestedFilename(constraintResult.resume);

  return _makePipelineResult(pdfBuffer, layoutPrep, warnings, visualPdfBuffer, suggestedFilename);
}

/** Derive a safe download filename from the resume's target role and most recent employer. */
function buildSuggestedFilename(resume: StructuredResume): string {
  const slugify = (s: string, maxLen: number) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, maxLen);

  const role = slugify(resume.targetRole ?? resume.headline, 40) || 'resume';
  const company = resume.experience[0]?.company
    ? slugify(resume.experience[0].company, 30)
    : 'resume';

  return `${company}_${role}_Resume.pdf`;
}

/** @internal Exported for testing the result shape contract only. */
export function _makePipelineResult(
  pdf: Buffer,
  layoutPrep: LayoutPrepMetadata,
  warnings: PipelineResult['warnings'] = [],
  visualPdf?: Buffer,
  suggestedFilename?: string,
): PipelineResult {
  return {
    pdf,
    layoutPrep,
    warnings,
    ...(visualPdf !== undefined && { visualPdf }),
    ...(suggestedFilename !== undefined && { suggestedFilename }),
  };
}
