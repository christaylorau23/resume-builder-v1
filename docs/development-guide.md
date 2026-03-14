# Development Guide – resume-builder-v1

**Date:** 2026-03-14

## Prerequisites

- **Node 18+**
- **pnpm** (package manager)
- **ANTHROPIC_API_KEY** (for AI redraft flows; not required for structured-resume-only)

## Root Setup

```bash
git clone <repo-url>
cd resume-builder-v1
pnpm install
```

## API (apps/api)

- **Env:** Copy `apps/api/.env.example` to `apps/api/.env`. Set:
  - `ANTHROPIC_API_KEY` (required for JD redraft)
  - `FRONTEND_ORIGIN=http://localhost:5173` (or your web origin)
  - Optional: `FIRECRAWL_API_KEY` for URL scrape
- **Dev:** `pnpm --filter api dev` (tsx watch)
- **Build:** `pnpm --filter api build`
- **Test:** `pnpm --filter api test`

## Web (apps/web)

- **Env:** Optional `VITE_API_URL` (default targets local API).
- **Dev:** `pnpm --filter web dev` (Vite, typically http://localhost:5173)
- **Build:** `pnpm --filter web build`

## CLI (apps/cli)

- **Build:** `pnpm --filter cli build`
- **Run:** `node apps/cli/bin/run.js [options]` or `pnpm exec resume-builder [options]`
- **ANTHROPIC_API_KEY** required for JD path; not needed for `--resume-json` only.

See [CLI usage](./cli-usage.md) for full options.

## Verification

From repo root:

```bash
bash scripts/verify.sh
```

Runs: tests (Turbo), optional lint/typecheck/build, **Strict Layout Simulation** (`packages/core/scripts/simulate-layout.js --strict`), and **ATS Readability Gate** (KeywordHeatmap contract). See [Scripts and Tooling](./scripts-and-tooling.md).

## Deployment

See [DEPLOY.md](./DEPLOY.md) for API + Web (e.g. Vercel) and CORS setup.

*Generated using BMAD Method `document-project` workflow.*
