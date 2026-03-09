# Session Handoff

_Updated: 2026-03-09_

## Git Context

- **Branch:** `master`
- **HEAD:** ab6e461: feat: implement full pipeline — redraft, Canva OAuth, Web UI; remove BYOM

## Current State

All critical-path implementation is complete. 65 tests passing. verify.sh green.

### What's Done

- [x] `redraft.ts` — full Anthropic SDK implementation; identity pillars injected verbatim; structured error codes (MISSING_ANTHROPIC_KEY, INVALID_ANTHROPIC_KEY, ANTHROPIC_RATE_LIMITED, REDRAFT_PARSE_FAILED)
- [x] `run-pipeline.ts` — both paths working: `structuredResume` (direct) and `jd` (AI redraft)
- [x] `ingest.ts` — implemented; CLI-usable standalone utility
- [x] layout-prep — `applyConstraints` + `computeKeywordHeatmap` wired into pipeline
- [x] rendering/pdf — tagged PDFKit PDF (ATS-safe)
- [x] rendering/canva — Canva export with failure isolation (CANVA_EXPORT_FAILED warning, PDF always returned)
- [x] apps/api — Canva OAuth flow, `/api/scrape-jd` (Firecrawl), `/api/run-pipeline` with error mapping
- [x] apps/web — 3-tab UI (Paste JD, Paste Resume JSON, Job URL), Settings (Target Market + Canva), PWA manifest + service worker
- [x] BYOM removed — deleted `packages/core/src/credentials/`, removed `CredentialProvider`/`AnthropicCredentials` from `@repo/types`

### Remaining

- [ ] **Smoke-test end-to-end:** requires `ANTHROPIC_API_KEY` in `apps/api/.env`
  - Start API: `pnpm --filter api dev`
  - Start web: `pnpm --filter web dev`
  - Set `VITE_API_URL=http://localhost:3001` in `apps/web/.env`
  - Paste a real JD → Generate Resume → PDF downloads
  - Verify PDF is tagged/ATS-searchable (open in Acrobat or use pdf-parse)

- [ ] **Milestone:** Experience MVP validated — JD (paste or URL with Firecrawl fallback) → tagged PDF in under 3 minutes on iPhone; no manual layout fixes.

## Key Files

| File | Status |
|------|--------|
| `packages/core/src/ai/redraft.ts` | Implemented |
| `packages/core/src/pipeline/run-pipeline.ts` | Implemented |
| `packages/core/src/pipeline/ingest.ts` | Implemented (CLI utility; URL path handled at API layer via Firecrawl) |
| `apps/api/src/index.ts` | Implemented |
| `apps/api/src/services/scraper.ts` | Implemented (Firecrawl) |
| `apps/web/src/pipeline.ts` | Implemented (3 tabs) |
| `apps/web/src/settings.ts` | Implemented (Target Market + Canva) |

## Next Session

```
Smoke-test end-to-end with a real JD.
Requires ANTHROPIC_API_KEY in apps/api/.env.
Optional: FIRECRAWL_API_KEY for URL tab; CANVA_* for Canva export.
Run: pnpm --filter api dev + pnpm --filter web dev
```
