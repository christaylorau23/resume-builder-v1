/**
 * AI redraft — turns a raw job description into an ATS-optimized StructuredResume.
 * Calls the Anthropic API (high-reasoning model for deep JD analysis).
 * Must complete within the pipeline's 3-minute end-to-end budget.
 *
 * @placeholder — full implementation in a future story.
 */
import type { StructuredResume } from '@repo/types';
import { IngestError, ingestJd } from '../pipeline/ingest';

/** @placeholder */
export async function redraftResume(_jd: string): Promise<StructuredResume> {
  throw new Error('redraftResume: not implemented yet.');
}

/** CLI: parse --jd, ingest (URL or text), then redraft. Exits on IngestError or redraft failure. */
async function runCli(): Promise<void> {
  const argv = process.argv.slice(2);
  const jdIdx = argv.indexOf('--jd');
  if (jdIdx === -1 || argv[jdIdx + 1] === undefined) {
    console.error('Usage: pnpm run redraft -- --jd "<url-or-paste>"');
    process.exit(1);
  }
  const value = argv[jdIdx + 1].trim();
  const isUrl = value.startsWith('http://') || value.startsWith('https://');
  const input = isUrl ? { url: value } : { text: value };

  let jdText: string;
  try {
    jdText = await ingestJd(input);
  } catch (err) {
    if (err instanceof IngestError) {
      console.error('JD fetch failed; use Paste JD fallback:', err.message);
      process.exit(1);
    }
    throw err;
  }

  try {
    await redraftResume(jdText);
    // When implemented: write result (e.g. JSON or PDF path) and exit 0
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Redraft failed:', message);
    process.exit(1);
  }
}

// Run CLI when invoked with --jd (e.g. pnpm run redraft -- --jd "<url>"). Safe for tsx and CJS.
if (process.argv.includes('--jd')) {
  runCli();
}
