# Resume-Builder-V1 — Comprehensive Project Audit

**Audit date:** 2026-03-08 | **Strategy revised:** 2026-03-09
**Role:** Senior PM / Technical Lead / Systems Auditor
**Scope:** Current state vs PRD/architecture, blockers, and prioritized next steps.

> **⚠ Strategy Change (2026-03-09):** BYOM (Bring Your Own Model) has been dropped.
> The previous design required users to extract Claude Pro session tokens via browser
> DevTools and paste them on mobile — incompatible with the on-the-fly iPhone use case.
> **New approach:** Backend owns `ANTHROPIC_API_KEY` via env var. Model: `claude-sonnet-4-6`.
> Personal-use API cost is < $3/year. All BYOM references in this document are superseded
> by `specs/byom-auth/auth-flow.md` (revised 2026-03-09).
> Sections 2.1 (credential plumbing) and 3.1 (credential flow) are partially superseded —
> the credential _wiring_ requirement remains, but the approach is simplified to env key only.

---

## 1. Executive Overview: Project Health, Bottlenecks, and Trajectory

The project is **architecturally sound and verification-green** on the path that is implemented: layout-prep is wired, PDF generation is tagged/searchable, Canva failure is isolated, and the **structured-resume-only** pipeline path works end-to-end (Web → API → core → PDF + optional Canva). Tests and the layout simulation gate pass. **However, the primary product promise—paste JD or URL → AI-redrafted resume → PDF in under 3 minutes—is not deliverable.** The AI redraft step (`redraftResume`) is a stub that throws. No CredentialProvider is passed into the pipeline or used by redraft, so BYOM (Bring Your Own Model) is documented and partially implemented (types, request-scoped provider, API header, Canva OAuth) but **not connected to the pipeline or to Anthropic**. The API reads the per-request Anthropic token but never uses it; `runPipeline` has no credential provider parameter. JD URL ingestion (`ingestJd`) exists and is tested but is **never invoked** by the pipeline or the Web UI; the UI has no URL input, so the “Paste JD” fallback when URL fails (PRD non-negotiable) is only half-specified. The trajectory is therefore **stalled on the JD→redraft→PDF critical path**: until redraft is implemented and credentials are plumbed, the Experience MVP (“human-grade PDF on the user’s phone in under 3 minutes”) cannot be validated. The good news: layout engine, PDF, Canva isolation, and identity pillars are in place; the remaining work is narrowly scoped to implementing redraft, wiring CredentialProvider through the stack, and optionally connecting URL input to ingest + pipeline.

---

## 2. Phase 1: What Is Wrong — Flaws, Blockers, and Inefficiencies

### 2.1 Critical (Blocks MVP value)

- **AI redraft is unimplemented.**  
  `packages/core/src/ai/redraft.ts` exports `redraftResume(jd, pillars)` but the function only throws: `"redraftResume: not implemented yet; BYOM Anthropic wiring pending."`  
  **Impact:** Any call with `input.jd` (the main Web and intended CLI path) fails immediately. The “paste JD → PDF in under 3 minutes” promise cannot be kept.

- **Pipeline does not accept or use CredentialProvider.**  
  Architecture and `specs/byom-auth/auth-flow.md` require the pipeline (and redraft) to resolve Anthropic credentials via `CredentialProvider.getAnthropic()`. `runPipeline(input, options)` only has `canvaCredentials` and `canvaTemplateId` in options; there is no `credentialProvider` (or equivalent). `redraftResume` does not take a credential provider or API key.  
  **Impact:** BYOM cannot work. The API reads `X-Anthropic-Session-Token` but has no way to pass it into core; env-based API key is also not plumbed into redraft.

- **API does not pass credentials into the pipeline.**  
  `apps/api/src/index.ts` calls `runPipeline(input, { canvaCredentials, canvaTemplateId })` and never builds or passes a CredentialProvider (session, env, or per-request token).  
  **Impact:** Even after redraft is implemented, the Web app would have no way to supply Anthropic credentials to the pipeline.

