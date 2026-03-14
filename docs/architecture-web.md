# Architecture – Web (apps/web)

**Part:** web  
**Root:** `apps/web`  
**Scan level:** Deep Scan

## Role

Vite SPA for the resume builder: JD input (Paste JD, Paste Resume JSON, Job URL), Target Market (US/AU), and PDF download. Optimized for iOS Safari; PWA-friendly. All pipeline work is done by the API; frontend only collects input, calls API, and renders results.

## Stack

- **Vite 5.x,** TypeScript, **@repo/ui** (Header, Counter, setupCounter).
- **apps/web/src/api.ts:** API client, `PipelineResponse`, `buildPipelineProfile()`, `callScrapeJd`, `callRunPipeline`, `PipelineApiError`.
- **apps/web/src/pipeline.ts:** `renderPipeline()` (HTML), `attachPipelineListeners()` (tabs, URL flow, run, results).
- **apps/web/src/settings.ts:** Target Market in localStorage; `renderSettings()`, `attachSettingsListeners()`.

## Entry point

- `index.html` → Vite entry; `main.ts` mounts `#app` with Header, Settings, Pipeline, Counter and attaches all listeners.

## Input modes (Deep Scan)

1. **Paste JD:** Textarea with JD text → body `{ jd, profile }` → `callRunPipeline`.
2. **Paste Resume JSON:** Textarea with JSON → parse → body `{ structuredResume, profile }` → `callRunPipeline`.
3. **Job URL:** URL input → "Fetch & Preview" → `callScrapeJd(url)` → show scraped content; "Use this JD → Generate" → `callRunPipeline({ jd: scrapedJd, profile })`. On scrape failure (e.g. paywall, timeout), UI switches to Paste JD tab and shows: "Couldn't fetch that URL. Paste the job description below." (AC2).

## Error handling

- **PipelineApiError with code `JD_URL_FETCH_FAILED`:** Switch to Paste JD tab, set status message, focus textarea (no dead end on mobile).
- **Missing VITE_API_URL:** Run button disabled; hint "Set VITE_API_URL to your API server to run the pipeline."
- **Fetch failure:** Normalized to "Cannot reach API. Check that VITE_API_URL is set and FRONTEND_ORIGIN on the server matches this site's URL."

## State

- **Target Market:** `localStorage` key from `constants.STORAGE_KEYS.TARGET_MARKET`; US/AU; used in `buildPipelineProfile()` for every pipeline call.
- **Pipeline:** Current mode (jd | json | url) and scraped JD (when in URL flow) held in closure inside `attachPipelineListeners`.

See [Architecture (overview)](./architecture.md), [Integration Architecture](./integration-architecture.md), and [Component Inventory – Web](./component-inventory-web.md).

*Generated using BMAD Method `document-project` workflow (Deep Scan).*
