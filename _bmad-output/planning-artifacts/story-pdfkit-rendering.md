# Story: Implement PDFKit Rendering Engine

**Story ID:** story-pdfkit-rendering
**Epic:** Core PDF Pipeline
**PRD References:** FR10, FR11, FR13, NFR-P1
**Status:** ready
**Created:** 2026-03-07

---

## Objective

Replace the `buildPdf` placeholder in `packages/core/src/rendering/pdf/build-pdf.ts` with a
layout-aware PDFKit implementation that produces ATS-readable, single-page, "Perfect Spacing"
resumes from the constrained `StructuredResume` + `KeywordHeatmap` output of the layout-prep step.

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

## Fixture Specification

Create `packages/core/__tests__/fixtures/canonical-resume.ts` with:

```ts
import type { StructuredResume } from '@repo/types';
import type { TieredKeyword } from '../../src/layout-prep';

export const CANONICAL_RESUME: StructuredResume = {
  name: 'Jordan Lee',
  contact: {
    email: 'jordan@example.com',
    phone: '+1 555 000 0000',
    location: 'San Francisco, CA',
  },
  headline: 'Senior Software Engineer — TypeScript / Node.js',
  summary:
    'Full-stack engineer with 8 years building high-throughput APIs and React SPAs. ' +
    'Deep experience with TypeScript, Node.js, and distributed systems on AWS.',
  experience: [
    {
      title: 'Staff Engineer',
      company: 'Acme Corp',
      dates: '2021–present',
      bullets: [
        'Led migration of monolith to microservices, reducing p99 latency by 40%.',
        'Designed TypeScript SDK used by 200+ internal developers.',
        'Mentored 4 engineers; established team coding standards and review process.',
      ],
    },
    {
      title: 'Senior Engineer',
      company: 'Beta Inc',
      dates: '2018–2021',
      bullets: [
        'Built Node.js data pipeline processing 10M events/day with zero downtime.',
        'Integrated AWS Lambda for cost-optimized batch processing.',
      ],
    },
  ],
  education: [
    {
      degree: 'B.S. Computer Science',
      institution: 'State University',
      dates: '2014–2018',
    },
  ],
  skills: ['TypeScript', 'Node.js', 'React', 'AWS', 'PostgreSQL', 'Docker', 'Kubernetes'],
};

export const CANONICAL_JD_KEYWORDS: TieredKeyword[] = [
  { term: 'TypeScript', tier: 'hard' },
  { term: 'Node.js',    tier: 'hard' },
  { term: 'AWS',        tier: 'alias' },
  { term: 'React',      tier: 'alias' },
  { term: 'Docker',     tier: 'contextual' },
];
```

---

## Implementation Notes

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

## Out of Scope for This Story

- Canva export (`export-canva.ts`) — separate story.
- AI redraft (`ai/redraft.ts`) — separate story.
- CLI wiring (`apps/cli`) — depends on `runPipeline` orchestrator story.
- Web UI (`apps/web`) — separate story.
- Multi-template support — post-MVP.
- Font embedding beyond PDFKit's built-in Helvetica/Times — post-MVP.

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

## Dependencies

| Dependency | Story / ticket |
|-----------|----------------|
| `layout-prep` (`applyConstraints`, `computeKeywordHeatmap`) | Done |
| `@repo/types` (`StructuredResume`, `KeywordHeatmap`, `PipelineResult`) | Done |
| `MVP_TEMPLATE_CONTRACT` (field limits) | Done (stub — use as-is) |
| `pdfkit` npm package | Install in this story |
