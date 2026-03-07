/**
 * JD ingestion — fetches JD from URL or accepts pasted text.
 * On URL fetch failure (blocked, timeout, error), throws IngestError so the
 * caller can surface the Paste JD fallback path (non-negotiable per PRD).
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

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Ingest a job description from either raw text (paste) or a URL.
 *
 * AC1 — both paths produce a single JD string that feeds the same redraft pipeline.
 * AC2 — on URL fetch failure (blocked, timeout, network error) throws IngestError
 *        with code JD_URL_FETCH_FAILED so the caller can trigger the Paste JD fallback.
 *
 * @throws {IngestError} JD_MISSING when neither text nor url is provided.
 * @throws {IngestError} JD_URL_FETCH_FAILED when URL fetch fails for any reason.
 */
export async function ingestJd(input: { text?: string; url?: string }): Promise<string> {
  const { text, url } = input;

  if (text !== undefined && text.trim().length > 0) {
    return text.trim();
  }

  if (url !== undefined && url.trim().length > 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url.trim(), { signal: controller.signal });
      if (!response.ok) {
        throw new IngestError(
          'JD_URL_FETCH_FAILED',
          `HTTP ${response.status} ${response.statusText} fetching JD from URL`
        );
      }
      const body = await response.text();
      return body;
    } catch (err) {
      if (err instanceof IngestError) throw err;
      // Network error, timeout (AbortError), or any other failure → fallback trigger
      const reason = err instanceof Error ? err.message : String(err);
      throw new IngestError('JD_URL_FETCH_FAILED', `Failed to fetch JD from URL: ${reason}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new IngestError('JD_MISSING', 'Either text or url must be provided to ingestJd.');
}
