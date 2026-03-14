# Data Models – API (apps/api)

**Date:** 2026-03-14  
**Scan level:** Deep Scan

## Overview

The API and pipeline do **not** use a persistent database. All data is in-memory. Types live in `@repo/types` and `@repo/core`; layout limits in `packages/core/src/contract/mvp-template.ts`.

---

## Pipeline input and result

### PipelineInput (`@repo/core`)

| Field | Type | Description |
|-------|------|-------------|
| `jd?` | string | Raw JD text (direct; no ingest). |
| `text?` | string | Pasted JD (single entry with `url` via `ingestJd`). |
| `url?` | string | JD URL for fetch + redraft. |
| `structuredResume?` | StructuredResume | Pre-built resume; skips AI. |
| `profile?` | IdentityProfileInput | Identity: targetMarket or phone. |

### PipelineResult (`@repo/types`)

| Field | Type | Description |
|-------|------|-------------|
| `pdf` | Buffer | ATS PDF (Tagged PDF/UA). |
| `layoutPrep` | LayoutPrepMetadata | Constraint metadata + heatmap. |
| `visualPdf?` | Buffer | Visual PDF (Puppeteer). |
| `warnings` | PipelineWarning[] | Non-fatal (e.g. VISUAL_PDF_FAILED). |
| `suggestedFilename?` | string | e.g. `company_role_Resume.pdf`. |

### LayoutPrepMetadata

| Field | Type | Description |
|-------|------|-------------|
| `truncatedFields` | string[] | Field paths truncated (e.g. `summary`, `experience[2].bullets`). |
| `truncationDetails?` | Record<string, { originalLength, maxLength, strategy }> | Per-field detail. |
| `hadTruncation` | boolean | True if any truncation occurred. |
| `keywordHeatmap?` | KeywordHeatmap | ATS keyword coverage. |

### KeywordHeatmap

| Field | Type | Description |
|-------|------|-------------|
| `present` | string[] | Keywords found in resume. |
| `missing` | string[] | Keywords from JD not in resume. |
| `score` | number | Weighted coverage [0, 1]. |
| `sections` | { summary, experience, skills, education } | Per-section KeywordSection. |
| `tiers` | { hard, alias, contextual } | Per-tier present/missing (weights 1.0, 0.7, 0.3). |

### PipelineWarning

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | UPPER_SNAKE_CASE (e.g. VISUAL_PDF_FAILED). |
| `message` | string | Human-readable; no PII. |
| `details?` | unknown | Optional safe debug info. |

---

## Structured resume and identity

### StructuredResume (`@repo/types`)

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Full name. |
| `contact` | { email?, phone?, linkedin?, location? } | Contact block. |
| `headline` | string | One-line professional headline. |
| `targetRole?` | string | From JD; shown instead of headline at top. |
| `summary` | string | Professional summary. |
| `experience` | ExperienceEntry[] | Work history. |
| `education` | EducationEntry[] | Education. |
| `skills` | string[] | Flat list. |

### ExperienceEntry

| Field | Type |
|-------|------|
| `title` | string |
| `company` | string |
| `location?` | string |
| `startDate` | string |
| `endDate?` | string |
| `bullets` | string[] |

### EducationEntry

| Field | Type |
|-------|------|
| `degree` | string |
| `institution` | string |
| `location?` | string |
| `graduationDate?` | string |

### IdentityProfileInput

| Field | Type | Description |
|-------|------|-------------|
| `phone?` | string | Explicit phone; else from targetMarket. |
| `targetMarket?` | 'US' \| 'AU' | US → 424-388-9521, AU → 0403 905 751. |

### IdentityPillars (resolved in core)

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Static default (e.g. Chris Taylor). |
| `email` | string | Static default. |
| `phone` | string | From targetMarket or profile.phone. |

---

## Template contract (MVP)

**Source:** `packages/core/src/contract/mvp-template.ts` — `MVP_TEMPLATE_CONTRACT`.

| Field path | maxChars / maxLines | strategy |
|------------|---------------------|----------|
| `name` | 30 | trim |
| `headline` | 40 | ellipsis |
| `summary` | 600 | ellipsis |
| `experience[].title` | 55 | trim |
| `experience[].company` | 30 | trim |
| `experience[].bullets[]` | 150 | ellipsis |
| `education[].degree` | 45 | trim |
| `skills` | 16 lines | collapse |

Layout-prep (`applyConstraints`) enforces these before PDF render; visual PDF (HTML) has no character limits.

---

## Ingest and errors

- **ingestJd({ text?, url? }):** Returns single JD string. URL path: SSRF validation, 10s timeout; on failure throws `IngestError('JD_URL_FETCH_FAILED', message)`. Throws `IngestError('JD_MISSING', ...)` when neither text nor url provided.
- **IngestError:** `code: 'JD_URL_FETCH_FAILED' | 'JD_MISSING'` — API maps to 422/400 for client fallback.

*Generated using BMAD Method `document-project` workflow (Deep Scan).*
