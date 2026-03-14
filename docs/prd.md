# Product Requirements Document – resume-builder-v1

## Executive Summary

Resume-Builder-V1 is a dual-interface product (CLI + Web) that turns job descriptions and structured input (JSON/Markdown) into ATS-optimized resume content and renders it as a **local PDF**. The primary experience is mobile: a job seeker on iOS pastes a JD (or a job URL), and within three minutes has a **human-grade, ATS-readable PDF** ready in the browser, with no manual layout fixes.

The key differentiator is the combination of **ATS-aware content generation** and a **strict layout engine (“Perfect Spacing”)** backed by a shared core pipeline. A single structured resume representation drives PDF output for both Web and CLI.

## Project Classification

| Attribute        | Value                                                                                                   |
|-----------------|---------------------------------------------------------------------------------------------------------|
| Project type     | CLI + Web (CLI: core engine / automation; Web: JD input and PDF download). PDF is the primary output. |
| Domain           | Productivity / document generation                                                                     |
| Complexity       | Medium (local PDF generation, two interfaces, shared core)                                            |
| Context          | Greenfield                                                                                             |

## Success Criteria

### User Success

- **Mobile “aha” moment:** On iOS, a user can paste a JD or URL and receive a **perfectly formatted resume PDF** in the browser in under **3 minutes**.
- **Zero manual layout fixes:** Users never need to fix widows, orphans, or awkward white space in the generated PDF.
- **ATS confidence:** Users trust that the resume is ATS-friendly without having to manually hunt for keywords.

### Technical Success

- **Single source of truth:** One structured resume (JSON/Markdown) powers the PDF output for both Web and CLI.
- **Scraping resilience:** If URL-based JD fetch fails, the Web UI offers a seamless **Paste JD fallback** with no dead ends.
- **Strict layout engine:** A dedicated layout-prep step enforces length constraints so PDFs never overflow the template.
- **PDF quality:** Generated PDFs are **tagged**, fully **searchable**, and suitable for ATS parsing.

### Measurable Outcomes

| Outcome                      | Target                                                                 |
|-----------------------------|------------------------------------------------------------------------|
| JD → PDF (mobile)           | < 3 minutes end-to-end; Web TTI ≤ 2s on mobile 5G                     |
| Layout quality              | No user-reported widows, orphans, or layout overflows                 |
| URL failure handling        | Paste JD fallback always available when URL fetch fails               |

## Product Scope

### MVP – Experience MVP

**In scope for v1:**

- **iOS-friendly Web SPA (PWA-ready):**
  - JD input via **Paste JD** or **Job URL**.
  - URL mode uses a server-side scraper (`/api/scrape-jd`) and, on failure, falls back to Paste JD.
- **Target Market toggle:** Web UI toggle (US/AU) that influences the phone number injected into the resume. Static identity pillars:
  - Name: `Chris Taylor`
  - Email: `christaylorau23@gmail.com`
  - Phone: `424-388-9521` (US) or `0403 905 751` (AU) via `profile.targetMarket`.
- **JD-to-Resume AI redrafting:**
  - Single JD per run.
  - ATS keyword extraction and tiering (hard vs contextual keywords).
  - Natural keyword weaving into summary, bullets, and skills.
- **Perfect Spacing layout contract:**
  - Character and/or line limits per field (headline, summary, bullets, skills, etc.).
  - Layout-prep step truncates or summarizes content so no field exceeds limits.
- **Local PDF generation:**
  - PDFKit-based renderer that produces **tagged, searchable PDFs**.
  - Same structured resume powers both ATS PDF and a visual PDF variant.
- **CLI interface:**
  - Accepts JD as file, inline text, or URL.
  - Produces the same PDF output as the Web, via the shared core pipeline.

**Explicitly out of MVP:**

- Native iOS app (Swift/SwiftUI, App Store).
- Shell completion and advanced CLI ergonomics.
- Enhanced ATS scoring dashboards or analytics.
- Full browser automation (one-click LinkedIn → PDF).

