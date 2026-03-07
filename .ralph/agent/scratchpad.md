## Iteration 1 — 2026-03-07

### Objective
Implement specs/pdfkit-rendering/ and make scripts/verify.sh pass.

### Current state
- verify.sh PASSES with all todo-tests (tests are skipped)
- buildPdf stub throws "not implemented"
- pdfkit 0.17.2 already installed in @repo/core
- @types/pdfkit 0.13.9 already installed
- pdf-parse NOT yet installed (needed for test text extraction)
- simulate-layout.js passes --strict mode

### What needs to happen
1. Install pdf-parse as dev dep in @repo/core
2. Implement buildPdf with tagged PDF / PDF/UA (tagged: true, pdfVersion: '1.5', subset: 'PDF/UA')
3. Create canonical fixture at packages/core/__tests__/fixtures/canonical-resume.ts
4. Write real tests in build-pdf.test.ts (replace todos)
5. Update pipeline.integration.test.ts to call buildPdf and write output/test-resume.pdf

### Key decisions
- Confidence: 90 — proceed autonomously
- Use pdf-parse to extract text in tests (verify name + "TypeScript" present)
- Struct tags: Document > Sect > H/P/List/LI pattern per spec
- Overflow detection: after rendering, check doc.y > PAGE_HEIGHT_PT - MARGIN_PT
- Perfect Spacing: adjust lineGap ±10% based on content (dynamic computation)
- The heatmap param in tests: use computeKeywordHeatmap from layout-prep

## Iteration 1 — COMPLETE

### Implemented
- buildPdf: full PDFKit renderer with Tagged PDF/UA, struct tags, overflow detection, Perfect Spacing
- pdf-parse@1.1.1 dev dep (imported via lib/ to bypass debug-mode fs.readFileSync on module load)
- canonical-resume.ts fixture with TypeScript/React hard keywords
- build-pdf.test.ts: 7 real tests (Buffer, text extraction, page count=1, perf <5s, sections, error case)
- pipeline.integration.test.ts: writes output/test-resume.pdf, asserts TypeScript in text
- All 25 tests pass; verify.sh passes

### Fix memory: pdf-parse v2 has class API, v1.1.1 has simple function API
### Fix memory: pdf-parse v1 debug mode triggers on !module.parent — use lib/ import
