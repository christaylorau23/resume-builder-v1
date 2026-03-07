# Implementation Plan

Ordered steps to implement the story. Source: BMAD story (slug: ai-redraft-orchestrator).

---

## Objective (reminder)

Implement the orchestration layer that ingests job description input (raw text or URL), runs AI redraft with ATS keyword weaving, and enforces layout-safe character limits per section so output never overflows the PDF or Canva template. This story covers JD ingestion behavior, mobile fallback when URL fetch fails, keyword weaving into bullets, and strict section character counts.

---

---

## Steps

1. Add PDFKit dependency: `pnpm add pdfkit --filter @repo/core` and `pnpm add -D @types/pdfkit --filter @repo/core`.

2. Change `buildPdf` signature to accept `(resume: StructuredResume, heatmap: KeywordHeatmap): Promise<Buffer>` and add types from `@repo/types`.

3. Define page layout constants at top of `build-pdf.ts` (PAGE_WIDTH_PT, PAGE_HEIGHT_PT, MARGIN_PT, BASELINE_LINE_GAP, BULLET_GAP, SECTION_MARGIN).

4. Initialize PDFDocument with tagged PDF/PDF/UA options (tagged: true, pdfVersion: '1.5', subset: 'PDF/UA'); use doc.text() only for text.

5. Implement heatmap-aware section rendering: respect heatmap.sections[section].nonNegotiable and render those sections in full.

6. After writing all content, implement overflow detection: if doc.y > PAGE_HEIGHT_PT - MARGIN_PT, throw a descriptive error (fail fast, no second page).

7. Implement Perfect Spacing: dynamic lineGap ±10% and/or bullet spacing collapse; use named constants only.

8. Add logical structure tags with doc.struct() (Document, Sect, H, P, List/LI) and doc.markStructureContent() for each text block.

9. Create canonical fixture in packages/core/__tests__/fixtures/canonical-resume.ts (CANONICAL_RESUME, CANONICAL_JD_KEYWORDS) per story fixture spec.

10. Extend build-pdf.test.ts: assert tagged PDF, page count === 1, and that parsed text contains candidate name and hard keyword.

11. Implement pipeline.integration.test.ts: call buildPdf with canonical fixture, write Buffer to output/test-resume.pdf, parse and assert hard keyword in text.

12. Add performance assertion: buildPdf completes in under 5 seconds for the canonical 1-page resume.


---

Before marking done, run: `bash scripts/verify.sh`