## User Journeys (Summary)

### Journey 1 – Jordan (Web, success path)

1. Jordan opens the Web app on an iPhone after receiving a job notification.
2. They paste the JD or a job URL.
3. The system runs JD → keywords → AI redraft → layout-prep → PDF.
4. Within three minutes, Jordan downloads an ATS-ready PDF from the browser and uses it to apply.

### Journey 2 – Jordan (Web, URL blocked)

1. Jordan pastes a job URL.
2. The scraper fails (paywall, auth, or bot protection).
3. The Web UI offers a clear **Paste JD** fallback (no dead end).
4. Jordan pastes JD text and completes the same pipeline to obtain a PDF.

### Journey 3 – Sam (CLI / automation)

1. Sam has a batch of JDs and wants to generate PDFs programmatically.
2. They run the CLI with JDs (files or URLs).
3. The CLI calls the same `runPipeline` core function and writes PDFs locally.

## Functional Requirements (MVP)

### JD Input & Ingestion

- **FR1:** Web – user can paste JD text.
- **FR2:** Web – user can submit a job URL to be scraped into JD text.
- **FR3:** Web – if URL fetch fails, the UI offers a Paste JD fallback and does not dead-end.
- **FR4:** CLI – user can provide JD via file, inline text, or URL.
- **FR5:** User can provide an existing structured resume (JSON/Markdown) to be rendered as PDF without re-running AI.

### Content Generation (AI)

- **FR6:** System extracts ATS-relevant keywords from the JD, including a **hard** tier (Tier 1).
- **FR7:** System generates a structured resume (JSON/Markdown) from the JD and identity pillars.
- **FR8:** Hard keywords are woven naturally into the summary and bullets without stuffing.
- **FR9:** Structured resume is the only source used by the PDF engine.

### Layout & Formatting

- **FR10:** A single high-impact resume template is defined, with explicit per-field character limits.
- **FR11:** A layout-prep step `applyConstraints` enforces those limits and records truncation metadata.
- **FR12:** PDF never overflows the template; truncated fields are reported in metadata.

### PDF Generation

- **FR13:** PDF generator (`buildPdf`) produces tagged, searchable PDFs using PDFKit.
- **FR14:** Web UI can download/open the PDF in-browser (ATS PDF, and optionally a visual PDF).
- **FR15:** CLI writes PDFs to disk in a configurable output path.

### Web Experience

- **FR16:** SPA with no full page reloads, optimized for iOS Safari.
- **FR17:** Target Market toggle (US/AU) wired to `profile.targetMarket` in the pipeline request.
- **FR18:** Results view shows:
  - ATS PDF download/open links.
  - Keyword heatmap summary.
  - Any warnings from `runPipeline`.

### CLI Experience

- **FR19:** CLI supports interactive and non-interactive usage.
- **FR20:** CLI can print or save structured resume and layout-prep metadata for debugging.

## Non-Functional Requirements

- **NFR-A1 (Accessibility):** High contrast, minimum 44pt touch targets on iPhone, semantic HTML and ARIA where needed.
- **NFR-P1 (Performance):** JD → PDF under 3 minutes; Web TTI ≤ 2s on mobile 5G.
- **NFR-S1 (Security):** API keys in env/.env only; never logged or sent to the browser. No long-term storage of JD or resume.
- **NFR-R1 (Resilience):** URL scraping failures always lead to a functional Paste JD path.

## Implementation Notes

- Shared core lives in `packages/core`, exposing `runPipeline(input, options)` and the `PipelineResult` contract.
- Web (`apps/web`) and API (`apps/api`) are thin clients over this core; CLI (in `apps/cli`) uses the same pipeline in-process.
- Verification gate: `bash scripts/verify.sh` (tests, layout simulation, ATS checks) must pass before claiming features complete.
