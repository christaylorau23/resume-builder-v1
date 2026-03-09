/**
 * Canva API export client.
 *
 * ISOLATION RULE: This function must NEVER throw to the pipeline orchestrator.
 * All errors (network timeout, 4xx/5xx, auth) must be caught here and returned
 * as a structured failure so run-pipeline.ts can push a PipelineWarning and
 * still return the PDF to the caller.
 */
import type { CanvaCredentials, CanvaExportResult, StructuredResume } from '@repo/types';

export type CanvaExportOutcome =
  | { ok: true; value: CanvaExportResult }
  | { ok: false; code: 'CANVA_EXPORT_FAILED'; details?: unknown };

const CANVA_DESIGNS_URL = 'https://api.canva.com/rest/v1/designs';

function getSafeDetails(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { message: err.message, name: err.name };
  }
  if (typeof err === 'object' && err !== null) {
    return { ...(err as Record<string, unknown>) };
  }
  return { message: String(err) };
}

export interface ExportToCanvaConfig {
  credentials: CanvaCredentials;
  templateId?: string;
}

/**
 * Export resume to Canva: create a design (MVP: blank doc) and return designId.
 * Never throws; returns structured failure on any error.
 */
export async function exportToCanva(
  _resume: StructuredResume,
  config: ExportToCanvaConfig
): Promise<CanvaExportOutcome> {
  const { credentials } = config;
  const accessToken = credentials.accessToken?.trim();
  if (!accessToken) {
    return { ok: false, code: 'CANVA_EXPORT_FAILED', details: { message: 'No Canva access token' } };
  }

  try {
    const res = await fetch(CANVA_DESIGNS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        design_type: { type: 'preset', name: 'doc' },
        title: 'Resume',
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        code: 'CANVA_EXPORT_FAILED',
        details: getSafeDetails({ statusCode: res.status, body: text }),
      };
    }

    const data = (await res.json()) as { design?: { id?: string; urls?: { edit_url?: string } } };
    const designId = data.design?.id ?? '';
    if (!designId) {
      return { ok: false, code: 'CANVA_EXPORT_FAILED', details: { message: 'No design ID in response' } };
    }
    const url = data.design?.urls?.edit_url;

    return { ok: true, value: { designId, url } };
  } catch (err) {
    return { ok: false, code: 'CANVA_EXPORT_FAILED', details: getSafeDetails(err) };
  }
}
