# Scripts and Tooling – Exhaustive Reference

**Date:** 2026-03-14  
**Scan level:** Exhaustive

## Root scripts (scripts/)

| Script | Purpose |
|--------|--------|
| **verify.sh** | Factory verify gate: `npm -s test`; optional lint/typecheck/build if present; **Strict Layout Simulation** `node packages/core/scripts/simulate-layout.js --strict` (FR10/FR12); **ATS Readability Gate** grep for `KeywordHeatmap` in keyword-heatmap.ts (FR13). Fails on first failure. |
| **notify.ts** | Run via `pnpm notify` or `pnpm notify:test`; see package.json. |
| **bmad_to_ralph.py** | BMAD-to-Ralph conversion (story → Ralph spec). |
| **smoke-test-pipeline.sh** | Smoke test for pipeline (if present). |

## Core scripts (packages/core)

| Script | Purpose |
|--------|--------|
| **scripts/simulate-layout.js** | Layout simulation with char limits (e.g. summary 60, experienceBullet 50, skills 80, education 80); strict mode; used by verify.sh. |

## Redraft CLI (packages/core, ai/redraft.ts)

When run with `--jd <path>` (e.g. from package script):

- **redraft():** Reads JD from file; `--market AU|US` (default AU in redraft CLI); `--export pdf` runs full runPipeline and logs result; without `--export` prints StructuredResume JSON only.

## Verification gates (verify.sh)

1. **Tests:** `npm -s test` (Turbo runs tests in all workspaces).
2. **Lint / typecheck / build:** If script exists in root package.json.
3. **Strict Layout Simulation:** Ensures layout constraints and keyword protection (FR10/FR12).
4. **ATS Readability Gate:** Ensures KeywordHeatmap contract present (FR13).

*Generated using BMAD Method `document-project` workflow (Exhaustive Scan).*
