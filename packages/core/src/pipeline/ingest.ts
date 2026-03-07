/**
 * JD ingestion — fetches JD from URL or accepts pasted text.
 * On URL fetch failure (blocked, timeout, error), throws IngestError so the
 * caller can surface the Paste JD fallback path (non-negotiable per PRD).
 *
 * @placeholder — full implementation in a future story.
 */

export class IngestError extends Error {
  constructor(
    public readonly code: 'JD_URL_FETCH_FAILED' | 'JD_MISSING',
    message: string
  ) {
    super(message);
    this.name = 'IngestError';
  }
}

/** @placeholder */
export async function ingestJd(_input: { text?: string; url?: string }): Promise<string> {
  throw new Error('ingestJd: not implemented yet.');
}
