# Core Pipeline – Exhaustive Reference (packages/core)

**Date:** 2026-03-14  
**Scan level:** Exhaustive (all source files read)

This document is the exhaustive reference for `packages/core`: every module, export, and key behavior.

---

## 1. Entry and re-exports

- **index.ts:** Exports `runPipeline`, `PipelineInput`, `RunPipelineOptions` from `pipeline/run-pipeline`; `IngestError` from `pipeline/ingest`.

---

## 2. Pipeline

### run-pipeline.ts

- **PipelineInput:** `jd?`, `text?`, `url?`, `structuredResume?`, `profile?`.
- **RunPipelineOptions:** `visualPdf?: boolean` (default true).
- **runPipeline(input, options?):** Resolves identity → structured path or JD path (ingest → extractJdKeywords → redraftResume) → applyConstraints → computeKeywordHeatmap → buildPdf → optional renderVisualPdf → _makePipelineResult.
- **buildSuggestedFilename(resume):** `${company}_${role}_Resume.pdf` from targetRole/headline and first experience company (slugified).
- **_makePipelineResult:** Internal; used by tests for result shape.

### ingest.ts

- **IngestError:** `code: 'JD_URL_FETCH_FAILED' | 'JD_MISSING'`.
- **ingestJd({ text?, url? }):** Returns JD string; text preferred; URL path: validateFetchUrl (SSRF), 10s timeout, fetch; throws IngestError on failure.
- **SSRF rules:** http/https only; no localhost, 127.x, private IPs, [::1].

### verify-identity.ts

- Standalone script: calls `resolveIdentityPillars` for AU and US; asserts phone/email; used for manual identity verification.

---

## 3. Identity

### identity-defaults.ts

- **DEFAULT_IDENTITY_NAME:** `'Chris Taylor'`.
- **DEFAULT_IDENTITY_EMAIL:** `'christaylorau23@gmail.com'`.
- **PHONE_BY_MARKET:** US `'424-388-9521'`, AU `'0403 905 751'`.
- **resolveIdentityPillars(profile?):** Name/email always defaults; phone from `profile.phone` or `profile.targetMarket` (default US).

---

## 4. AI (packages/core/src/ai)

### extract-jd-keywords.ts

- **Model:** `claude-sonnet-4-6` (Anthropic).
- **ExtractKeywordsError:** `code: MISSING_ANTHROPIC_KEY | INVALID_ANTHROPIC_KEY | ANTHROPIC_RATE_LIMITED | EXTRACT_PARSE_FAILED`.
- **extractJdKeywords(jd):** Returns `TieredKeyword[]`; system prompt defines hard/alias/contextual tiers; validates JSON array of `{ term, tier }`; strips markdown fences.

### redraft.ts

- **Model:** `claude-sonnet-4-6`.
- **RedraftError:** `code: MISSING_ANTHROPIC_KEY | INVALID_ANTHROPIC_KEY | ANTHROPIC_RATE_LIMITED | REDRAFT_PARSE_FAILED`.
- **buildSystemPrompt(pillars, keywords?):** Injects identity verbatim; ATS rules from docs/ats-standards-2026.md; optional MUST-WEAVE KEYWORDS block.
- **redraftResume(jd, pillars, keywords?):** Returns StructuredResume; parses JSON, validates with Zod (StructuredResumeSchema), overrides name/contact.email/contact.phone with pillars.
- **redraft() (CLI):** When argv includes `--jd`, runs: `--jd <path> [--market AU|US] [--export pdf]`; with `--export pdf` runs full runPipeline; else prints StructuredResume JSON only.

### schema.ts

- **ExperienceEntrySchema, EducationEntrySchema, StructuredResumeSchema:** Zod schemas mirroring @repo/types; used in redraft parse.

### index.ts

- Re-exports redraftResume, RedraftError, extractJdKeywords, ExtractKeywordsError.

---

## 5. Layout-prep

### apply-constraints.ts

