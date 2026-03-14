# CLI usage — resume-builder

The **resume-builder** CLI lives in `apps/cli`. It wraps the shared core pipeline: you supply a job description (text, file, or URL) or a structured resume JSON, choose target market (US/AU), and get an ATS-optimized PDF plus optional debug outputs.

---

## Prerequisites

- **Node 18+** (CLI uses `node:util` `parseArgs` and `readline/promises`).
- **pnpm** (or npm) for installing and building.
- **`ANTHROPIC_API_KEY`** in your environment for any run that uses the **JD path** (inline text, file, or URL).  
  For **structured-resume-only** runs (`--resume-json`), the CLI does not call Anthropic; no key needed.

---

## Build and run from repo root

After `pnpm install` from the repo root:

```bash
cd apps/cli
pnpm build
```

Then run the binary:

```bash
node bin/run.js [options]
```

Or from repo root:

```bash
node apps/cli/bin/run.js [options]
```

If you install the workspace binary (e.g. via `pnpm exec` from repo root), you can also run:

```bash
pnpm exec resume-builder [options]
```

---

## Flags reference

| Flag | Description |
|------|-------------|
| `--jd-text "<text>"` | Inline job description text. |
| `--jd-file <path>` | Path to a text file containing the JD. |
| `--jd-url <url>` | URL to fetch the JD from (best-effort; on failure use `--jd-text` or `--jd-file`). |
| `--resume-json <path>` | Path to a `StructuredResume` JSON file; skips AI redraft (FR5). |
| `--output <path>` | Output path for the ATS PDF (default: `./output/resume.pdf`). |
| `--output-json <path>` | Optional: write `{ layoutPrep, warnings }` as JSON. |
| `--output-md <path>` | Optional: write structured resume as Markdown (only with `--resume-json`). |
| `--market US\|AU` | Target market for Identity Pillars phone (default: `US`). |
| `--interactive` | Force interactive mode (prompts for input even if flags are present). |

**Rules:**

- Supply **exactly one** of: `--jd-text`, `--jd-file`, `--jd-url`, or `--resume-json`. Combining `--resume-json` with any JD flag is an error.
- Output directory for `--output`, `--output-json`, and `--output-md` is created if missing.

---

## Examples

### JD from inline text

```bash
export ANTHROPIC_API_KEY=your-real-key

node apps/cli/bin/run.js \
  --jd-text "We need a TypeScript engineer with React and Node experience." \
  --market US \
  --output ./output/my-resume.pdf
```

### JD from file

```bash
node apps/cli/bin/run.js \
  --jd-file ./job-description.txt \
  --market AU \
  --output ./output/resume-au.pdf
```

### JD from URL (with fallback)

If the URL is blocked or fails, the CLI exits with a clear message and suggests `--jd-text` or `--jd-file`:

```bash
node apps/cli/bin/run.js \
  --jd-url "https://example.com/job-posting" \
  --market US \
  --output ./output/resume-from-url.pdf
```

### Structured resume only (no AI)

No `ANTHROPIC_API_KEY` required. Good for re-rendering an existing resume to PDF or debugging layout:

```bash
node apps/cli/bin/run.js \
  --resume-json ./my-resume.json \
  --output ./output/resume-from-json.pdf \
  --output-json ./output/layout-debug.json \
  --output-md ./output/resume.md
```

### Interactive mode

Run with no arguments (or `--interactive`) in a TTY to get prompted for:

1. Input mode: (1) Paste JD, (2) JD file path, (3) Job URL, (4) Structured JSON path.
2. The value (paste text, path, or URL depending on mode).
3. Target market (US/AU).
4. Output PDF path (default `./output/resume.pdf`).

```bash
node apps/cli/bin/run.js
# or
node apps/cli/bin/run.js --interactive
```

In non-TTY environments (e.g. CI), the CLI does not start interactive mode; you must supply flags.

---

## Scripting and CI

- **Exit codes:** `0` on success; `1` on validation error or pipeline failure.
- **stdout:** Success message with output path (e.g. `PDF written to /path/to/resume.pdf`). Optional debug paths for `--output-json` / `--output-md` are also printed.
- **stderr:** Validation and pipeline errors; non-fatal warnings as `[WARN] CODE: message` (e.g. `[WARN] VISUAL_PDF_FAILED: ...`). Scripts can grep stderr for `[WARN]` to detect non-fatal issues.

Example: fail the script if the CLI exits non-zero, and optionally check for warnings:

```bash
set -e
node apps/cli/bin/run.js --jd-file ./job.txt --market US --output ./out/resume.pdf 2>stderr.log
if grep -q '\[WARN\]' stderr.log; then
  echo "Pipeline completed with warnings; see stderr.log"
fi
```

Batch example (multiple JDs in a directory):

```bash
export ANTHROPIC_API_KEY=your-real-key
mkdir -p ./output/batch
for f in ./jds/*.txt; do
  name=$(basename "$f" .txt)
  node apps/cli/bin/run.js --jd-file "$f" --market US --output "./output/batch/${name}.pdf" || true
done
```

---

## Environment

- **`ANTHROPIC_API_KEY`**  
  Required for `--jd-text`, `--jd-file`, and `--jd-url`. Loaded from the environment; the CLI also loads `dotenv` from the repo root or `apps/cli/.env` if present, so you can put the key in `.env` instead of exporting.

- **No API server**  
  The CLI calls `packages/core` directly (same process). It does not talk to `apps/api` or `apps/web`.

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| `ANTHROPIC_API_KEY is not set` | Set the key in your shell or in `apps/cli/.env` / repo root `.env`. |
| `JD_URL_FETCH_FAILED` | URL fetch failed (blocked, timeout, 4xx/5xx). Use `--jd-file` or `--jd-text` with the JD content instead. |
| `Cannot combine --resume-json with JD flags` | Use only one input: either `--resume-json` or one of `--jd-text` / `--jd-file` / `--jd-url`. |
| `Provide exactly one of --jd-text, --jd-file, or --jd-url` | You passed more than one JD option; pick one. |
| Interactive mode not starting | Interactive mode only runs when stdin is a TTY. In CI or when piping, use explicit flags. |

For full story and acceptance criteria, see `_bmad-output/implementation-artifacts/4-1-cli-pipeline-runner.md`.
