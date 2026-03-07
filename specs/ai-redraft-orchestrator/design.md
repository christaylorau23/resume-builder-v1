# Design

Technical context and implementation constraints for the renderer.

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

---

## Implementation Notes (signature, layout, overflow)

- **Ingestion API surface:** Expose a single entry that accepts either `{ type: 'text', body: string }` or `{ type: 'url', url: string }`; normalize to JD text before calling the redraft step.
- **URL fetch:** Use a fetch step with timeout and error handling; on any failure (blocked, 4xx/5xx, timeout), return a structured "fetch failed" result so the orchestrator can trigger Paste JD fallback.
- **Mobile detection:** For Web, use user-agent or viewport/capability hints to show the Paste JD fallback UX immediately when URL fails on iOS/mobile.
- **Keyword tiers:** Align with existing or new types (e.g. `TieredKeyword` with `tier: 'hard' | 'alias' | 'contextual'`); redraft prompt or post-processor must weave Hard keywords into bullets/summary.
- **Layout contract:** Consume `MVP_TEMPLATE_CONTRACT` (or equivalent) for max character counts per field; apply in layout-prep or in the redraft step so output is always within limits.

---

---

## Out of Scope for This Story

- Actual PDF rendering (see story-pdfkit-rendering).
- Canva API integration and export (separate story).
- CLI-specific JD input (FR4) — can be added in a follow-up; this story focuses on Web ingestion + shared redraft/layout logic.
- Multiple Canva templates or enhanced ATS scoring — post-MVP.

---