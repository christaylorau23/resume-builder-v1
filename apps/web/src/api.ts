/**
 * API helpers for calling the resume pipeline.
 * Identity: profile.targetMarket is sent so the backend can resolve Identity Pillars
 * (name, email, phone) for the redraft. AI credentials are managed server-side.
 */
import { getApiBaseUrl } from './constants';
import { getTargetMarket } from './settings';

export function buildPipelineHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

/**
 * Build the profile portion of PipelineInput for identity injection.
 * Backend resolves name/email from core defaults and phone from targetMarket (US: 424-388-9521, AU: 0403 905 751).
 */
export function buildPipelineProfile(): { targetMarket: 'US' | 'AU' } {
  return { targetMarket: getTargetMarket() };
}

export interface PipelineResponse {
  pdf: string;
  visualPdf?: string;
  layoutPrep: {
    keywordHeatmap?: { score: number; present: string[]; missing: string[] };
  };
  warnings: { code: string; message: string }[];
  suggestedFilename?: string;
}

/**
 * Call POST /api/scrape-jd to scrape job description from a URL. Requires VITE_API_URL and server FIRECRAWL_API_KEY.
 */
export async function callScrapeJd(url: string): Promise<{ markdown: string }> {
  const res = await fetch(`${getApiBaseUrl()}/api/scrape-jd`, {
    method: 'POST',
    headers: buildPipelineHeaders(),
    credentials: 'include',
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Scrape request failed' }));
    throw new Error((err as { message?: string }).message || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Call POST /api/run-pipeline. Requires VITE_API_URL to be set.
 */
export async function callRunPipeline(body: Record<string, unknown>): Promise<PipelineResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/run-pipeline`, {
    method: 'POST',
    headers: buildPipelineHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Pipeline request failed' }));
    throw new Error((err as { message?: string }).message || `HTTP ${res.status}`);
  }
  return res.json();
}
