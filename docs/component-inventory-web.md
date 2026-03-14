# Component Inventory – Web (apps/web)

**Date:** 2026-03-14  
**Part:** web  
**Scan level:** Deep Scan (source files read)

## Overview

The web app is a Vite SPA with app-specific modules in `apps/web/src` and shared UI from `@repo/ui`. No separate design system package; styling via `style.css` and component-level markup. State is minimal: Target Market in localStorage; pipeline mode and scraped JD in module closure.

---

## App entry and composition

| File | Purpose |
|------|--------|
| `main.ts` | Mounts `#app`: Vite/TS logos, Header, Settings, Pipeline, Counter. Calls `renderSettings()`, `renderPipeline()`, `attachSettingsListeners(app)`, `attachPipelineListeners(app)`, `setupCounter(#counter)`. |
| `constants.ts` | `STORAGE_KEYS`, `PHONE_BY_MARKET`, `DEFAULT_TARGET_MARKET`, `TargetMarket`; base URL via `getApiBaseUrl()` (from `VITE_API_URL`). |

---

## Shared UI (`@repo/ui`)

| Export | File | Description |
|--------|------|-------------|
| `Header` | `components/header.ts` | Function `Header({ title: string })` → HTML string `<header id="header"><h1>…</h1></header>`. |
| `Counter` | `components/counter.ts` | Function `Counter()` → `<button id="counter" type="button"></button>`. |
| `setupCounter` | `utils/counter.ts` | Attaches click handler to counter button (increment display). |

---

## Settings (Target Market)

| Export | File | Description |
|--------|------|-------------|
| `getTargetMarket` | `settings.ts` | Reads `localStorage` (US \| AU); default from constants. |
| `setTargetMarket` | `settings.ts` | Writes Target Market to localStorage. |
| `getProfilePhone` | `settings.ts` | Phone for current market (display only). |
| `renderSettings` | `settings.ts` | HTML: "Settings" section, label "Target Market", toggle buttons US 🇺🇸 / AU 🇦🇺, hint with phone. |
| `attachSettingsListeners` | `settings.ts` | Toggle `.toggle-btn[data-market]` click → update market, aria-pressed, hint text. |

---

## Pipeline (Generate Resume)

| Export | File | Description |
|--------|------|-------------|
| `renderPipeline` | `pipeline.ts` | HTML for "Generate Resume" section: tablist (Paste JD, Paste Resume JSON, Job URL), textarea, URL input, JD preview block, run button, status, results (PDF links, heatmap, visual PDF, warnings). |
| `attachPipelineListeners` | `pipeline.ts` | Tab switching; URL validation; "Fetch & Preview" (Job URL) → `callScrapeJd` → show preview → "Use this JD → Generate" or "Try different URL"; Paste JD/JSON → `callRunPipeline`; on `PipelineApiError` with `JD_URL_FETCH_FAILED` switches to Paste JD tab (AC2). |

### Pipeline UI elements (IDs / classes)

| Element | Role |
|---------|------|
| `.pipeline-tab[data-mode="jd"|"json"|"url"]` | Tab buttons. |
| `#pipeline-input` | Textarea (JD or JSON). |
| `#pipeline-url-input` | Job URL input. |
| `#pipeline-url-error` | URL validation message. |
| `#pipeline-jd-preview`, `#pipeline-jd-preview-text` | Scraped JD preview. |
| `#pipeline-jd-confirm`, `#pipeline-jd-retry` | Use JD / Try different URL. |
| `#pipeline-run` | Generate / Fetch & Preview button. |
| `#pipeline-status` | Status or error message (aria-live). |
| `#pipeline-results` | Container for PDF links, heatmap, visual PDF, warnings. |
| `#pipeline-pdf-links`, `#pipeline-heatmap`, `#pipeline-visual-pdf`, `#pipeline-warnings` | Result sub-blocks. |
| `#pipeline-api-hint` | Shown when `VITE_API_URL` not set (run button disabled). |

---

## API client (`api.ts`)

| Export | Description |
|--------|-------------|
| `buildPipelineHeaders()` | `{ 'Content-Type': 'application/json' }`. |
| `buildPipelineProfile()` | `{ targetMarket: getTargetMarket() }`. |
| `PipelineResponse` | Interface: pdf, visualPdf?, layoutPrep.keywordHeatmap?, warnings, suggestedFilename?. |
| `callScrapeJd(url)` | POST `/api/scrape-jd` with `{ url }`; returns `{ markdown }`. |
| `PipelineApiError` | Error subclass with `code`. |
| `callRunPipeline(body)` | POST `/api/run-pipeline` with body; throws `PipelineApiError` on non-OK; normalizes fetch errors (e.g. "Cannot reach API..."). |

---

## Component summary

- **Layout:** Single column: logos, Header, Settings card, Pipeline card, Counter card.
- **State management:** No Redux/Vuex; localStorage for Target Market; pipeline mode and scraped JD in closure inside `attachPipelineListeners`.
- **Design system:** None; vanilla TS + CSS. Reusable pieces: `Header`, `Counter` in `@repo/ui`; pipeline and settings are app-specific sections with inline HTML strings.

*Generated using BMAD Method `document-project` workflow (Deep Scan).*
