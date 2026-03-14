# Integration Architecture – resume-builder-v1

**Date:** 2026-03-14

## How Parts Communicate

| From | To   | Type      | Details |
|------|------|-----------|---------|
| **Web** | **API** | REST (JSON) | `POST /api/run-pipeline`, `POST /api/scrape-jd`. Origin controlled by `FRONTEND_ORIGIN`. |
| **CLI** | **Core** | In-process | Direct `runPipeline()` and ingest; no HTTP. |
| **API** | **Core** | In-process | `runPipeline()`, types from `@repo/core`. |
| **API** | **Scraper** | In-process | `scrapeJobDescription()` in `apps/api/src/services/scraper.ts` (Firecrawl or fetch). |

## Data Flow

1. **Web → API → Core:** User submits JD (URL or paste) or structured resume; Web sends `PipelineInput` to API; API calls `runPipeline(input)` and returns base64 PDF + layoutPrep + warnings.
2. **CLI → Core:** User passes `--jd-url`, `--jd-text`, `--jd-file`, or `--resume-json`; CLI builds `PipelineInput` and calls `runPipeline()` locally; outputs PDF path and warnings.
3. **Scrape:** Web or CLI can use JD URL; API exposes `/api/scrape-jd` for Web to fetch markdown before running pipeline (or pipeline ingests URL directly).

## Shared Dependencies

- **@repo/core:** Consumed by `api`, `cli`; contains pipeline, ingest, layout-prep, PDF rendering.
- **@repo/types:** Shared types used by api, cli, core.
- **@repo/ui:** Consumed by `web` only.

## Authentication / Security

- No user auth in MVP; API CORS restricted to `FRONTEND_ORIGIN` (and optional preview).
- API expects `ANTHROPIC_API_KEY` for AI redraft; optional `FIRECRAWL_API_KEY` for scrape.

*Generated using BMAD Method `document-project` workflow.*
