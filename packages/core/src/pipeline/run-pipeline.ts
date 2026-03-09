/**
 * Pipeline orchestrator — single entry point for all resume generation.
 *
 * Execution order (once implemented):
 *   ingest → ai/redraft (with identity pillars injected into system prompt) → layout-prep
 *   (apply-constraints + keyword-heatmap) → rendering/pdf → (optional) rendering/canva
 *   → assemble PipelineResult
 *
 * Identity injection: Name and email are static defaults (Chris Taylor, christaylorau23@gmail.com).
 * Phone comes from profile.targetMarket (US: 424-388-9521, AU: 0403 905 751) or profile.phone.
 * The redraft step MUST receive resolved IdentityPillars and use them verbatim in system
 * instructions so the LLM never hallucinates these values. See identity-defaults.ts and architecture.
 *
 * ATS PDF note: rendering/pdf/build-pdf.ts MUST initialize PDFKit with:
 *   tagged: true       — enables Tagged PDF / PDF/UA for ATS text extraction
 *   pdfVersion: '1.5'  — minimum version required for Tagged PDF support
 * See rendering/pdf/build-pdf.ts for the full configuration.
 */
import type { CanvaCredentials, PipelineResult, LayoutPrepMetadata } from '@repo/types';
import type { StructuredResume } from '@repo/types';
import type { IdentityProfileInput } from '@repo/types';
import { resolveIdentityPillars } from '../identity-defaults';
import { applyConstraints } from '../layout-prep/apply-constraints';
import { computeKeywordHeatmap } from '../layout-prep/keyword-heatmap';
import { buildPdf } from '../rendering/pdf/build-pdf';
import { exportToCanvaFromProvider } from '../rendering/canva/canva-provider';
import { redraftResume, RedraftError } from '../ai/redraft';
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
   * Resolved identity pillars are injected into the BYOM redraft system prompt without modification.
   */
  profile?: IdentityProfileInput;
}

export interface RunPipelineOptions {
  /** When provided, export to Canva after PDF; on failure a warning is added, PDF still returned. */
  canvaCredentials?: CanvaCredentials | null;
  canvaTemplateId?: string;
}

/**
 * Run the full resume pipeline and return a PipelineResult.
 *
 * - Direct JSON path: when input.structuredResume is set, skip ingest/redraft; run applyConstraints, computeKeywordHeatmap, buildPdf.
 * - JD Redraft path: when input.jd is set, resolve identity and call redraftResume, then common pipeline.
 * - pdf is always present on success. When canvaCredentials is provided, attempts Canva export; failure adds a warning only.
 */
export async function runPipeline(
  input: PipelineInput,
  options?: RunPipelineOptions
): Promise<PipelineResult> {
  let structuredResume: StructuredResume;

  if (input.structuredResume != null) {
    structuredResume = input.structuredResume;
  } else if (input.jd != null) {
    const pillars = resolveIdentityPillars(input.profile);
    try {
      structuredResume = await redraftResume(input.jd, pillars);
    } catch (err) {
      // Re-throw RedraftErrors with their structured code so the API layer can map them
      if (err instanceof RedraftError) throw err;
      throw new Error(`Redraft failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    throw new Error('Pipeline requires either structuredResume or jd input.');
  }

  const constraintResult = applyConstraints(structuredResume, MVP_TEMPLATE_CONTRACT);
  const jdKeywords: TieredKeyword[] = [];
  const heatmapResult = computeKeywordHeatmap(constraintResult.resume, jdKeywords);

  const layoutPrep: LayoutPrepMetadata = {
    ...constraintResult.metadata,
    keywordHeatmap: heatmapResult.keywordHeatmap,
  };

  const pdfBuffer = await buildPdf(constraintResult.resume, heatmapResult.keywordHeatmap);
  const warnings: PipelineResult['warnings'] = [];

  const canvaCreds = options?.canvaCredentials;
  if (canvaCreds?.accessToken || canvaCreds?.apiKey) {
    const pillars = resolveIdentityPillars(input.profile);
    const canvaOutcome = await exportToCanvaFromProvider(
      pillars,
      constraintResult.resume,
      options?.canvaTemplateId ?? '',
      canvaCreds
    );
    if (canvaOutcome.ok) {
      return _makePipelineResult(pdfBuffer, layoutPrep, [], canvaOutcome.value);
    }
    warnings.push({
      code: 'CANVA_EXPORT_FAILED',
      message: 'Canva export failed. PDF was still generated.',
      details: canvaOutcome.details,
    });
  }

  return _makePipelineResult(pdfBuffer, layoutPrep, warnings);
}

/** @internal Exported for testing the result shape contract only. */
export function _makePipelineResult(
  pdf: Buffer,
  layoutPrep: LayoutPrepMetadata,
  warnings: PipelineResult['warnings'] = [],
  canva?: PipelineResult['canva']
): PipelineResult {
  return { pdf, layoutPrep, warnings, ...(canva !== undefined && { canva }) };
}
