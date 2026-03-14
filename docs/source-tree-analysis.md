# resume-builder-v1 – Source Tree Analysis

**Date:** 2026-03-14

## Overview

The repository is a pnpm + Turbo monorepo with three applications (`api`, `web`, `cli`) and shared packages (`core`, `types`, `ui`, `eslint-config`, `typescript-config`). All apps depend on `@repo/core` for the resume pipeline; the web app also uses `@repo/ui`.

## Multi-Part Structure

- **api** (`apps/api`): Express API server
- **web** (`apps/web`): Vite SPA frontend
- **cli** (`apps/cli`): CLI binary

## Complete Directory Structure

```
resume-builder-v1/
├── apps/
│   ├── api/                    # Express API (Part: api)
│   │   ├── src/
│   │   │   ├── index.ts        # Express app, POST /api/run-pipeline, POST /api/scrape-jd
│   │   │   ├── services/
│   │   │   │   └── scraper.ts  # JD URL scraper (Firecrawl / fetch)
│   │   │   └── __tests__/
│   │   ├── package.json
│   │   └── .env.example
│   ├── web/                    # Vite SPA (Part: web)
│   │   ├── src/
│   │   │   ├── api.ts          # API client, buildPipelineProfile
│   │   │   ├── pipeline.ts     # Pipeline UI, PDF download
│   │   │   └── ...
│   │   ├── package.json
│   │   └── index.html
│   └── cli/                    # CLI (Part: cli)
│       ├── src/
│       │   └── index.ts        # CLI entry, runPipeline wrapper
│       ├── bin/
│       │   └── run.js          # Binary entry
│       └── package.json
├── packages/
│   ├── core/                   # Shared pipeline & rendering
│   │   ├── src/
│   │   │   ├── pipeline/       # run-pipeline.ts, ingest.ts
│   │   │   ├── ai/             # redraft, keyword extraction
│   │   │   ├── layout-prep/    # constraints, template contract
│   │   │   └── rendering/      # pdf/, html/
│   │   └── package.json
│   ├── types/                  # Shared TypeScript types
│   ├── ui/                     # Shared UI components (used by web)
│   ├── eslint-config/
│   └── typescript-config/
├── docs/                       # Project knowledge (this doc set)
├── specs/                      # Feature specs (e.g. BYOM auth)
├── scripts/                    # verify.sh, notify, etc.
├── package.json                # Root workspace
├── pnpm-workspace.yaml
├── turbo.json
├── Dockerfile                  # API container
└── vercel.json                 # Web deploy config
```

## Critical Directories

| Path | Purpose | Entry / Integration |
|------|---------|---------------------|
| `apps/api/src` | Express server; pipeline & scrape endpoints | `index.ts` → `runPipeline`, `scrapeJobDescription` |
| `apps/web/src` | SPA: API client, pipeline UI, PDF download | `api.ts` → API; `pipeline.ts` → user flow |
| `apps/cli/src` | CLI args, runPipeline, file/console output | `index.ts` → `runPipeline` |
| `packages/core/src/pipeline` | Orchestrator, ingest, types | `run-pipeline.ts`, `ingest.ts` |
| `packages/core/src/ai` | JD keyword extraction, AI redraft | Used by pipeline |
| `packages/core/src/layout-prep` | Template contract, constraints, heatmap | Used by pipeline before PDF |
| `packages/core/src/rendering` | PDF (PDFKit), HTML (visual PDF) | Used by pipeline |

## Integration Points

- **Web → API:** `POST /api/run-pipeline`, `POST /api/scrape-jd` (from `apps/web` via `VITE_API_URL`).
- **CLI → Core:** Direct `runPipeline()` from `apps/cli` (no HTTP).
- **API → Core:** `runPipeline()` and `scrapeJobDescription` (scraper in api, pipeline in core).

## Entry Points

- **API:** `apps/api/src/index.ts` (Express app).
- **Web:** `apps/web/index.html` → Vite entry.
- **CLI:** `apps/cli/bin/run.js` → `apps/cli/src/index.ts`.

*Generated using BMAD Method `document-project` workflow*
