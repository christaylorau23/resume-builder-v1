# Memories

## Patterns

### mem-1772918150-34ad
> applyConstraints field path patterns: name/headline/summary are simple strings; experience[].title, experience[].company, experience[].bullets[] use array index; education[].degree per-entry; skills uses maxLines*80 char budget
<!-- tags: layout-prep, constraints | created: 2026-03-07 -->

## Decisions

## Fixes

### mem-1772913626-698f
> pdf-parse v2 (>=2.x) has class-based PDFParse API, not the simple pdfParse(buffer) function; use v1.1.1 for the simple function API
<!-- tags: pdf-parse, dependencies | created: 2026-03-07 -->

### mem-1772913626-45c5
> pdf-parse v1.1.1 debug mode: module loads trigger fs.readFileSync('./test/data/...') when !module.parent; fix: import from 'pdf-parse/lib/pdf-parse.js' directly to bypass
<!-- tags: testing, pdf-parse | created: 2026-03-07 -->

## Context
