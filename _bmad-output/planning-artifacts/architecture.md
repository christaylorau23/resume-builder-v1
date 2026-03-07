---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - docs/project-context.md
workflowType: 'architecture'
project_name: 'resume-builder-v1'
user_name: 'User'
date: '2026-03-07'
lastStep: 8
status: 'complete'
completedAt: '2026-03-07'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Architectural Priority (Experience MVP)

The PRD defines an **Experience MVP**: the product only exists if it can consistently deliver a human-grade PDF on the user's phone while they're on the go. Architecture must therefore **prioritize**:

1. **iOS-to-PDF speed** — Web TTI ≤ 2s on mobile 5G; end-to-end JD → PDF in under 3 minutes in the mobile browser. Stack and hosting choices must support fast cold start and low latency on mobile (e.g. edge or low-latency regions). No design that trades this for post-MVP features.
2. **Perfect Spacing reliability** — Strict layout rules so PDF has no widows, orphans, or awkward white space; output must look human-crafted every time. The layout engine is deterministic and testable; content/layout separation is non-negotiable (project-context and PRD). PDF must use searchable text (no flattening) for 100% ATS readability.
3. **Shared core for consistency** — One content pipeline and one layout engine for both CLI and Web so output quality and Perfect Spacing are identical; no duplicate layout or content logic.

Post-MVP capabilities (multiple Canva templates, enhanced ATS scoring, richer Web UI, shell completion, full browser automation) must not drive architectural decisions that compromise the above.

### Requirements Overview

**Functional Requirements (28 total):**

- **JD Input & Ingestion (5):** Web paste and URL submit; fallback to paste when URL fails (non-negotiable on mobile). CLI file/inline/URL. Optional path: structured JSON/Markdown in without re-running AI.
- **Content Generation / AI (4):** Single-JD → ATS-optimized resume; keyword extraction and natural weaving; structured output (JSON/Markdown) as single source for layout and export.
- **Layout & Formatting (3):** Strict layout rules (no widows/orphans); one high-impact template; content length limits and truncation so layout never overflows (PDF + Canva).
- **PDF Generation (2):** Local PDF from structured content; searchable text only (no flattening) for ATS. Web download and CLI file output.
- **Canva Export (3):** One template via Canva API; field mapping within length limits; export from Web and/or CLI when configured.
- **Web Experience (3):** SPA (no full reloads); iOS Safari mobile-friendly; PDF download in browser.
- **CLI Experience (5):** Interactive and non-interactive; PDF and Canva output; Markdown/JSON for debugging/piping.
- **Configuration (2):** API keys via env/.env; template preferences and Canva ID via config file.
- **Shared Core (1):** Single content pipeline and layout engine for Web and CLI.

**Non-Functional Requirements:**

- **Performance:** End-to-end < 3 min (JD → PDF); Web TTI ≤ 2s on mobile 5G; same target when falling back to Paste JD.
- **Accessibility:** High contrast; minimum 44pt touch targets on iPhone.
- **Security:** API keys outside codebase, not in logs or client; no long-term retention of JD/resume; data only to PDF/Canva paths user chooses.
- **Integration:** Canva failure must not block PDF delivery; URL fetch failure must degrade to Paste JD so the flow always completes.

### Scale & Complexity

- **Primary domain:** Full-stack (Web SPA + CLI + shared core); document generation and layout; external APIs (Canva, optional JD fetch).
- **Complexity level:** Medium — two interfaces, one shared pipeline, strict layout engine, mobile-first performance, single Canva template in MVP.
- **Estimated architectural components:** JD ingestion (Web + CLI); AI content service; structured schema + content/layout contract; layout/formatting engine; PDF generator; Canva mapping + API client; config (env + config file). Web SPA and CLI as thin front-ends to shared core.

### Technical Constraints & Dependencies

- **Project context (docs):** Architecture must strictly separate AI content generation from layout enforcement; PDF/layout stack must yield 100% ATS-readable searchable text; shared core so CLI and Web use the same content and layout pipelines.
- **Data:** In-memory or short-lived storage; no long-term retention in MVP.
- **Canva:** Official API only; one template in MVP with explicit mapping and length limits; timeout/error handling so PDF is still delivered if Canva fails.
- **Config:** `.env` for secrets; `config.json` for template/Canva IDs; shared where applicable to avoid drift.

### Cross-Cutting Concerns Identified

- **Content vs layout separation** — AI produces content; layout engine only constrains display. Contract (schema + length limits) between them; overflow handled in content/schema layer.
- **Single source of truth** — One structured output (JSON/Markdown) feeds both PDF and Canva; mapping and truncation rules keep Canva layout intact.
- **Mobile-first performance** — TTI and cold start affect front-end and backend/hosting choices; no blocking work before UI is interactive.
- **Graceful degradation** — URL fetch failure → Paste JD; Canva failure → PDF still available. Architecture must support fallback paths without dead ends.
- **Determinism and testability** — Layout engine and mapping rules must be deterministic and testable (fixed template, known constraints).

## Starter Template Evaluation

### Primary Technology Domain

Full-stack + CLI: Web SPA (iOS-first, TTI ≤2s) and CLI as two front-ends to a shared core (content pipeline + layout engine). Monorepo with shared packages and apps.

### Starter Options Considered

