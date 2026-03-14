# API Contracts – API (apps/api)

**Base URL:** Configured via `BASE_URL` / `PORT` (default `http://localhost:3001`).  
**CORS:** Allowed origins from `FRONTEND_ORIGIN` (comma-separated) and optional `FRONTEND_ORIGIN_PREVIEW`.  
**Body limit:** 2MB JSON.

---

## POST /api/scrape-jd

Scrape job description content from a URL (e.g. LinkedIn, Seek). Uses Firecrawl when `FIRECRAWL_API_KEY` is set; otherwise falls back to native fetch + HTML stripping. SSRF-safe: only `http`/`https`, no localhost or private IPs.

### Request

- **Content-Type:** `application/json`
- **Body:**
  - `url` (string, required): Job description URL.

### Response

- **200:** `{ "markdown": "<scraped markdown or plain text>" }`
- **400:** `{ "error": "MISSING_URL" | "INVALID_URL", "message": "..." }`
- **502:** `{ "error": "SCRAPE_FAILED", "message": "..." }`

### Scraper behavior (Deep Scan)

- **Firecrawl:** `@mendable/firecrawl-js`; returns `data.markdown` or unwrapped `markdown`.
- **Fallback:** Native `fetch` with 15s timeout, User-Agent `Mozilla/5.0 (compatible; ResumeBuilder/1.0)`; response body is stripped of script/style tags and HTML tags, entities decoded; `<title>` extracted as leading header.

---

## POST /api/run-pipeline

Run the resume pipeline. Accepts JD text/URL, pasted text, or structured resume JSON. Identity (name, email, phone) is resolved server-side from `profile.targetMarket` (US/AU) or `profile.phone`; name and email are core defaults.

### Request

- **Content-Type:** `application/json`
- **Body:** `PipelineInput` (from `@repo/core`):

| Field | Type | Description |
|-------|------|-------------|
| `jd?` | string | Raw job description text (used directly; no ingest). |
| `text?` | string | Pasted JD; can be combined with `url` via single `ingestJd({ text, url })`. |
| `url?` | string | JD URL for ingestion (fetch then redraft). |
| `structuredResume?` | object | Pre-built `StructuredResume`; skips AI redraft. |
| `profile?` | object | `IdentityProfileInput`: `{ targetMarket?: 'US' \| 'AU', phone?: string }`. |

At least one of `structuredResume`, `jd`, or (`text` or `url`) must be provided.

### Response (success 200)

- **pdf** (string): Base64-encoded ATS PDF (Tagged PDF/UA).
- **visualPdf?** (string): Base64 optional visual PDF (Puppeteer); may be absent with `VISUAL_PDF_FAILED` warning.
- **layoutPrep** (object): See [Data Models – API](./data-models-api.md) for `LayoutPrepMetadata` and `KeywordHeatmap`.
- **warnings** (array): `{ code: string, message: string }[]` — e.g. `VISUAL_PDF_FAILED`.
- **suggestedFilename?** (string): e.g. `company_role_Resume.pdf`.

### Error responses

- **400:** `{ "error": "MISSING_INPUT", "message": "..." }` or `{ "error": "JD_MISSING", "message": "..." }`
- **422:** `{ "error": "JD_URL_FETCH_FAILED", "message": "..." }` — client should offer Paste JD fallback (AC2).
- **500:** `{ "error": "PIPELINE_FAILED" | "MISSING_ANTHROPIC_KEY" | "INVALID_ANTHROPIC_KEY" | "REDRAFT_PARSE_FAILED" | ..., "message": "..." }`
- **503:** `{ "error": "ANTHROPIC_RATE_LIMITED", "message": "..." }`

### Pipeline execution (Deep Scan)

- **Structured path:** `structuredResume` → `applyConstraints` → `computeKeywordHeatmap` (empty JD keywords) → `buildPdf` → optional `renderVisualPdf`.
- **JD path:** `jd` or `ingestJd({ text, url })` → `extractJdKeywords` → `redraftResume` → same layout-prep and rendering.
- **Identity:** `resolveIdentityPillars(profile)` yields name, email, phone (US/AU defaults); redraft uses these verbatim.

*Generated using BMAD Method `document-project` workflow (Deep Scan).*
