# resume-builder-v1 – Project Overview

**Date:** 2026-03-14  
**Type:** Monorepo (multi-part)  
**Architecture:** Shared core pipeline with API, Web, and CLI consumers

## Executive Summary

Resume-builder-v1 is a Turborepo monorepo that produces ATS-optimized, tagged PDF resumes from job descriptions (JD) or structured resume JSON. A single shared pipeline in `packages/core` is consumed by an Express API (`apps/api`), a Vite SPA (`apps/web`), and a CLI (`apps/cli`). The product is optimized for **iOS-to-PDF** speed and Perfect Spacing reliability.

## Project Classification

- **Repository Type:** Monorepo (pnpm workspaces + Turbo)
- **Project Type(s):** backend (api), web (web), cli (cli)
- **Primary Language(s):** TypeScript
- **Architecture Pattern:** Shared core pipeline; thin API/Web/CLI shells

## Multi-Part Structure

This project consists of 3 distinct parts:

| Part   | Type    | Location   | Purpose                                      |
|--------|---------|------------|----------------------------------------------|
| **API**  | backend | `apps/api` | Express server: `/api/run-pipeline`, `/api/scrape-jd` |
| **Web**  | web     | `apps/web` | Vite SPA: JD input, PDF download, PWA        |
| **CLI**  | cli     | `apps/cli` | Command-line wrapper over core pipeline       |

Shared packages: `packages/core` (pipeline, layout-prep, PDF), `packages/types`, `packages/ui`.

## Technology Stack Summary

| Part | Category   | Technology     | Version / Notes        |
|------|------------|----------------|------------------------|
| Root | Package manager | pnpm        | 8.15.6                 |
| Root | Build     | Turbo          | 2.8.x                  |
| API  | Runtime   | Node + Express | Express 4.x            |
| API  | Core      | @repo/core, @repo/types | workspace |
| Web  | Build     | Vite           | 5.x                    |
| Web  | UI        | @repo/ui       | workspace               |
| CLI  | Runtime   | Node           | bin/run.js             |
| CLI  | Core      | @repo/core, @repo/types | workspace |

## Key Features

- **Single pipeline:** `runPipeline(input)` in `packages/core`; all entry points use it.
- **JD ingestion:** URL scrape (Firecrawl or fetch), paste, or file; AI redraft via Anthropic.
- **Layout & PDF:** Perfect Spacing constraints, tagged PDF/UA, optional visual PDF (Puppeteer).
- **Thin clients:** Web and CLI only collect input, call API or core, and render results.

## Architecture Highlights

- **Content/layout separation:** Layout-prep (`applyConstraints`, `MVP_TEMPLATE_CONTRACT`) is the only place content is truncated; PDF/HTML consume constrained content.
- **ATS guarantees:** Tagged, text-only PDFs; no image flattening.
- **Error contracts:** `IngestError` (e.g. `JD_URL_FETCH_FAILED`) mapped to 4xx in API and Paste JD fallback in Web/CLI.

## Development Overview

### Prerequisites

- Node 18+
- pnpm
- `ANTHROPIC_API_KEY` for AI redraft flows (optional for structured-resume-only)

### Getting Started

```bash
pnpm install
# API: create apps/api/.env (see apps/api/.env.example), then:
pnpm --filter api dev
# Web: in another terminal
pnpm --filter web dev
# CLI: from repo root
node apps/cli/bin/run.js --help
```

### Key Commands

| Scope | Install | Dev        | Build        | Test   |
|-------|---------|------------|-------------|--------|
| Root  | `pnpm install` | `pnpm dev` | `pnpm build` | `pnpm test` |
| API   | —       | `pnpm --filter api dev` | `pnpm --filter api build` | `pnpm --filter api test` |
| Web   | —       | `pnpm --filter web dev` | `pnpm --filter web build` | — |
| CLI   | —       | `node apps/cli/bin/run.js` | `pnpm --filter cli build` | — |

See [Development Guide](./development-guide.md) and [Deployment](./DEPLOY.md) for details.
