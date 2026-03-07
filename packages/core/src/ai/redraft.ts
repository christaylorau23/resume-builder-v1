/**
 * AI redraft — turns a raw job description into an ATS-optimized StructuredResume.
 * Calls the Anthropic API (high-reasoning model for deep JD analysis).
 * Must complete within the pipeline's 3-minute end-to-end budget.
 *
 * @placeholder — full implementation in a future story.
 */
import type { StructuredResume } from '@repo/types';

/** @placeholder */
export async function redraftResume(_jd: string): Promise<StructuredResume> {
  throw new Error('redraftResume: not implemented yet.');
}
