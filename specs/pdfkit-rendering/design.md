# Design

Technical context and implementation constraints for the renderer.

---

## Context

### What already exists

| File | State |
|------|-------|
| `packages/core/src/rendering/pdf/build-pdf.ts` | Placeholder stub — throws `Error('not implemented')` |
| `packages/core/src/layout-prep/` | Complete — `applyConstraints` + `computeKeywordHeatmap` |
| `packages/core/src/contract/mvp-template.ts` | `MVP_TEMPLATE_CONTRACT` with stub field limits |
| `packages/core/src/pipeline/run-pipeline.ts` | Placeholder — calls nothing yet |
| `packages/core/src/rendering/pdf/build-pdf.test.ts` | Existing test file — extend, do not replace |

### Critical constraints (from architecture)

- `buildPdf` receives only **constrained** content (post layout-prep). No re-truncation inside renderer.
- Layout engine is **deterministic**: same input always yields same PDF bytes (within PDFKit tolerance).
- Content/layout separation is **non-negotiable**: no AI calls, no truncation logic, no Canva API calls inside `buildPdf`.

---

---

## Implementation Notes (signature, layout, overflow)

### Signature change for `buildPdf`

```ts
// packages/core/src/rendering/pdf/build-pdf.ts
import type { StructuredResume, KeywordHeatmap } from '@repo/types';

export async function buildPdf(
  resume: StructuredResume,
  heatmap: KeywordHeatmap,
): Promise<Buffer>
```

### Page layout constants (define at top of file)

```ts
const PAGE_WIDTH_PT   = 595.28; // A4 points
const PAGE_HEIGHT_PT  = 841.89;
const MARGIN_PT       = 56;     // ~20mm
const BASELINE_LINE_GAP = 4;    // pt — adjust ±10% for Perfect Spacing
const BULLET_GAP      = 3;      // pt between bullets
const SECTION_MARGIN  = 12;     // pt below each section heading
```

### PDFKit install

```bash
pnpm add pdfkit --filter @repo/core
pnpm add -D @types/pdfkit --filter @repo/core
```

### Overflow detection

After writing all content, capture the current Y position:
```ts
if (doc.y > PAGE_HEIGHT_PT - MARGIN_PT) {
  throw new Error(
    `buildPdf: content overflowed page (y=${doc.y}). ` +
    'Layout-prep constraints must be tightened.'
  );
}
```

---

---

## Out of Scope for This Story

- Canva export (`export-canva.ts`) — separate story.
- AI redraft (`ai/redraft.ts`) — separate story.
- CLI wiring (`apps/cli`) — depends on `runPipeline` orchestrator story.
- Web UI (`apps/web`) — separate story.
- Multi-template support — post-MVP.
- Font embedding beyond PDFKit's built-in Helvetica/Times — post-MVP.

---