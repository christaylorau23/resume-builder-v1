# Requirements

Source: BMAD story (`_bmad-output/planning-artifacts/`). Story ID: story-pdfkit-rendering

---

## Objective

Replace the `buildPdf` placeholder in `packages/core/src/rendering/pdf/build-pdf.ts` with a
layout-aware PDFKit implementation that produces ATS-readable, single-page, "Perfect Spacing"
resumes from the constrained `StructuredResume` + `KeywordHeatmap` output of the layout-prep step.

---

---

## Acceptance Criteria (Definition of Done)

### AC1 — Tagged PDF / Searchable Text Layer (FR13)
- PDFKit MUST be initialized with all three flags:
  ```ts
  const doc = new PDFDocument({
    tagged: true,
    pdfVersion: '1.5',
    subset: 'PDF/UA',
    info: { Title: resume.name },
  });
  ```
- Text is written with `doc.text()` — never `doc.path()`, `doc.image()`, or any vector-flattening call.
- A `pdf-parse` or `pdftotext` check on the output buffer MUST find selectable text containing the candidate's name.

### AC2 — Heatmap-Aware Section Protection (FR11)
- `buildPdf` accepts `heatmap: KeywordHeatmap` as a second parameter.
- Sections where `heatmap.sections[section].nonNegotiable === true` MUST be rendered in full
  (their content was already constrained by layout-prep; the renderer must not omit or truncate them).
- If the renderer detects overflow (content exceeds page height), it MUST throw a descriptive error
  rather than silently spilling onto a second page. The layout-prep step is responsible for preventing
  this; the renderer surfaces it as a bug signal.

### AC3 — Perfect Spacing (FR10)
- The renderer MUST implement at least one spacing adjustment to avoid widows/orphans:
  - Dynamic `lineGap` adjustment: increase or decrease by up to ±10% of the baseline value
    to fill or tighten vertical rhythm without the human eye noticing.
  - Bullet spacing collapse: if the last bullet in an experience block would widow, reduce
    bullet-to-bullet gap on that block proportionally.
- All spacing constants (baseline `lineGap`, `bulletGap`, section `marginBottom`) MUST be
  defined at the top of the file as named constants — no magic numbers inline.
- A test must assert that the rendered PDF page count is exactly 1 for the canonical fixture resume.

### AC4 — Logical Structure Tags (Tagged PDF / PDF/UA)
- Use `doc.struct()` to wrap each resume section into a logical structure element:
  - Document root: `Document`
  - Each section: `Sect` (with `title` attribute matching section name)
  - Section headings (e.g. "Experience"): `H`
  - Body paragraphs (summary, bullets): `P`
  - Skills list: `List` containing `LI` items
- `doc.markStructureContent()` must be called for each text block inside a struct.
- Reading order must be top-to-bottom, left-to-right (standard resume order).

### AC5 — Performance (NFR-P1)
- `buildPdf` must complete in under **5 seconds** for a 1-page resume on CI hardware
  (the 15s budget includes AI reasoning; PDF-only step gets 5s of that).
- A performance test (or a `console.time` assertion in the integration test) must verify this.

### AC6 — Output File Verification Gate
- The integration test in `packages/core/__tests__/pipeline.integration.test.ts` must:
  1. Call `buildPdf` with the canonical fixture resume (see fixture spec below).
  2. Write the resulting `Buffer` to `output/test-resume.pdf` (gitignored, created by test).
  3. Parse the PDF bytes and assert at least one "Hard" keyword (from the fixture's `jdKeywords`)
     is present as readable text in the output.
- If `output/test-resume.pdf` already exists from a prior run, it must be overwritten.

---

---

## Verification Gate

Before marking this story done, run:

```bash
bash scripts/verify.sh
```

All of the following must pass with zero errors:
- `pnpm typecheck` — no TypeScript errors in `packages/core`
- `pnpm lint` — no ESLint errors
- `pnpm test` — all tests pass, including:
  - `build-pdf.test.ts` assertions (tagged PDF, page count = 1, hard keyword in text)
  - `pipeline.integration.test.ts` writes `output/test-resume.pdf`
- `output/test-resume.pdf` exists and `grep`-equivalent finds "TypeScript" in parsed text

---

---

## Dependencies

| Dependency | Story / ticket |
|-----------|----------------|
| `layout-prep` (`applyConstraints`, `computeKeywordHeatmap`) | Done |
| `@repo/types` (`StructuredResume`, `KeywordHeatmap`, `PipelineResult`) | Done |
| `MVP_TEMPLATE_CONTRACT` (field limits) | Done (stub — use as-is) |
| `pdfkit` npm package | Install in this story |