- **Turborepo (with-vite):** `npx create-turbo@latest -e with-vite` — Monorepo with Vite SPA for fast TTI; apps/ + packages/; supports shared core + web + CLI. Best fit for Experience MVP.
- **Turborepo (basic):** `npx create-turbo@latest` — Same monorepo benefits; default Next.js apps heavier for TTI; would require adding or replacing with Vite.
- **Vite only:** Single SPA; no monorepo; core and CLI would require custom layout.
- **Next.js only:** Single app; API routes possible but shared core + CLI separate; TTI typically heavier than Vite.

### Selected Starter: Turborepo (with-vite example)

**Rationale for Selection:** Aligns with Experience MVP: Vite SPA minimizes TTI for iOS; Turborepo provides packages/ for shared core (content + layout + PDF) and apps/ for web and CLI. One TypeScript core package consumed by both interfaces; PDF generation (searchable text) lives in Node in core. Post-MVP features (multiple Canva templates, etc.) do not conflict with this structure.

**Initialization Command:**

```bash
npx create-turbo@latest -e with-vite
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:** TypeScript across repo; Node for core and CLI; browser for Vite app.

**Styling Solution:** To be decided in later steps (e.g. Tailwind); Vite supports CSS/PostCSS and common CSS-in-JS options.

**Build Tooling:** Vite for web app; Turborepo for task orchestration and caching; shared packages built as needed (tsc or Vite library mode).

**Testing Framework:** To be added; Vitest aligns with Vite and Node; core package testable with Vitest or Jest.

**Code Organization:** apps/ (web, cli) and packages/ (core, optional shared-types); core exports pipeline and layout API; web and CLI are thin consumers.

**Development Experience:** Turborepo dev pipeline; Vite dev server for web; CLI run via Node/ts-node or oclif against local core.

**Note:** Project initialization using this command should be the first implementation story. Add apps/cli (e.g. via oclif generate or minimal Node CLI) and ensure packages/core implements the content pipeline and layout engine with no layout logic in front-ends.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- PDF generation library (tagged, searchable text for 100% ATS compatibility).
- Layout engine design: how character limits from the template contract are enforced on AI output.
- Shared core API: content pipeline and layout engine interface consumed by Web and CLI.
- Template contract: per-section character/line limits for the single MVP template.

**Important Decisions (Shape Architecture):**
- Web backend shape (serverless/edge vs small Node server for pipeline execution).
- JD ingestion (URL fetch vs paste-only fallback; error handling).
- Canva integration (sync vs fire-and-forget; failure must not block PDF).
- Config and secrets (.env + config.json) location and loading.

**Deferred Decisions (Post-MVP):**
- Multiple Canva templates and mapping specs.
- Enhanced ATS scoring; shell completion; full browser/LinkedIn automation.
- Database or persistent storage (MVP uses in-memory/short-lived only).

### PDF Generation (Deep-Dive & Decision)

**Requirement:** Generated PDFs must be tagged, searchable text (not flattened) so ATS systems can parse with high accuracy. Project context and NFR explicitly require 100% ATS-readable searchable text.

**Research summary:**
- **ATS parsing:** Modern ATS (Greenhouse, Lever, Workday) parse text-based PDFs well when text is in a real text layer, single-column, standard fonts. Design-tool exports that flatten text to images have very low parse success; LaTeX-style PDFs with structural metadata and clean text layers perform well.
- **Tagged PDF / PDF/UA:** Tagged PDF provides logical structure (headings, paragraphs, lists) and reading order; PDF/UA (ISO 14289-1) is the accessibility standard that extends Tagged PDF. Tagged documents improve extraction accuracy and screen-reader compatibility.
- **pdf-lib:** Does **not** support creation or editing of Tagged PDFs or PDF/UA (open issue, unresolved). `flatten()` has known issues (font loss, blank text). Not suitable for ATS-critical resume PDFs.
- **PDFKit:** Supports **Tagged PDF and PDF/UA** when creating the document: pass `tagged: true`, `pdfVersion: '1.5'` (or higher), and `subset: 'PDF/UA'`; provide document title and logical structure (e.g. `doc.struct('P', ...)`, `doc.markStructureContent('P')`). Text drawn with `doc.text()` is real text, not flattened. No `flatten()` step—output is natively searchable and structure-aware. Well-maintained (v0.17.2), Node and browser, 2.1M+ weekly downloads.

**Decision:** Use **PDFKit** (current stable v0.17.2) for all resume PDF generation in `packages/core`.

**Configuration:**
- Create all resume PDFs with `tagged: true`, `pdfVersion: '1.5'`, `subset: 'PDF/UA'`, and a document title.
- Build logical structure (e.g. Sect, P, H, List/LI) so reading order and sections are explicit.
- Do **not** flatten the document; do not convert text to paths or images. All text remains as embedded text for ATS and accessibility.
- Font embedding: use standard, ATS-friendly fonts (e.g. embedded TrueType/OpenType) for consistent parsing across systems.

### Layout Engine: Enforcement of Character Limits from AI Output

**Requirement:** The layout engine must strictly enforce character (and line) limits so that PDF and Canva output never overflow, break layout, or require manual fixes. Limits are defined by the template; AI output may exceed them. Overflow must be handled in the content/schema layer so the layout engine never receives over-length content (PRD and project context).

**Design:**

1. **Template contract (single source of truth for limits)**  
   For each supported template (one in MVP), define a **mapping spec** that includes:
   - Which structured fields map to which layout elements (e.g. `headline`, `summary`, `experience[].title`, `experience[].bullets[]`, `skills`).
   - **Per-field constraints:** maximum character count and/or maximum line count (e.g. headline 80 chars, summary 400 chars, each bullet 120 chars, etc.). These limits are derived from the actual template layout (PDF and Canva) so that one contract serves both outputs.

2. **Layout-prep / constraint step (runs after AI, before layout)**  
   A dedicated step in the content pipeline (inside `packages/core`):
   - **Input:** Structured resume content (JSON/Markdown) from the AI redraft step.
   - **Process:** For each field in the template contract, apply the limit: if content exceeds the limit, **truncate or summarize** using deterministic rules (e.g. trim with ellipsis, or collapse extra bullets into "Key points: …"). Rules are explicit and consistent (same logic for PDF and Canva).
   - **Output:** A **constrained** copy of the resume that satisfies every template limit. No field exceeds its max chars/lines.

3. **Layout engine (consumes only constrained content)**  
   - **Input:** Only the constrained resume from the layout-prep step.
   - **Responsibility:** Render the single template with strict layout rules (widows, orphans, spacing, line breaks). It does **not** perform truncation or overflow handling; it assumes all input is already within limits.
   - **Result:** Deterministic, testable layout. Same constrained content drives both PDF (via PDFKit) and Canva mapping; Perfect Spacing is guaranteed because the layout engine never receives content that could break the template.

4. **Schema validation (optional but recommended)**  
   Validate AI output and constrained output against a JSON schema (or equivalent) that encodes the template contract. Fail fast if the contract is violated before or after the constraint step. Ensures the layout engine never sees invalid or over-length data.

**Summary:** Template contract defines limits → layout-prep step enforces them on AI output → layout engine only renders constrained content. Character limits are thus strictly enforced in a single, testable place (layout-prep) so the layout engine remains simple and reliable.

### Data Architecture

- **Storage:** No database in MVP. JD and generated resume processed in memory or short-lived storage; no long-term retention. Aligns with NFR-S2.
- **Data model:** Structured resume schema (JSON) as the single source of truth; fields and types align with template contract and layout-prep rules.
- **Validation:** JSON schema (or equivalent) for resume structure and, where useful, for template contract (field max lengths). Validation applied after AI output and after layout-prep.
- **Caching:** Not required for MVP; optional in-memory cache for repeated identical JD/content in same session only if needed for performance.

### Authentication & Security

- **Authentication:** None for MVP. No user accounts or login.
- **API keys:** Stored outside codebase (environment or `.env`); never logged or exposed to client (NFR-S1). Both CLI and Web backend (if any) read from same env.
- **Data:** Resume and JD not shared beyond PDF/Canva export paths chosen by the user; no third-party analytics or retention.

### API & Communication Patterns

- **Internal pipeline:** Core exposes a single pipeline API (e.g. `runPipeline(input: JD | StructuredResume) => { pdfBuffer, canvaExport? }`). Web and CLI call this (CLI in-process; Web via backend or serverless function).
- **JD fetch:** When user supplies URL, attempt fetch with timeout; on failure (blocked, timeout, error) return clear failure and require Paste JD path (NFR-I2). No retry complexity in MVP.
- **Canva API:** Call Canva after PDF is ready; on timeout/error do not block PDF delivery (NFR-I1). Optional fire-and-forget or best-effort; user always gets PDF.
- **Error handling:** Structured errors for "URL failed", "Canva failed", "AI failed"; Web shows clear messaging and Paste JD option; CLI returns exit codes and messages.

### Frontend Architecture

- **Web (Vite SPA):** Single-page app; no full reloads. State: current step (input → processing → result), JD text, optional URL, generated PDF blob/link. Minimal state; no global store required for MVP unless needed for TTI (e.g. lazy load heavy deps after first paint).
- **Routing:** Simple (e.g. single view or minimal routes for paste vs URL). No SSR; static or client-rendered only.
- **Performance:** TTI ≤ 2s on mobile 5G—achieved via Vite, small initial bundle, and deferring pipeline work to backend/serverless so the UI becomes interactive immediately. Show loading state while pipeline runs (target < 3 min end-to-end).
- **Accessibility:** High contrast, minimum 44pt touch targets (NFR-A1, NFR-A2). Semantic HTML and ARIA where needed.
- **CLI:** No frontend; oclif or minimal Node CLI that invokes core pipeline and writes PDF (and optionally triggers Canva).

### Infrastructure & Deployment

- **Web hosting:** Chosen to support fast cold start and low latency on mobile (e.g. edge or low-latency region). Exact provider deferred to implementation; Vite app can be static host + serverless/edge for pipeline, or small Node server.
- **Environment:** `.env` for API keys; `config.json` for template preferences and Canva template ID. Loaded by core; CLI and Web backend use same config where applicable.
- **CI/CD:** To be defined in implementation; verification script (`scripts/verify.sh`) must pass before claiming done (project rules).
- **Monitoring/logging:** No requirement for MVP; avoid logging resume or JD content; log only errors and non-sensitive metadata.

### Decision Impact Analysis

**Implementation sequence:**
1. Monorepo + Turborepo (with-vite); add `packages/core` and `apps/cli`.
2. Define resume schema and template contract (field list + character/line limits for MVP template).
3. Implement layout-prep (constraint step) and layout engine in core; integrate PDFKit with tagged/PDF/UA options.
4. Implement content pipeline (JD ingestion → AI redraft → layout-prep → layout engine → PDF + optional Canva).
5. Web app: minimal SPA that submits JD and displays/downloads PDF; backend or serverless runs pipeline.
6. CLI: thin wrapper that calls core pipeline; config and output paths.

**Cross-component dependencies:**
- Template contract drives layout-prep rules and layout engine assumptions; both PDF and Canva use the same constrained output.
- PDFKit and layout engine both consume constrained content; no circular dependency.
- Web and CLI depend only on core pipeline API; no dependency between Web and CLI.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical conflict points identified:** Shared Core API contract, pipeline return shape, layout-prep metadata, Canva error isolation, naming (code vs files vs API), and error/response formats. The following patterns ensure all agents implement the same contracts and behaviors.

### Shared Core API (Strict Pattern)

**Every pipeline run MUST return a single standardized result object.** No variant return types; no throwing on Canva failure. This object is the only way Web and CLI consume pipeline output.

**Standardized pipeline result type (TypeScript shape):**

```ts
interface PipelineResult {
  /** PDF buffer; always present when pipeline completes without fatal error. */
  pdf: Buffer;
  /** Metadata from the layout-prep (constraint) step. Required on every run. */
  layoutPrep: LayoutPrepMetadata;
  /** Canva export result, only if Canva call succeeded. Absent if skipped or failed. */
  canva?: CanvaExportResult;
  /** Non-fatal issues. Canva failure goes here; pipeline still returns PDF. */
  warnings: PipelineWarning[];
  /** Fatal error only if PDF could not be produced (e.g. AI or layout engine threw). */
  error?: never;
}

