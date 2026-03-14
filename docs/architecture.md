# Architecture – resume-builder-v1

## High-Level Overview

Resume-Builder-V1 is a **Turborepo monorepo** with a shared TypeScript core and multiple front-ends:

- `packages/core`: JD ingestion, AI redraft, layout-prep, keyword heatmap, and PDF rendering.
- `apps/api`: Express API exposing `/api/run-pipeline` and `/api/scrape-jd` for the web client.
- `apps/web`: Vite SPA for JD input and PDF download, optimized for iOS Safari.
- `apps/cli`: CLI wrapper over the same core pipeline (planned/partial).

The architecture is intentionally shaped as an **Experience MVP**: the product only “exists” if it can reliably deliver a **human-grade PDF** on a phone in under 3 minutes.

## Core Architectural Priorities

1. **iOS-to-PDF speed:** Web TTI ≤ 2s on mobile 5G, JD → PDF < 3 minutes (including AI).
2. **Perfect Spacing reliability:** Strict length constraints + deterministic layout ensure no widows/orphans or overflow.
3. **Shared core:** Single content pipeline and layout engine consumed by Web and CLI; no duplicated business logic.
4. **ATS-readability:** PDFs are tagged and fully searchable, using text-based rendering only (no image flattening).

## Monorepo Structure

- `packages/core`
  - `src/pipeline/run-pipeline.ts` – orchestrator (`runPipeline`) and `PipelineInput`/`PipelineResult` types.
  - `src/pipeline/ingest.ts` – JD ingestion with SSRF-safe URL fetching.
  - `src/ai/*` – JD keyword extraction and AI redraft.
  - `src/layout-prep/*` – template contract (`MVP_TEMPLATE_CONTRACT`), constraints (`applyConstraints`), and keyword heatmap.
  - `src/rendering/pdf/build-pdf.ts` – PDFKit-based ATS PDF renderer.
  - `src/rendering/html/render-visual-pdf.ts` – visual PDF (Puppeteer) renderer.
- `apps/api`
  - `src/index.ts` – Express server; CORS; `POST /api/run-pipeline`, `POST /api/scrape-jd`.
  - `src/services/scraper.ts` – JD scraper (Firecrawl or native fetch) with URL validation.
- `apps/web`
  - `src/api.ts` – API client, `PipelineResponse` type, `buildPipelineProfile`.
  - `src/pipeline.ts` – Pipeline UI component, results rendering, PDF download links.
- `apps/cli`
  - CLI entrypoint (thin wrapper around `runPipeline`, not yet feature-complete).

## Core Pipeline – `runPipeline`

The core orchestrator is implemented in [`packages/core/src/pipeline/run-pipeline.ts`](packages/core/src/pipeline/run-pipeline.ts).

### PipelineInput

```ts
export interface PipelineInput {
  jd?: string;            // direct JD text
  text?: string;          // pasted JD (with url via ingestJd({ text, url }))
  url?: string;           // JD URL for ingestion
  structuredResume?: StructuredResume; // bypass AI redraft
  profile?: IdentityProfileInput;      // includes targetMarket or phone
}
```

### Execution Paths

- **Structured resume path:**
  - If `structuredResume` is provided, `runPipeline` skips AI:
    - `applyConstraints` → `computeKeywordHeatmap` (with empty JD keywords) → `buildPdf` → optional `renderVisualPdf`.
- **JD redraft path:**
  - If `jd` is present, or `text`/`url` is provided:
    1. JD ingestion:
       - Direct `jd` or `ingestJd({ text, url })` from `src/pipeline/ingest.ts`.
    2. Keyword extraction: `extractJdKeywords(jdText)`.
    3. Identity resolution: `resolveIdentityPillars(profile)` → static name/email + phone from target market or override.
    4. AI redraft: `redraftResume(jdText, pillars, jdKeywords)` → `StructuredResume`.
    5. Layout-prep + heatmap:
       - `applyConstraints(structuredResume, MVP_TEMPLATE_CONTRACT)`.
       - `computeKeywordHeatmap(constraintResult.resume, jdKeywords)`.
    6. Rendering:
       - **ATS PDF:** `buildPdf(constraintResult.resume, keywordHeatmap)`.
       - **Visual PDF (optional):** `renderVisualPdf(constraintResult.resume, pillars)`; failures add `VISUAL_PDF_FAILED` warning.

### PipelineResult

`runPipeline` always returns a `PipelineResult`:

- `pdf: Buffer` – ATS-critical PDF (always present on success).
- `layoutPrep: LayoutPrepMetadata` – includes truncation metadata and `keywordHeatmap`.
- `warnings: { code: string; message: string }[]` – e.g. `VISUAL_PDF_FAILED`.
- `visualPdf?: Buffer` – optional, best-effort visual PDF.
- `suggestedFilename?: string` – slug derived from target role + recent employer.

## Layout-Prep and Template Contract

The **template contract** lives in `MVP_TEMPLATE_CONTRACT` and defines:

- Resume fields mapped to layout slots:
  - `name`, `headline`, `summary`, `experience[].title`, `experience[].company`, `experience[].bullets[]`, `skills`, etc.
