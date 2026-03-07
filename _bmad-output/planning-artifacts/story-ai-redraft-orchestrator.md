# Story: AI Redraft Orchestrator

**Story ID:** story-ai-redraft-orchestrator
**Epic:** Core Content Pipeline
**PRD References:** FR1, FR2, FR3, FR8, FR12, FR16
**Status:** ready
**Created:** 2026-03-07

---

## Objective

Implement the orchestration layer that ingests job description input (raw text or URL), runs AI redraft with ATS keyword weaving, and enforces layout-safe character limits per section so output never overflows the PDF or Canva template. This story covers JD ingestion behavior, mobile fallback when URL fetch fails, keyword weaving into bullets, and strict section character counts.

---

## Context

### What already exists

| Area | State |
|------|--------|
| PRD | FR1–FR3 (JD input/fallback), FR8 (keyword weaving), FR12/FR16 (layout limits) |
| Domain rules (PRD) | ATS keyword extraction; data-to-Canva mapping with max chars per field |
| Layout-prep / template contract | `MVP_TEMPLATE_CONTRACT` (or equivalent) with field limits |
| Pipeline placeholder | `run-pipeline.ts` or equivalent — to be wired in this story |

### Critical constraints (from PRD)

- **Single source of truth:** Redraft output is structured (JSON/Markdown) consumed by both PDF and Canva; no duplicate content logic.
- **Content/layout separation:** AI produces content within layout limits; layout engine does not truncate—constraints are applied before or during redraft.
- **Mobile resilience:** When URL fetch is blocked (e.g. iOS), **Paste JD** fallback must trigger immediately so the user can complete the flow.

---

## Acceptance Criteria (Definition of Done)

### AC1 — JD Ingestion (FR1 / FR2)
- System MUST accept **raw text** input (paste) for the job description.
- System MUST accept **URL** input and attempt to fetch the job description from the URL.
- Both code paths MUST produce a single JD text payload that feeds the same redraft pipeline (no divergent flows).
- Tests MUST cover: paste-only path, URL-success path, and URL-failure path (see AC2).

### AC2 — Mobile Resilience (FR3)
- When a **URL fetch is blocked** (e.g. paywall, auth, bot protection, timeout, or network error), the system MUST immediately trigger the **Paste JD** fallback.
- On **iOS** (or when the client is identified as mobile), the fallback MUST be surfaced without dead ends or technical error screens: clear prompt to paste the JD and a dedicated Paste JD entry point.
- The same redraft + layout pipeline MUST run after paste so the user can still complete the flow in under 3 minutes (per NFR-P3).
- Tests MUST verify: URL failure → fallback offered; paste after fallback → same pipeline runs and produces valid output.

### AC3 — Keyword Weaving (FR8)
- Redraft MUST incorporate **Hard (Tier 1)** keywords from the extracted JD keyword set into the resume narrative.
- Bullet points (experience, and any other narrative sections) MUST include Hard keywords **naturally**—no keyword stuffing; readability and layout limits must be respected.
- Keyword extraction and tiering (Hard vs alias/contextual) MUST be defined and used so that Tier 1 terms are prioritized for weaving.
- Tests MUST assert that at least one Hard keyword from the JD appears in the redrafted bullets (or summary) in a natural way, and that output remains within layout limits.

### AC4 — Layout Safety (FR12 / FR16)
- **Strict character counts per section** MUST be enforced so that PDF and Canva layouts never overflow.
- Limits MUST be defined per template (e.g. headline, summary, per-bullet, skills) and applied **before or during** redraft (or in a dedicated layout-prep step that runs on redraft output).
- Content that would exceed a section’s limit MUST be truncated or summarized (e.g. trim with ellipsis or collapse extra bullets) so that the final structured output never exceeds the contract.
- Tests MUST verify: redraft/layout-prep output satisfies every field’s max length; feeding this output to the PDF (and Canva) path does not cause overflow.

---

## Implementation Notes

- **Ingestion API surface:** Expose a single entry that accepts either `{ type: 'text', body: string }` or `{ type: 'url', url: string }`; normalize to JD text before calling the redraft step.
- **URL fetch:** Use a fetch step with timeout and error handling; on any failure (blocked, 4xx/5xx, timeout), return a structured "fetch failed" result so the orchestrator can trigger Paste JD fallback.
- **Mobile detection:** For Web, use user-agent or viewport/capability hints to show the Paste JD fallback UX immediately when URL fails on iOS/mobile.
- **Keyword tiers:** Align with existing or new types (e.g. `TieredKeyword` with `tier: 'hard' | 'alias' | 'contextual'`); redraft prompt or post-processor must weave Hard keywords into bullets/summary.
- **Layout contract:** Consume `MVP_TEMPLATE_CONTRACT` (or equivalent) for max character counts per field; apply in layout-prep or in the redraft step so output is always within limits.

---

## Out of Scope for This Story

- Actual PDF rendering (see story-pdfkit-rendering).
- Canva API integration and export (separate story).
- CLI-specific JD input (FR4) — can be added in a follow-up; this story focuses on Web ingestion + shared redraft/layout logic.
- Multiple Canva templates or enhanced ATS scoring — post-MVP.

---

## Verification Gate

Before marking this story done, run:

```bash
bash scripts/verify.sh
```

All of the following must pass:
- `pnpm typecheck` — no TypeScript errors
- `pnpm lint` — no ESLint errors
- `pnpm test` — all tests pass, including:
  - JD ingestion: raw text and URL paths produce same pipeline input shape
  - URL blocked/failure → Paste JD fallback triggered (and on iOS/mobile, UX shows Paste JD immediately)
  - Redraft output contains Hard keywords naturally in bullets/summary
  - Redraft/layout-prep output respects per-section character limits; no overflow in downstream PDF/Canva path

---

## Dependencies

| Dependency | Story / ticket |
|------------|----------------|
| FR1, FR2, FR3, FR8, FR12, FR16 | PRD (this story implements them) |
| Template contract (field limits) | Existing or defined in layout-prep / template spec |
| AI/redraft service (e.g. Anthropic) | Configurable; required for redraft step |
| Pipeline entry (e.g. `runPipeline`) | Implement or extend in this story |
