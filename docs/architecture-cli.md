# Architecture – CLI (apps/cli)

**Part:** cli  
**Root:** `apps/cli`  
**Scan level:** Deep Scan

## Role

Command-line wrapper over the shared pipeline. Supports JD via `--jd-text`, `--jd-file`, or `--jd-url`, or structured resume via `--resume-json`; `--market US|AU` for identity; outputs ATS PDF and optional `--output-json` (layoutPrep + warnings) and `--output-md` (StructuredResume as Markdown, only with `--resume-json`). No HTTP; calls `runPipeline()` from `@repo/core` directly. Visual PDF is disabled in CLI (`visualPdf: false`).

## Stack

- **Node 18+:** `node:util` `parseArgs`, `readline/promises` (interactive).
- **@repo/core:** `runPipeline`, `PipelineInput`, `IngestError`.
- **@repo/types:** `StructuredResume`.
- **Entry:** `bin/run.js` (built) → `src/index.ts`.

## Modules (Deep Scan)

| File | Purpose |
|------|--------|
| `index.ts` | Parses args; if interactive (no input flags or `--interactive`) calls `promptForArgs()`; validates; calls `runCli(args)`. |
| `args.ts` | `parseCliArgs(argv)` → `CliArgs`; `validateArgs(args)` (no mixing resume-json with JD flags; exactly one of jd-text/jd-file/jd-url); `hasInput(args)`. |
| `run.ts` | Builds `PipelineInput` from `CliArgs` (resumeJson → structuredResume + profile; jdFile → text; jdUrl → url; jdText → text). Calls `runPipeline(input, { visualPdf: false })`. On `IngestError` with `JD_URL_FETCH_FAILED`, prints tip and exits 1. Writes PDF to `args.output`; optional `outputJson` (layoutPrep + warnings), `outputMd` (Markdown from structuredResume, only when input is resume-json). |
| `interactive.ts` | Prompts for input source and paths (readline); returns args compatible with `CliArgs`. |
| `format-md.ts` | `formatResumeAsMarkdown(resume)` for `--output-md`. |

## CliArgs (from args.ts)

| Field | Type | Description |
|-------|------|-------------|
| `jdText?` | string | Inline JD. |
| `jdFile?` | string | Path to JD file. |
| `jdUrl?` | string | JD URL. |
| `resumeJson?` | string | Path to StructuredResume JSON. |
| `output` | string | ATS PDF path (default `./output/resume.pdf`). |
| `outputJson?` | string | Optional layoutPrep + warnings JSON. |
| `outputMd?` | string | Optional Markdown output (only with resume-json). |
| `market` | 'US' \| 'AU' | Target market (default US). |
| `interactive` | boolean | Force interactive mode. |

## Integration

- In-process only; no API. Requires `ANTHROPIC_API_KEY` for JD path; not for `--resume-json` only. Loads `.env` via `dotenv/config` in index.

See [Architecture (overview)](./architecture.md), [CLI usage](./cli-usage.md), and [Integration Architecture](./integration-architecture.md).

*Generated using BMAD Method `document-project` workflow (Deep Scan).*