- **applyConstraints(resume, contract):** Deep clone; applies per-field limits from TemplateContract; returns ConstraintResult { resume, metadata }.
- **Field paths:** name, headline, summary; experience[].title, experience[].company, experience[].bullets[]; education[].degree; skills (maxLines × 80 char budget, collapse).
- **record(path, originalLength, maxLength, strategy):** Pushes to truncatedFields and truncationDetails.

### keyword-heatmap.ts

- **TieredKeyword:** `{ term, tier: 'hard'|'alias'|'contextual' }`.
- **TIER_WEIGHTS:** hard 1.0, alias 0.7, contextual 0.3.
- **computeKeywordHeatmap(resume, jdKeywords):** Builds corpora for summary (headline+summary), experience, skills, education; termFound() for phrase (substring) or single-word (word boundary regex); per-section keywords, hasHard, weighted; score = weightedPresent/weightedTotal; returns { keywordHeatmap } with present, missing, score, sections, tiers. Never throws.

### truncate.ts

- **truncateField(value, limit):** trim → slice(maxChars); ellipsis → slice(maxChars-1)+'…'.

### index.ts

- Exports applyConstraints, computeKeywordHeatmap, TieredKeyword, KeywordTier, truncateField.

---

## 6. Contract

### mvp-template.ts

- **MVP_TEMPLATE_CONTRACT:** TemplateContract with fields as in data-models-api.md (name 30, headline 40, summary 600, experience[].title 55, company 30, bullets[] 150, education[].degree 45, skills 16 lines collapse).

### index.ts

- Exports MVP_TEMPLATE_CONTRACT.

---

## 7. Rendering

### pdf/build-pdf.ts

- **ATS invariants:** tagged: true, pdfVersion: '1.5', subset: 'PDF/UA', doc.text() only (no flatten).
- **buildPdf(resume, heatmap):** Validates nonNegotiable sections (summary, skills) have content; creates PDFDocument; renderResume(doc, resume) with Perfect Spacing (lineGap ±10% by content density); document structure root, sections (Contact, Summary, Experience, Education, Skills); chunks to Buffer.
- **Layout constants:** PAGE_WIDTH_PT, PAGE_HEIGHT_PT (A4), MARGIN_PT 56, BASELINE_LINE_GAP 4, BULLET_GAP 3, SECTION_MARGIN 12.

### html/template.ts

- **buildHtmlResume(resume, pillars):** Escapes HTML; builds name, contact (email, phone, linkedin, location), experience (exp-item, exp-header, bullet-list), education (edu-item), skills; returns full HTML document with inline CSS (Liquid Glass style, Georgia, A4 @page, print-optimised).

### html/render-visual-pdf.ts

- **renderVisualPdf(resume, pillars):** Puppeteer launch (headless, --no-sandbox, --disable-setuid-sandbox); setContent(buildHtmlResume); page.pdf(A4, printBackground, margin 0); returns Buffer or undefined on error (logs, does not throw).

### rendering/index.ts

- Exports buildPdf (from pdf), renderVisualPdf, buildHtmlResume (from html).

---

## 8. Scripts (packages/core)

- **scripts/simulate-layout.js:** Used by scripts/verify.sh for Strict Layout Simulation (FR10/FR12); invoked as `node packages/core/scripts/simulate-layout.js --strict`.

---

## 9. Error and code flow summary

| Source | Code | When |
|--------|------|------|
| ingest | JD_MISSING | Neither text nor url provided |
| ingest | JD_URL_FETCH_FAILED | URL invalid or fetch failed |
| extract-jd-keywords | MISSING_ANTHROPIC_KEY, INVALID_ANTHROPIC_KEY, ANTHROPIC_RATE_LIMITED, EXTRACT_PARSE_FAILED | Env or Anthropic/parse failure |
| redraft | MISSING_ANTHROPIC_KEY, INVALID_ANTHROPIC_KEY, ANTHROPIC_RATE_LIMITED, REDRAFT_PARSE_FAILED | Same + Zod validation |
| run-pipeline | (none; passes through above) | visualPdf failure → warning VISUAL_PDF_FAILED |

*Generated using BMAD Method `document-project` workflow (Exhaustive Scan).*