### 2.2 Important (Gaps vs PRD/architecture)

- **JD URL path is not wired.**  
  `ingestJd` in `packages/core/src/pipeline/ingest.ts` is implemented and tested (AC1/AC2). It is **never called** by `run-pipeline.ts` or by the Web app. Pipeline expects `input.jd` to be the final JD string; there is no `input.url` and no step that calls `ingestJd` and then runs redraft on the result.  
  **Impact:** FR2 (submit JD URL) and the PRD “Paste JD fallback when URL fails” are not reachable from the current UI or pipeline flow.

- **Web UI has no JD URL input.**  
  The pipeline section has two tabs: “Paste JD” and “Paste Resume JSON.” There is no field or tab for “Job URL.”  
  **Impact:** Users cannot trigger the URL→fetch→fallback flow; FR2 and the mobile fallback story are not testable in the app.

- **Keyword heatmap uses empty JD keywords on the JD path.**  
  In `run-pipeline.ts`, when coming from `input.jd`, the pipeline calls `computeKeywordHeatmap(constraintResult.resume, jdKeywords)` with `jdKeywords: TieredKeyword[] = []`. Keywords are not extracted from the JD or passed from the redraft step.  
  **Impact:** ATS heatmap in the UI will always show “no JD keywords” for the JD path, undercutting the value of the heatmap for that flow.

- **Duplicate script key in root package.json.**  
  Root `package.json` has two identical keys: `"verify:pipeline": "tsx packages/core/src/pipeline/verify-identity.ts"`.  
  **Impact:** Linter/tooling warnings (observed in test run); potential for confusion about which script runs.

### 2.3 Minor / Hygiene

- **Handoff lists “Implement runPipeline + wire layout-prep” as remaining.**  
  Layout-prep is already wired in `run-pipeline.ts` (applyConstraints → computeKeywordHeatmap → buildPdf). The remaining gap is redraft + credentials, not layout-prep.  
  **Impact:** Misleading handoff can direct effort to already-done work.

- **Verify script runs only turbo test at root.**  
  Root `package.json` has no `lint`, `typecheck`, or `build` scripts; `scripts/verify.sh` skips them. Only `npm -s test` (turbo test) and the layout simulation + KeywordHeatmap grep run.  
  **Impact:** Full lint/typecheck/build are not part of the single verify gate at repo root (they may run per package).

- **Pipeline comment mentions “ingest” but code does not call it.**  
  Comment in `run-pipeline.ts` says “ingest → ai/redraft …” but the code never calls `ingestJd`; it only branches on `input.structuredResume` vs `input.jd`.  
  **Impact:** Misleading for future implementers; suggests ingest is in the flow when it is not.

---

## 3. Phase 2: What Needs to Be Fixed — Actionable Solutions

### 3.1 Implement AI redraft and BYOM credential flow

- **Define pipeline credential contract.**  
  Extend `RunPipelineOptions` (e.g. in `packages/core`) with an optional `credentialProvider?: CredentialProvider`. When `input.jd` is set, `runPipeline` must require a credential provider (or throw a clear error with code e.g. `MISSING_ANTHROPIC_KEY`) before calling redraft.

- **Implement `redraftResume` in core.**  
  In `packages/core/src/ai/redraft.ts`, implement the function to:
  - Accept an optional `CredentialProvider` (or credentials resolved by the pipeline and passed in).
  - Call `credentialProvider.getAnthropic()` (or equivalent) to obtain the API key (or session token used as key per Path C).
  - Call Anthropic API (Messages API) with system prompt that injects Identity Pillars verbatim and instructs the model to output structured resume (e.g. JSON matching `StructuredResume`).
  - Parse and validate the response into `StructuredResume` and return it. On auth/API errors, throw with a structured code (e.g. `INVALID_ANTHROPIC_KEY`) so the API can map to pipeline warnings or 4xx with a clear message.

