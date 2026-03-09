# Session Handoff

_Updated: 2026-03-09_

## Git Context

- **Branch:** `master`
- **HEAD:** 30d7978: chore: auto-commit before merge (loop primary)

## Strategy Change (2026-03-09)

**BYOM dropped.** Previous strategy required users to paste Claude Pro session tokens
(extracted via DevTools) into the mobile app — this is incompatible with on-the-fly
iPhone job applications. New strategy: backend owns `ANTHROPIC_API_KEY` via env var.
Model: `claude-sonnet-4-6`. Cost at personal-use volume is negligible. Canva OAuth
is unchanged. See `specs/byom-auth/auth-flow.md` for the full revised spec.

## Tasks

### Completed

- [x] Implement buildPdf: install pdf-parse dev dep, implement full PDFKit renderer, canonical fixture, real tests
- [x] Implement truncateField + applyConstraints (AC4 layout safety)
- [x] Implement ingestJd (AC1/AC2 JD ingestion + fallback)
- [x] Add AI redraft orchestrator test suite (AC1-AC4)
- [x] Implement layout-prep wired into runPipeline (applyConstraints + computeKeywordHeatmap)
- [x] Implement Canva failure isolation (warning only, PDF always returned)
- [x] Implement Canva OAuth flow (apps/api)
- [x] Web UI: Settings (Target Market + Canva), Pipeline (Paste JD + Paste JSON tabs)
- [x] Update docs and specs to reflect env-key strategy (drop BYOM)

### Remaining — Critical Path

- [ ] **Implement `redraftResume`** in `packages/core/src/ai/redraft.ts`:
  - Install `@anthropic-ai/sdk` in `packages/core`
  - Read `process.env.ANTHROPIC_API_KEY`
  - Build system prompt injecting `IdentityPillars` verbatim
  - Call Anthropic Messages API (`claude-sonnet-4-6`)
  - Parse and validate response into `StructuredResume`
  - Throw structured error codes (`MISSING_ANTHROPIC_KEY`, `INVALID_ANTHROPIC_KEY`) on failure

- [ ] **Wire URL input into pipeline and Web UI**:
  - Add optional `url?: string` to `PipelineInput`
  - In `run-pipeline.ts`: if `url` and no `jd`, call `ingestJd({ url })`; on `IngestError` add `JD_URL_FETCH_FAILED` warning
  - Web UI: add "Job URL" tab; on `JD_URL_FETCH_FAILED` show Paste JD fallback inline

- [ ] **Clean up BYOM artifacts from code**:
  - Remove Claude Pro token section from `apps/web/src/settings.ts`
  - Remove `X-Anthropic-Session-Token` header from `apps/web/src/api.ts`
  - Remove `createRequestScopedCredentialProvider` from `packages/core/src/credentials/` (or deprecate)
  - Remove `anthropicToken` read from `apps/api/src/index.ts`

- [ ] **Run `bash scripts/verify.sh`** and fix any regressions after changes.

- [ ] **Smoke-test end-to-end:** Web → paste JD → Generate Resume → PDF downloads.

### Milestone Objectives

- [ ] **Experience MVP validated:** JD (paste or URL with fallback) → PDF in under 3 minutes on iPhone; no manual layout fixes; PDF is tagged and ATS-searchable.
- [ ] **All FRs either implemented or explicitly deferred** in docs.

## Key Files

| File | Status |
|------|--------|
| `packages/core/src/ai/redraft.ts` | STUB — needs implementation |
| `packages/core/src/pipeline/run-pipeline.ts` | Working for structuredResume path; JD path blocked by redraft stub |
| `packages/core/src/pipeline/ingest.ts` | Implemented + tested; not yet called from pipeline |
| `apps/api/src/index.ts` | Working; `anthropicToken` var unused — remove in cleanup |
| `apps/web/src/settings.ts` | Has Claude Pro token UI — remove in cleanup |
| `apps/web/src/api.ts` | Sends `X-Anthropic-Session-Token` header — remove in cleanup |
| `specs/byom-auth/auth-flow.md` | Updated to env-key strategy (2026-03-09) |
| `_bmad-output/planning-artifacts/architecture.md` | Updated to env-key strategy (2026-03-09) |

## Next Session

```
Implement redraftResume in packages/core/src/ai/redraft.ts using @anthropic-ai/sdk.
Model: claude-sonnet-4-6. Key from process.env.ANTHROPIC_API_KEY.
System prompt must inject IdentityPillars verbatim. Output: StructuredResume JSON.
Then clean up BYOM artifacts from api.ts, settings.ts, and web/api.ts.
Then add URL input to pipeline and Web UI.
Run bash scripts/verify.sh after each step.
```
