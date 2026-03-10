# ATS Keyword Extraction — Requirements

Source: ATS Resume Logic Overhaul plan. Complements `specs/ai-redraft-orchestrator/`.

---

## Objective

Extract tiered keywords from the job description (JD) and use them in the redraft step and in the keyword heatmap so the pipeline produces ATS-optimized resumes with verifiable JD coverage.

---

## Acceptance Criteria

### AC1 — JD → TieredKeyword[]

- The system MUST extract keywords from the raw JD via a dedicated step (`extractJdKeywords`).
- Keywords MUST be tiered: `hard` (role titles, required skills, must-have tools/certs), `alias` (preferred, synonyms), `contextual` (domain phrases, nice-to-have).
- Extraction MUST prefer exact phrases from the JD over paraphrases.
- Output MUST be a list of `{ term: string, tier: 'hard' | 'alias' | 'contextual' }` consumed by redraft and by the heatmap.

### AC2 — Redraft receives keywords

- When running the JD path, the redraft step MUST receive the extracted `TieredKeyword[]`.
- The redraft system prompt MUST include an explicit list of Hard keywords to weave and MUST instruct the model not to repeat any Hard keyword more than 3 times (per docs/ats-standards-2026.md).
- Redraft MUST remain compatible with being called without keywords (e.g. when keywords are not available); in that case behavior is unchanged (model infers keywords from JD text).

### AC3 — Heatmap uses same keywords

- After redraft and apply-constraints, the pipeline MUST call `computeKeywordHeatmap(resume, jdKeywords)` with the same `TieredKeyword[]` produced by extraction (JD path) or `[]` (direct structuredResume path).
- `PipelineResult.layoutPrep.keywordHeatmap` MUST expose `present`, `missing`, `score`, and per-section/tier breakdown so callers can surface ATS coverage.

### AC4 — Errors and verification

- Extraction and redraft errors MUST be thrown with structured codes (e.g. `ExtractKeywordsError`, `RedraftError`) so the API layer can return clear user-facing messages.
- Verification: run `bash scripts/verify.sh`; unit and integration tests MUST pass.

---

## Dependencies

| Dependency | Location |
|------------|----------|
| TieredKeyword type | packages/core/src/layout-prep/keyword-heatmap.ts |
| computeKeywordHeatmap | packages/core/src/layout-prep/keyword-heatmap.ts |
| ATS rules | docs/ats-standards-2026.md |
| Research (optional) | docs/resume-logic/ (Ultimate Guide, ats-optimize research) |