interface LayoutPrepMetadata {
  /** Which fields were truncated (e.g. "summary", "experience[2].bullets"). */
  truncatedFields: string[];
  /** Per-field truncation detail: field path → { originalLength, maxLength, strategy }. */
  truncationDetails?: Record<string, { originalLength: number; maxLength: number; strategy: 'trim' | 'ellipsis' | 'collapse' }>;
  /** Whether any truncation occurred (convenience). */
  hadTruncation: boolean;
  /** Optional ATS keyword heatmap: JD keywords present/missing in resume (verify ATS before rendering). */
  keywordHeatmap?: { present: string[]; missing: string[]; score?: number };
}

interface PipelineWarning {
  code: string;   // e.g. 'CANVA_EXPORT_FAILED', 'JD_URL_FETCH_FAILED'
  message: string;
  details?: unknown; // e.g. { statusCode, timeout } for Canva
}
```

**Rules:**

- The core pipeline function (e.g. `runPipeline(input)`) MUST return a value that conforms to `PipelineResult` (or the language equivalent). It MUST NOT return a bare `{ pdfBuffer }` or overloaded shapes.
- `layoutPrep` MUST be populated on every successful run from the layout-prep step output (truncated fields, details, hadTruncation). If no truncation occurred, `truncatedFields` is `[]` and `hadTruncation` is `false`.
- `pdf` MUST be present whenever the pipeline completes the content → layout-prep → layout engine → PDF path. If a fatal error occurs before PDF is generated, the pipeline throws or returns a distinct error result type (per error-handling pattern below); it does not return a partial `PipelineResult` without `pdf`.
- `canva` is optional. It is set only when the Canva API call succeeds. It is never set when the user did not request Canva or when the Canva call fails.
- `warnings` MUST include a `PipelineWarning` for every non-fatal failure (e.g. Canva timeout, Canva API error). Canva failure MUST NOT remove or delay `pdf`; it MUST only add a warning.

### Canva Error Handling (Never Interrupt PDF)

**Rule:** Canva API failure MUST NOT interrupt or block core PDF generation. PDF is always produced first; Canva is always best-effort after PDF.

**Pattern:**

1. **Order of operations:** Run the pipeline in this order: JD ingestion (or accept structured input) → AI redraft → layout-prep → layout engine → **generate PDF** → (optional) call Canva API.
2. **Isolation:** Wrap the Canva API call in a try/catch (or equivalent). Do not allow Canva errors to propagate to the caller as uncaught exceptions. Catch all errors (network timeout, 4xx/5xx, auth errors).
3. **Result:** On Canva success: set `result.canva = { ... }` and do not add a warning. On Canva failure: do not set `result.canva`; append to `result.warnings` exactly one `PipelineWarning` with `code: 'CANVA_EXPORT_FAILED'` and a safe `message` (no PII). Optionally set `details` (e.g. `{ statusCode, timeout }`) for debugging. Do not include API keys or tokens in `message` or `details`.
4. **No retries in MVP:** On Canva failure, do not retry within the same pipeline run; record the warning and return the result with `pdf` and `layoutPrep` populated.
5. **Caller contract:** Web and CLI MUST treat the presence of `pdf` as success for "user gets a PDF"; they MAY show a non-blocking notice if `warnings` contains `CANVA_EXPORT_FAILED`.

**Anti-pattern:** Throwing or rejecting the pipeline promise when Canva fails, or returning without `pdf` when only Canva failed.

### Naming Patterns

**Code (TypeScript/JavaScript):**
- **Variables, properties, functions:** `camelCase` (e.g. `layoutPrep`, `truncatedFields`, `runPipeline`).
- **Types, interfaces, classes:** `PascalCase` (e.g. `PipelineResult`, `LayoutPrepMetadata`).
- **Constants (config, enum-like):** `UPPER_SNAKE_CASE` (e.g. `CANVA_EXPORT_FAILED`) for warning/error codes only; other constants may use `camelCase` or `UPPER_SNAKE` per team preference, but warning codes MUST be `UPPER_SNAKE`.

**Files and directories:**
- **Files:** `kebab-case` (e.g. `layout-prep.ts`, `run-pipeline.ts`). Exceptions: `index.ts`, config files (`config.json`).
- **Directories:** `kebab-case` (e.g. `packages/core`, `apps/web`). Turborepo `apps/` and `packages/` are lowercase.

**API and schema:**
- **JSON fields (resume schema, API response):** `camelCase` to match TypeScript (e.g. `truncatedFields`, `layoutPrep`). Exception: if an external API (e.g. Canva) requires different casing, map at the boundary only.
- **Pipeline result and layout-prep metadata:** Use the exact property names defined in the Shared Core API (e.g. `layoutPrep`, `truncatedFields`, `warnings`).

### Structure Patterns

**Project organization:**
- **Core:** `packages/core` contains pipeline, layout-prep, layout engine, PDF generation, template contract, and resume schema. No UI. Entry: a single pipeline function (e.g. `runPipeline`) that returns `PipelineResult`.
- **Tests:** Co-located with source where possible (e.g. `layout-prep.test.ts` next to `layout-prep.ts`). Integration tests for the full pipeline in `packages/core` (e.g. `__tests__/` or `tests/` at package root).
- **Web:** `apps/web` — Vite SPA; calls backend or serverless that invokes core. No duplicate layout or content logic.
- **CLI:** `apps/cli` — thin wrapper; parses args, loads config, calls `runPipeline`, writes `result.pdf` to disk; optionally surfaces `result.warnings` and `result.layoutPrep` (e.g. stderr or verbose flag).

**File structure within core:**
- **Template contract:** Single module or file (e.g. `template-contract.ts` or `contracts/mvp-template.ts`) defining limits and mapping; consumed by layout-prep and layout engine.
- **Layout-prep:** Dedicated module that takes raw resume + contract and returns constrained resume + `LayoutPrepMetadata`; no PDF or Canva logic.
- **Pipeline orchestrator:** One function that runs steps in order, builds `PipelineResult`, and applies the Canva error-handling pattern (try/catch, warnings, never block PDF).

### Format Patterns

**Pipeline result (already defined above):** Standardized object with `pdf`, `layoutPrep`, `canva?`, `warnings`. No ad-hoc shapes.

**Errors:**
- **Fatal (pipeline could not produce PDF):** Throw an error or return a discriminated union (e.g. `{ ok: false, error: { code, message } }`). Do not return `PipelineResult` without `pdf` for fatal cases; use a separate type so callers can branch.
- **Non-fatal (e.g. Canva failed):** Never throw; only add to `warnings` and return a full `PipelineResult` with `pdf` and `layoutPrep`.
- **Error codes:** Use consistent codes: `CANVA_EXPORT_FAILED`, `JD_URL_FETCH_FAILED`, `AI_REDRAFT_FAILED`, `LAYOUT_PREP_VALIDATION_FAILED`, etc. All in `UPPER_SNAKE_CASE`.

**Logging:** Do not log resume text, JD text, or API keys. Log only error codes, non-sensitive metadata (e.g. "Canva export failed", "layout-prep truncated 3 fields"), and stack traces for debugging in development.

### Process Patterns

**Loading state (Web):** Single pipeline-in-progress state; show loading until the backend returns. On response: if `result.pdf` is present, treat as success and offer download; if `result.warnings` includes `CANVA_EXPORT_FAILED`, show a non-blocking message (e.g. "PDF ready. Canva export failed; you can try again later.").

**CLI:** On success, write PDF to configured path and exit 0. If `result.warnings.length > 0`, print warnings to stderr but still exit 0. Exit non-zero only when `result.pdf` is absent (fatal error).

### Enforcement Guidelines

**All AI agents MUST:**
- Use the exact `PipelineResult` (or equivalent) shape for every pipeline run; include `layoutPrep` on every successful run with truncation metadata from layout-prep.
- Implement Canva call in a try/catch (or equivalent); on failure push one warning to `warnings` and never throw or omit `pdf`.
- Use the naming conventions above for new files, exports, and the pipeline result/layout-prep types.
- Not log or expose resume content, JD content, or API keys.

**Pattern verification:** Run `scripts/verify.sh` before claiming done. Code review: confirm pipeline return type matches `PipelineResult`, layout-prep populates metadata, and Canva failures only add warnings.

### Pattern Examples

**Good: pipeline return**
```ts
return {
  pdf: pdfBuffer,
  layoutPrep: {
    truncatedFields: ['summary', 'experience[1].bullets'],
    truncationDetails: { summary: { originalLength: 500, maxLength: 400, strategy: 'ellipsis' } },
    hadTruncation: true,
  },
  warnings: canvaFailed ? [{ code: 'CANVA_EXPORT_FAILED', message: 'Canva export failed.', details: { statusCode: 504 } }] : [],
};
```

**Good: Canva isolation**
```ts
let canvaResult: CanvaExportResult | undefined;
try {
  canvaResult = await exportToCanva(constrainedResume, config);
} catch (err) {
  warnings.push({ code: 'CANVA_EXPORT_FAILED', message: 'Canva export failed.', details: getSafeDetails(err) });
}
return { pdf, layoutPrep, canva: canvaResult, warnings };
```

**Anti-pattern:** Returning `{ pdf }` without `layoutPrep` or `warnings`. Throwing when Canva fails. Retrying Canva inside the pipeline in MVP. Using different property names (e.g. `layout_prep`, `truncated_fields`) in the pipeline result.

## Project Structure & Boundaries

### Turborepo Layout Overview

| Workspace | Purpose |
|----------|---------|
| **apps/web** | Vite SPA optimized for iOS Safari; TTI-focused; consumes `packages/core` and `packages/types`. |
| **apps/cli** | Oclif-based CLI for interactive and scripted runs; consumes `packages/core` and `packages/types`. |
| **packages/core** | Shared Brain: AI pipeline, deterministic Layout-Prep logic, and rendering (PDFKit + Canva). No UI. |
| **packages/types** | Shared TypeScript interfaces and types to prevent drift between CLI and Web. |

The boundary between **Layout-Prep (logic)** and **Rendering (PDFKit/Canva)** is reflected in the file structure: Layout-Prep lives under `packages/core/src/layout-prep/`; rendering lives under `packages/core/src/rendering/`. The pipeline orchestrator imports from both but does not mix constraint logic with PDF or Canva code.

### Complete Project Directory Structure

```
resume-builder-v1/
├── .env.example
├── .gitignore
├── package.json
├── pnpm-workspace.yaml          # or npm/yarn workspaces
├── turbo.json
├── tsconfig.json                # base TS config
├── config.json                  # template preferences, Canva template ID (optional at root or in apps)
├── scripts/
│   └── verify.sh
├── apps/
│   ├── web/                     # Vite SPA — iOS Safari, TTI focus
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   │   ├── jd-input.tsx
│   │   │   │   ├── paste-fallback.tsx
│   │   │   │   └── pdf-download.tsx
│   │   │   ├── hooks/
│   │   │   │   └── use-pipeline.ts
│   │   │   ├── api/             # or calls to serverless/backend that runs core
│   │   │   │   └── run-pipeline.ts
│   │   │   └── styles/
│   │   └── public/
│   │
│   └── cli/                     # Oclif-based CLI — interactive & scripted
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── commands/
│       │   │   ├── build.ts      # main resume build command
│       │   │   └── hello.ts
│       │   └── lib/
│       │       └── run-pipeline.ts   # loads config, calls core runPipeline, writes PDF
│       └── bin/
│           ├── run.js
│           └── dev.js
│
├── packages/
│   ├── types/                   # Shared TypeScript interfaces — no drift
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── pipeline-result.ts    # PipelineResult, LayoutPrepMetadata, PipelineWarning
│   │       ├── resume.ts            # StructuredResume, section types
│   │       └── template-contract.ts # field limits types (implementation in core)
│   │
│   └── core/                    # Shared Brain — pipeline, layout-prep, rendering
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts              # public API: runPipeline only
│       │   ├── pipeline/
│       │   │   ├── run-pipeline.ts   # orchestrator: ingest → ai → layout-prep → rendering
│       │   │   └── ingest.ts         # JD paste/URL fetch, fallback
│       │   │
│       │   ├── layout-prep/           # LOGIC ONLY — constraint, ATS verification, truncation
│       │   │   ├── index.ts
│       │   │   ├── apply-constraints.ts   # raw resume + contract → constrained + LayoutPrepMetadata
│       │   │   ├── keyword-heatmap.ts     # ATS: verify JD keywords in resume before rendering
│       │   │   ├── truncate.ts             # per-field truncation/ellipsis/collapse
│       │   │   └── layout-prep.test.ts
│       │   │
│       │   ├── rendering/             # RENDERING ONLY — PDFKit & Canva (consumes constrained content)
│       │   │   ├── index.ts
│       │   │   ├── pdf/
│       │   │   │   ├── index.ts
│       │   │   │   ├── build-pdf.ts        # PDFKit, tagged/PDF-UA, no flatten
│       │   │   │   └── build-pdf.test.ts
│       │   │   └── canva/
│       │   │       ├── index.ts
│       │   │       └── export-canva.ts    # Canva API client; try/catch, never throw to pipeline
│       │   │
│       │   ├── ai/                  # AI redraft (JD → structured resume)
│       │   │   ├── index.ts
│       │   │   └── redraft.ts
│       │   │
│       │   └── contract/             # Template contract — limits & mapping (used by layout-prep + rendering)
│       │       ├── index.ts
│       │       └── mvp-template.ts  # single MVP template limits and field map
│       │
│       └── __tests__/
│           └── pipeline.integration.test.ts
│
├── docs/
└── _bmad-output/
```

### Boundary: Layout-Prep vs Rendering

**Layout-Prep (logic)** — `packages/core/src/layout-prep/`:
- **Input:** Raw structured resume (AI output) + template contract + (for ATS) JD or extracted keywords.
- **Output:** Constrained resume + `LayoutPrepMetadata` (truncatedFields, truncationDetails, hadTruncation, optional keywordHeatmap).
- **Responsibility:** (1) Apply character/line limits; truncate or collapse deterministically. (2) **Keyword Heatmap:** Verify ATS optimization before rendering—compute which JD keywords appear in the resume (coverage/heatmap); attach to metadata so callers can surface it; does not block rendering. No PDF, no Canva, no I/O beyond in-memory data.
- **Dependencies:** `packages/types` (resume, metadata types); `packages/core/src/contract/` (template limits).

**Rendering** — `packages/core/src/rendering/`:
- **Input:** Constrained resume only (from layout-prep). No raw or over-length content.
- **Responsibility:**
  - **pdf/** — Build PDF via PDFKit (tagged, PDF/UA, searchable text). Consumes constrained resume; no truncation logic.
  - **canva/** — Export to Canva API; try/catch; on failure return safe error for pipeline to push into `warnings`.
- **Dependencies:** `packages/types`; `packages/core/src/contract/` (for mapping only; no constraint logic here).

**Pipeline orchestrator** — `packages/core/src/pipeline/run-pipeline.ts`:
- Calls: ingest → ai → **layout-prep** (apply constraints → **keyword heatmap** (ATS verification) → constrained + metadata) → **rendering/pdf** (get buffer) → **rendering/canva** (optional, isolated). Assembles `PipelineResult` with `pdf`, `layoutPrep`, `canva?`, `warnings`.

No file under `rendering/` may import from `layout-prep/` for the purpose of running constraint logic; layout-prep runs once and passes its output into rendering. This keeps the boundary physical and auditable.

### Architectural Boundaries

**API boundaries:**
- **Public API of core (Headless, single entry point):** `packages/core` exports a **single headless entry point**: `runPipeline`. No other pipeline, layout-prep, or rendering APIs are exported. Types may be re-exported from `@repo/types`. This keeps CLI and Web apps as thin as possible—they only call `runPipeline(input)` and handle `PipelineResult`. No direct exports of layout-prep or rendering internals.
- **Web:** Calls backend or serverless that invokes `runPipeline`; receives `PipelineResult`. No direct dependency on core internals.
- **CLI:** Imports `runPipeline` from `@repo/core`; passes config and input; writes `result.pdf` and optionally surfaces `result.layoutPrep` and `result.warnings`.

**Component boundaries:**
- **apps/web** and **apps/cli** depend on `@repo/core` and `@repo/types` only. They do not depend on each other.
- **packages/core** depends on `@repo/types`; it implements pipeline, layout-prep, rendering, AI, and contract. It does not depend on apps.
- **packages/types** has no dependency on core or apps; it defines interfaces only.

**Service boundaries:**
- AI (Anthropic): called from `packages/core/src/ai/`.
- Canva API: called from `packages/core/src/rendering/canva/`; failures isolated and pushed to `warnings`.
- JD URL fetch: in `packages/core/src/pipeline/ingest.ts`; failure triggers Paste JD path (no retry in MVP).

### Requirements to Structure Mapping

| FR / area | Location |
|-----------|----------|
| JD input (paste, URL, fallback) | `packages/core/src/pipeline/ingest.ts`; Web: `apps/web/src/components/jd-input.tsx`, paste-fallback |
| AI redraft (JD → resume) | `packages/core/src/ai/redraft.ts` |
| Layout-Prep (constraint, keyword heatmap, truncation) | `packages/core/src/layout-prep/` |
| Template contract (limits) | `packages/core/src/contract/mvp-template.ts`; types in `packages/types` |
| PDF generation (tagged, searchable) | `packages/core/src/rendering/pdf/build-pdf.ts` |
| Canva export | `packages/core/src/rendering/canva/export-canva.ts` |
| Pipeline orchestration & PipelineResult | `packages/core/src/pipeline/run-pipeline.ts` |
| Web SPA (TTI, download) | `apps/web/` |
| CLI (interactive + scripted) | `apps/cli/src/commands/build.ts`, `lib/run-pipeline.ts` |
| Shared types (no drift) | `packages/types/src/` |

### Integration Points

**Internal:**
- **Pipeline → layout-prep:** Orchestrator passes raw resume + contract into `applyConstraints`; receives constrained resume + `LayoutPrepMetadata`.
- **Pipeline → rendering:** Orchestrator passes constrained resume into `buildPdf` and (optionally) `exportToCanva`; never passes raw resume to rendering.
- **Web/CLI → core:** Both call `runPipeline(input)` and handle `PipelineResult`.

**External:**
- Anthropic API (AI): from `packages/core/src/ai/`.
- Canva API: from `packages/core/src/rendering/canva/`; errors never interrupt PDF.
- JD URL fetch: from `packages/core/src/pipeline/ingest.ts`.

**Data flow:** JD or structured input → ingest → AI → raw resume → **layout-prep** → constrained resume + metadata → **rendering** (PDF + optional Canva) → `PipelineResult` → Web/CLI.

### File Organization Patterns

**Configuration:** Root `.env.example` and `.env` (gitignored) for API keys; `config.json` at root or in apps for template/Canva ID. Core and CLI read via env and config loader.

**Source:** Apps contain only UI or CLI entrypoints and thin adapters. All pipeline, layout-prep, and rendering logic lives in `packages/core` with the layout-prep vs rendering split as above.

**Tests:** Unit tests co-located in core (e.g. `layout-prep.test.ts`, `build-pdf.test.ts`); integration test in `packages/core/__tests__/pipeline.integration.test.ts`. Web/CLI tests in respective apps as needed.

**Assets:** Web static assets in `apps/web/public/`; no shared asset package in MVP.

### Development Workflow Integration

**Dev:** From repo root, `pnpm dev` (or equivalent) runs Turborepo dev; `apps/web` runs Vite dev server (TTI-focused build); CLI can be run via `pnpm --filter @repo/cli run build` or linked binary.

**Build:** Turborepo builds packages in dependency order: `types` → `core` → `web` and `cli`. Core builds as TypeScript package; no bundling of core for Node consumption.

**Deployment:** Web app build output deployed to static/edge host; backend or serverless (if used) depends on `@repo/core` and `@repo/types`. CLI distributed as binary or run via Node.

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision compatibility:** Technology choices align: Turborepo + Vite (web), Oclif (CLI), PDFKit (tagged PDF), Node in core. No conflicting versions or patterns. Pipeline result shape, layout-prep metadata, and Canva isolation are consistent across decisions.

**Pattern consistency:** Naming (camelCase, kebab-case, UPPER_SNAKE for codes), structure (layout-prep vs rendering boundary), and Shared Core API pattern support the architecture. Single headless entry point (`runPipeline`) is enforced in structure and boundaries.

**Structure alignment:** Project tree supports all decisions: `packages/core` has layout-prep (logic) and rendering (PDF/Canva) physically separated; `packages/types` prevents drift; apps depend only on core and types.

### Requirements Coverage Validation ✅

**Functional requirements:** All 28 FRs have a defined location: JD input (ingest + Web/CLI), AI redraft (ai/), layout-prep including keyword heatmap (layout-prep/), template contract (contract/), PDF (rendering/pdf/), Canva (rendering/canva/), pipeline (pipeline/), Web SPA (apps/web), CLI (apps/cli), config (env + config.json), shared core (packages/core single entry).

**Non-functional requirements:** Performance (TTI ≤2s, <3 min) addressed by Vite SPA and pipeline design; security by env for keys and no logging of content; integration by Canva isolation and URL→Paste fallback. Accessibility (contrast, touch targets) in Web requirements.

### Implementation Readiness Validation ✅

**Decision completeness:** Critical decisions documented with versions (e.g. PDFKit v0.17.2); template contract, layout-prep, and rendering boundaries clear; PipelineResult and LayoutPrepMetadata (including optional keywordHeatmap) defined.

**Structure completeness:** Full directory tree with files; layout-prep includes `keyword-heatmap.ts` for ATS verification before rendering; core exports only `runPipeline` (headless entry).

**Pattern completeness:** Shared Core API, Canva error handling, naming, structure, format, and process patterns documented with examples and anti-patterns.

### Confirmation: Single Headless Entry Point ✅

**packages/core** exposes exactly one headless entry point: **`runPipeline`**. CLI and Web apps remain thin: they import and call only `runPipeline(input)` and handle `PipelineResult`. No direct use of layout-prep, rendering, or AI modules from apps. This is stated in API boundaries and enforced by the project structure (core `index.ts` exports runPipeline only).

### Confirmation: Keyword Heatmap in Layout-Prep ✅

**Layout-Prep** includes a **Keyword Heatmap** step to verify ATS optimization before rendering. Implemented in `packages/core/src/layout-prep/keyword-heatmap.ts`: given JD (or extracted keywords) and the constrained resume, compute which keywords are present/missing in the resume; attach optional `keywordHeatmap` to `LayoutPrepMetadata` (present, missing, optional score). This runs inside layout-prep after constraints and before output is passed to rendering. It does not block rendering; it only enriches metadata so callers can surface ATS coverage.

### Gap Analysis Results

- **Critical:** None. All blocking decisions and structure are in place.
- **Important:** Optional: schema validation (JSON schema for resume) and keyword extraction from JD (if not done in AI step) for the heatmap input. Can be implemented in first iteration.
- **Nice-to-have:** Future: multiple templates, enhanced ATS scoring; already deferred in scope.

### Architecture Completeness Checklist

**✅ Requirements analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Layout-Prep vs Rendering boundary physical
- [x] Single headless entry point (runPipeline) confirmed
- [x] Keyword Heatmap step in layout-prep confirmed
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall status:** READY FOR IMPLEMENTATION

**Confidence level:** High — validation confirms coherence, requirements coverage, single entry point, and Keyword Heatmap in layout-prep.

**Key strengths:** Experience MVP priority; clear layout-prep vs rendering boundary; standardized PipelineResult with layoutPrep metadata; Canva never blocks PDF; shared types package; headless core.

**Areas for future enhancement:** Multiple Canva templates; enhanced ATS scoring; shell completion; full browser automation (post-MVP).

### Implementation Handoff

**AI agent guidelines:**
- Follow all architectural decisions exactly as documented.
- Use implementation patterns consistently (PipelineResult, layoutPrep, Canva isolation, naming).
- Respect project structure and boundaries; do not export layout-prep or rendering from core except via runPipeline.
- Refer to this document for all architectural questions.

**First implementation priority:** Initialize repo with `npx create-turbo@latest -e with-vite`; add `packages/types` and `packages/core` with the directory structure above; implement `runPipeline` as the single headless entry; then add `apps/cli` (Oclif) and `apps/web` (Vite) as thin consumers. Run `scripts/verify.sh` before claiming done.