- Per-field constraints:
  - `maxChars` and (optionally) line limits, sized to the A4 template.

`applyConstraints` enforces these limits before rendering:

- Truncates or summarizes over-long text (e.g. summary and bullets).
- Tracks:
  - `hadTruncation: boolean`
  - `truncatedFields: string[]`
  - `truncationDetails: Record<string, { before: number; after: number }>`

The layout engine (`buildPdf`) receives **only constrained content** and assumes all content fits the template.

## PDF Rendering – `buildPdf`

The PDF renderer is implemented in [`packages/core/src/rendering/pdf/build-pdf.ts`](packages/core/src/rendering/pdf/build-pdf.ts).

Key invariants:

- Uses **PDFKit** with:
  - `tagged: true`
  - `pdfVersion: '1.5'`
  - `subset: 'PDF/UA'`
  - All text written via `doc.text(...)` (no flattening to paths/images).
- Uses a single-page A4 layout with:
  - Consistent margins and line gaps.
  - Sections: Header, Summary, Experience, Education, Skills.
  - Logical structure elements (`Document`, `Sect`, `H`, `P`, `List`, `LI`) for accessibility and ATS-friendly parsing.
- Validates:
  - Non-negotiable sections (e.g., summary, skills) are present when `keywordHeatmap` marks them as required.
  - Throws if required sections are missing to keep layout and ATS assumptions honest.

## Web & API Integration

### API (`apps/api`)

- `POST /api/run-pipeline`:
  - Accepts any `PipelineInput` shape (structuredResume, jd, text, url, profile).
  - Calls `runPipeline(input)`.
  - Returns base64-encoded `pdf`, optional `visualPdf`, `layoutPrep`, `warnings`, and `suggestedFilename`.
  - Maps ingestion errors (`IngestError`) to 4xx:
    - `JD_MISSING` → 400.
    - `JD_URL_FETCH_FAILED` → 422.
  - Normalizes other known error codes (`MISSING_ANTHROPIC_KEY`, `INVALID_ANTHROPIC_KEY`, etc.) and falls back to `PIPELINE_FAILED`.

- `POST /api/scrape-jd`:
  - Accepts `{ url }`, validates it (http/https only, no localhost/private IPs).
  - Uses Firecrawl when `FIRECRAWL_API_KEY` is set; otherwise a native `fetch`-based scraper with HTML-to-Markdown/text conversion.
  - Returns `{ markdown }` on success; `MISSING_URL`, `INVALID_URL`, or `SCRAPE_FAILED` on error.

### Web (`apps/web`)

- `callRunPipeline(body)` in `src/api.ts`:
  - Wraps `POST /api/run-pipeline`, returning `PipelineResponse` with base64 PDFs and layout metadata.

- `renderPipeline` and `attachPipelineListeners` in `src/pipeline.ts`:
  - Three modes: Paste JD, Paste Resume JSON, Job URL.
  - For Job URL:
    - Calls `callScrapeJd(url)` to fetch JD markdown.
    - Shows a preview and then calls `callRunPipeline({ jd: scrapedJd, profile: buildPipelineProfile() })`.
    - On scrape failure, switches to Paste JD mode and prompts the user to paste JD (AC2).
  - Result rendering:
    - Converts base64 PDFs to blob URLs via `base64ToBlobUrl`.
    - Renders:
      - **ATS PDF:** Download and open links, using `suggestedFilename` when provided.
      - **Visual PDF:** Separate download/open links when present.
    - Displays keyword heatmap summary and any warnings.

## Security & Data Handling

- **Secrets:** `ANTHROPIC_API_KEY` and `FIRECRAWL_API_KEY` are read from environment; never exposed to the client.
- **Data retention:** JD and resume content are processed in memory and short-lived storage only; no database in MVP.
- **SSRF protection:**
  - `ingestJd` and `scrapeJobDescription` both validate URLs, disallowing:
    - Non-http/https schemes.
    - `localhost`, `127.0.0.1`, `.localhost` subdomains.
    - Private and loopback IP ranges and `::1`.

## Validation & Verification

- Tests in `packages/core` verify:
  - JD ingestion behavior and IngestError semantics.
  - Keyword extraction and heatmap (`computeKeywordHeatmap`).
  - Layout-prep and truncation rules (`applyConstraints`).
  - PDF generation correctness (`build-pdf.test.ts`).
  - Pipeline integration (`pipeline.integration.test.ts`), including:
    - `runPipeline` wiring to `buildPdf`.
    - `VISUAL_PDF_FAILED` warning behavior when Puppeteer is unavailable.
    - Truncation metadata behavior and ATS text presence in the PDF.

- `scripts/verify.sh` runs:
  - Core tests, API tests (including `/api/run-pipeline` and `/api/scrape-jd`), and a strict layout/ATS simulation gate.
  - This script is the mandatory gate before claiming any story “done”.

## Future Work (Post-MVP)

- Harden and flesh out `apps/cli` to parity with Web.
- Expand templates beyond MVP while keeping the same template contract pattern.
- Introduce optional persistence and richer analytics (ATS scoring, success tracking) with careful attention to privacy.