- **Wire CredentialProvider from API to pipeline.**  
  In `apps/api/src/index.ts` for `POST /api/run-pipeline`:
  - Build a CredentialProvider that: (1) prefers per-request Anthropic token from `req.headers['x-anthropic-session-token']` (Path C); (2) falls back to session-stored API key if present (Path A); (3) falls back to `process.env.ANTHROPIC_API_KEY`. Canva already comes from session/OAuth.
  - Pass this provider into `runPipeline(input, { credentialProvider, canvaCredentials, canvaTemplateId })`.
  - Handle missing credentials by responding with 400/403 and a clear message (e.g. “Add your Anthropic API key or paste Claude Pro token in Settings”) instead of calling the pipeline and letting it throw.

- **Optional: return extracted JD keywords from redraft.**  
  If the redraft step (or a separate extraction step) can return a list of TieredKeywords from the JD, pass that into `computeKeywordHeatmap` so the heatmap is meaningful when the user submits a JD.

### 3.2 Wire JD URL into pipeline and UI (PRD fallback)

- **Pipeline: support URL in input and call ingest.**  
  Extend `PipelineInput` with optional `url?: string`. In `run-pipeline.ts`, when `input.jd` is missing but `input.url` is present, call `ingestJd({ url: input.url })` in a try/catch. On `IngestError` with code `JD_URL_FETCH_FAILED`, add a warning to `PipelineResult.warnings` and throw or return a structured error that tells the client to use Paste JD (per PRD). When ingest returns a string, set `jd = result` and proceed with redraft as today.

- **Web UI: add JD URL option.**  
  Add a “Job URL” tab or input (and/or “Paste JD” as fallback when URL fails). When the user submits a URL, call `POST /api/run-pipeline` with `{ url: userInput }` (and profile). When the API returns a warning `JD_URL_FETCH_FAILED`, show the Paste JD UI (same textarea) so the user can paste and retry without leaving the flow.

### 3.3 Correct metadata and hygiene

- **Fix duplicate key in root package.json.**  
  Remove the duplicate `"verify:pipeline"` entry so only one remains.

- **Update handoff and comments.**  
  In `.ralph/agent/handoff.md`, mark “Implement runPipeline + wire layout-prep” as done and replace remaining task with “Implement redraftResume and wire CredentialProvider” (and optionally “Wire JD URL + ingest into pipeline and Web UI”). In `run-pipeline.ts`, update the comment to state that when `url` is provided, ingest is called first; when `jd` is provided, it is used directly (no ingest).

---

## 4. Phase 3: What Needs to Be Done Next — Macro-Strategy

The immediate macro-goal is to **unblock the JD → PDF critical path and validate the Experience MVP**: a user can paste a JD (and optionally a URL), provide Anthropic credentials (API key or Claude Pro token), and receive a human-grade PDF in under 3 minutes with no manual layout fixes. All other work (multiple templates, enhanced ATS, shell completion, browser automation) is secondary until this path is reliable. Strategy:

1. **Stabilize credentials and redraft.** Implement `redraftResume` with CredentialProvider (or equivalent), and plumb CredentialProvider from the API into `runPipeline`. Ensure the Web app can use either an API key (Settings) or a pasted Claude Pro token, and that the API uses that for a single pipeline run without storing the token long-term.
2. **Validate end-to-end JD → PDF.** Manually test: paste JD in Web → set API key or token → run pipeline → download PDF. Confirm layout and ATS readability (tagged PDF, searchable text). Measure time-to-PDF and fix any timeout or UX issues.
3. **Then** add URL input and ingest integration (pipeline + UI) so FR2 and the Paste JD fallback are testable; surface JD_URL_FETCH_FAILED in the UI and guide the user to paste.
4. **Then** consider keyword extraction from JD → heatmap, CLI credential wiring (e.g. EnvCredentialProvider), and any remaining Phase 2 BYOM polish (session store for API key, etc.).

