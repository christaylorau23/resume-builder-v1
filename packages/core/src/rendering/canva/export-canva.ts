/**
 * Canva API export client.
 *
 * ISOLATION RULE: This function must NEVER throw to the pipeline orchestrator.
 * All errors (network timeout, 4xx/5xx, auth) must be caught here and returned
 * as a structured failure so run-pipeline.ts can push a PipelineWarning and
 * still return the PDF to the caller.
 *
 * Pattern (implement in full story):
 *   try {
 *     const result = await callCanvaApi(resume, config);
 *     return { ok: true, value: result };
 *   } catch (err) {
 *     return { ok: false, code: 'CANVA_EXPORT_FAILED', details: getSafeDetails(err) };
 *   }
 *
 * @placeholder — full implementation in a future story.
 */
import type { CanvaExportResult, StructuredResume } from '@repo/types';

export type CanvaExportOutcome =
  | { ok: true; value: CanvaExportResult }
  | { ok: false; code: 'CANVA_EXPORT_FAILED'; details?: unknown };

/** @placeholder */
export async function exportToCanva(
  _resume: StructuredResume,
  _config: { templateId: string }
): Promise<CanvaExportOutcome> {
  throw new Error('exportToCanva: not implemented yet.');
}
