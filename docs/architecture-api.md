# Architecture – API (apps/api)

**Part:** api (backend)  
**Root:** `apps/api`  
**Scan level:** Deep Scan

## Role

Thin Express server exposing the shared pipeline and JD scraping: `POST /api/run-pipeline`, `POST /api/scrape-jd`. No business logic beyond request validation and error mapping; pipeline and types live in `@repo/core` and `@repo/types`.

## Stack

- **Express 4.x:** JSON body limit 2MB, CORS origin from `FRONTEND_ORIGIN` (comma-separated) and optional `FRONTEND_ORIGIN_PREVIEW`; credentials allowed.
- **@repo/core:** `runPipeline`, `PipelineInput`, `IngestError`.
- **Scraper:** `apps/api/src/services/scraper.ts` — `scrapeJobDescription(url)`.

## Entry point

- `apps/api/src/index.ts`: builds Express app, mounts POST routes, listens on `PORT` (default 3001); in test env does not call `app.listen()`.

## Scraper (Deep Scan)

- **URL validation:** `isValidUrl(url)` — trim, valid URL; protocol `http`/`https` only; hostname not localhost, not 127.x, not private RFC 1918, not `[::1]`. Throws generic `Error('URL is required')` / `Error('Invalid URL')` for bad input.
- **Firecrawl:** When `FIRECRAWL_API_KEY` is set, uses `@mendable/firecrawl-js` with `formats: ['markdown']`; returns `data.markdown` or unwrapped `markdown`; on `success === false` throws with `error` message.
- **Fallback:** Native `fetch`, 15s timeout, User-Agent `Mozilla/5.0 (compatible; ResumeBuilder/1.0)`; response body passed to `htmlToText()`: strip script/style tags and all HTML tags, decode entities, extract `<title>` as header, collapse whitespace.

## Error handling

- **IngestError:** `JD_URL_FETCH_FAILED` → 422 (client Paste JD fallback); `JD_MISSING` → 400.
- **5xx/503:** `MISSING_ANTHROPIC_KEY`, `INVALID_ANTHROPIC_KEY`, `ANTHROPIC_RATE_LIMITED`, `REDRAFT_PARSE_FAILED`; generic `PIPELINE_FAILED` for unhandled errors.

See [Architecture (overview)](./architecture.md), [API Contracts](./api-contracts-api.md), and [Data Models](./data-models-api.md).

*Generated using BMAD Method `document-project` workflow (Deep Scan).*