---

## 5. Exhaustive Prioritized Checklist

### Immediate (Next 24 Hours)

- [ ] **Remove duplicate `verify:pipeline` key** in root `package.json` (keep one script).
- [ ] **Extend `RunPipelineOptions`** in `packages/core` to include `credentialProvider?: CredentialProvider` (or `anthropicCredentials?: AnthropicCredentials` if you prefer a simpler first step).
- [ ] **Implement `redraftResume`** in `packages/core/src/ai/redraft.ts`: accept credentials (or CredentialProvider), call Anthropic Messages API with identity-injected system prompt, return parsed `StructuredResume`. Handle 401 with a clear error code for “invalid key.”
- [ ] **Update `runPipeline`** to accept `options.credentialProvider` (or credentials), resolve Anthropic credentials when `input.jd` is set, and pass them into `redraftResume`. When credentials are missing and `input.jd` is set, throw a structured error (e.g. `MISSING_ANTHROPIC_KEY`) instead of calling redraft.
- [ ] **In `apps/api`** build a CredentialProvider (or equivalent) that: per-request token from header → session API key → `process.env.ANTHROPIC_API_KEY`. Pass it into `runPipeline` for every `POST /api/run-pipeline` request that includes `input.jd`.
- [ ] **Handle missing Anthropic credentials in API:** if provider resolution fails and body has `jd`, return 400/403 with a clear message; do not call `runPipeline`.
- [ ] **Run `bash scripts/verify.sh`** and fix any regressions (tests, layout simulation, KeywordHeatmap grep).
- [ ] **Smoke-test:** Web app → paste JD → set API key or token in Settings → Generate Resume → confirm PDF downloads (or a clear credential error appears).

### Short-Term (Next 72 Hours)

- [ ] **Add optional `url` to `PipelineInput`** and in `run-pipeline.ts`: if `input.url` and no `input.jd`, call `ingestJd({ url: input.url })`; on `IngestError`, add `JD_URL_FETCH_FAILED` to warnings and return/throw so client can show Paste JD; on success, set `jd` to the fetched text and continue with redraft.
- [ ] **Web UI: add “Job URL” input** (tab or field). On submit, send `{ url: value, profile }` to `POST /api/run-pipeline`. When response includes warning `JD_URL_FETCH_FAILED`, show message and keep “Paste JD” visible so user can paste and resubmit.
- [ ] **Optional: keyword extraction.** From the JD (or from redraft metadata), produce `TieredKeyword[]` and pass into `computeKeywordHeatmap` when running the JD path so the heatmap shows present/missing keywords.
- [ ] **Update handoff and Ralph tasks:** “Implement redraftResume + CredentialProvider” and “Wire JD URL + ingest” as done or in progress; remove “wire layout-prep” from remaining.
- [ ] **CLI:** Ensure CLI (if used) can pass credentials (e.g. `EnvCredentialProvider` from `process.env`) into `runPipeline` when running with `--jd` or JD file.

### Milestone Objectives

- [ ] **Experience MVP validated:** JD (paste or URL with fallback) → PDF in under 3 minutes on a representative device; no manual layout fixes; PDF is tagged and searchable.
- [ ] **BYOM fully wired:** Web (token or API key) and CLI (env) both drive redraft via CredentialProvider; no credentials in logs or client.
- [ ] **All 28 FRs mapped and either implemented or explicitly deferred** with a short note in docs or architecture.
- [ ] **Verify gate includes full quality checks** at root if desired (e.g. root-level lint/typecheck/build that run turbo tasks), or document that verify is test + layout simulation + heatmap grep only.

---

*End of audit. Use this document as the single source of truth for “what’s wrong,” “what to fix,” and “what to do next” until the JD → PDF path is shipped and the Experience MVP is validated.*
