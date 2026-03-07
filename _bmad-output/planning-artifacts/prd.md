---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
inputDocuments: []
workflowType: 'prd'
briefCount: 0
researchCount: 0
brainstormingCount: 0
projectDocsCount: 0
classification:
  projectType: cli_and_web
  projectTypeNote: CLI for core engine/automation; Web UI for Canva integration and template preview. Canva path is primary export option.
  domain: general
  complexity: medium
  projectContext: greenfield
---

# Product Requirements Document - resume-builder-v1

**Author:** Author
**Date:** 2025-03-06

## Executive Summary

Resume-Builder-V1 is a dual-interface product (CLI + Web) that turns job descriptions and structured input (JSON or Markdown) into ATS-optimized resume content and publishes it to local PDF and Canva. Target users are job seekers who need to tailor resumes per role without juggling ATS tips and design tools. The product solves the JD-to-resume pivot: one job link or input → optimized redraft → PDF for application portals and a Canva design for high-impact, human-readable versions.

### What Makes This Special

Content optimization (ATS) and visual design (Canva) are usually separate; this tool unifies them. The differentiator is one-click Canva export: AI-optimized, keyword-rich text is placed into a professional Canva template so users pass automated filters and still look strong to recruiters. One-sentence pitch: *Automate the tedious JD-to-Resume pivot with an AI engine that guarantees ATS optimization and high-end Canva design in under 3 minutes.*

## Project Classification

| Attribute | Value |
|----------|--------|
| **Project type** | CLI + Web (CLI: core engine and automation; Web: Canva integration and template preview). Canva is the primary export path. |
| **Domain** | General (productivity / document generation). |
| **Complexity** | Medium (local PDF generation, Canva API, two interfaces). |
| **Context** | Greenfield. |

## Success Criteria

### User Success

- **Aha moment:** User gets a job notification on iOS, pastes the JD or URL, and has a **perfectly formatted PDF ready in the mobile browser within 3 minutes** (to allow high-reasoning AI for deep JD analysis and ATS optimization).
- **Zero manual layout fixes:** User never has to fix widows, orphans, or awkward white space on mobile (or desktop).
- **Confidence:** User trusts the resume will pass the initial ATS screen without manual keyword hunting.

### Business Success

- **Adoption bar:** The tool is reliable enough to become the only way the user applies for jobs.
- **Outcome signal:** Measurable increase in interview callback rates after switching to these AI-optimized drafts.

### Technical Success

- **Single source of truth:** One input (JSON or Markdown) correctly populates both local PDF and Canva template.
- **Canva integration:** Canva API places text accurately so no manual reformatting is needed after export.
- **Scraping resilience:** If a JD URL is blocked or fails, the **mobile "Paste JD" fallback is seamless** (no dead end; paste path works every time).
- **Formatting engine:** Strict layout rules (e.g. LaTeX-style spacing or CSS print-media queries) so the output looks **human-crafted** every time—no ragged or broken layout.

### Measurable Outcomes

| Outcome | Target |
|--------|--------|
| JD → PDF on mobile | Under 3 minutes (180s) in mobile browser; TTI ≤2s so user isn't waiting on a blank screen |
| Layout quality | No manual widows, orphans, or white-space fixes |
| URL failure handling | Seamless fallback to Paste JD when URL is blocked |
| Export parity | Same content in PDF and Canva, no manual fix-up |
| Canva placement | Accurate text placement via API |

## Product Scope

### MVP – Minimum Viable Product

- **iOS-friendly web interface** for JD input (paste or URL).
- **JD-to-Markdown AI redrafting** from that input.
- **"Perfect Spacing" logic** for a single, high-impact resume template (strict layout rules; human-crafted look).
- **Local PDF generation** from the same source (JSON/Markdown).
- **One fixed Canva template** populated via API with accurate text placement.

### Growth (post-MVP)

- Multiple Canva templates; enhanced ATS keyword scoring; richer Web UI for JD pasting and workflow.

### Vision (future)

- Full browser automation: paste LinkedIn (or other) job URL → one click → PDF + Canva design ready.

## User Journeys

### Journey 1 – Jordan (job seeker), success path

- **Opening:** Jordan gets a job notification on their iPhone. They tap through to the JD and want to apply before the commute ends. They're worried about ATS and don't want to tweak layout on a small screen.
- **Rising action:** They open the Resume-Builder web app (iOS-friendly), paste the JD (or the job URL). The system runs JD-to-Markdown AI redrafting and applies "Perfect Spacing" to the template.
- **Climax:** Within 3 minutes they have a PDF in the mobile browser—no widows, orphans, or awkward white space. They download or share it for the application and feel confident it will pass the robot screen.
- **Resolution:** They submit the application with the same PDF (and optionally use Canva for a "human" version). The tool becomes their default way to apply.

### Journey 2 – Jordan, edge case (URL blocked)

- **Opening:** Jordan pastes a job URL instead of the raw JD. The app tries to fetch the JD from the URL.
- **Rising action:** The URL is blocked (paywall, auth, or bot protection). Instead of a dead end or a technical error, the app clearly asks for the JD text and offers a **Paste JD** option.
- **Climax:** Jordan pastes the JD from their clipboard. The same pipeline runs (redraft + Perfect Spacing), and they still get the PDF in under 3 minutes.
- **Resolution:** They don't lose the opportunity; the product feels reliable even when scraping fails. *Paste JD fallback on mobile is non-negotiable for this workflow.*

### Journey 3 – Sam (CLI / automation user)

- **Opening:** Sam applies to many roles and wants to automate JD → resume. They have a list of JDs (files or URLs) and want PDFs (and optionally Canva) without touching the web UI each time.
- **Rising action:** They run the CLI with a JD file or URL. The core engine does JD-to-Markdown, then generates the PDF (and Canva if configured) from the same source of truth.
- **Climax:** One command produces a consistent, human-crafted-looking PDF (and Canva design) with no manual layout fixes. Sam can script this for batch or CI.
- **Resolution:** The CLI is their only way to generate resumes at scale; the Web UI remains for quick one-off mobile use.

### Journey Requirements Summary

| Capability area | From journeys |
|-----------------|----------------|
| JD input | Web: paste or URL; CLI: file/URL. Paste fallback when URL fails. |
| AI redrafting | JD → ATS-optimized Markdown (and/or structured format). |
| Formatting engine | "Perfect Spacing" so PDF looks human-crafted (no widows/orphans). |
| PDF generation | Local PDF from single source (JSON/Markdown). |
| Canva export | One template (MVP); accurate text placement via API. |
| Mobile experience | iOS-friendly web UI; PDF ready in mobile browser in under 3 minutes; TTI ≤2s. |
| Resilience | Scraping failure → clear, seamless Paste JD path (non-negotiable). |

## Domain-Specific Requirements

Rules for ATS keyword extraction and data-to-Canva mapping so content and layout stay aligned and Perfect Spacing is maintained.

### ATS Keyword Extraction Rules

- **Source:** Keywords are derived from the **job description (JD) only** (single JD per run for MVP). No cross-JD or external taxonomy in MVP.
- **Extraction:** The system extracts and ranks terms that typically drive ATS matching: role titles, required/preferred skills, tools, certifications, and domain phrases. Prioritize exact phrases from the JD over synonyms when both are valid.
- **Mapping into content:** Extracted keywords must be **naturally woven** into the resume narrative (summary, experience bullets, skills) so the document reads well to humans and still scores for ATS. No keyword stuffing; placement must respect our formatting and length limits.
- **Output:** The redraft is produced as structured content (e.g. JSON/Markdown) with sections and fields that both the **PDF formatting engine** and the **Canva mapping layer** consume, so one source of truth drives both outputs.

### Data-to-Canva Mapping (Perfect Spacing)

- **Single source of truth:** The same structured resume (JSON/Markdown) that feeds the PDF engine is the **only** input to the Canva export. No separate copy-paste or re-keying; mapping is deterministic from our schema to the chosen Canva template's placeholders.
- **Template contract:** For each supported Canva template we define a **mapping spec**: which of our fields (e.g. `headline`, `summary`, `experience[].title`, `experience[].bullets[]`, `skills`) map to which Canva text elements (by element ID or stable name in the template).
- **Length and overflow:** To preserve **Perfect Spacing** in Canva (no overflow, no awkward wraps):
  - Each mapped field has **max character or line limits** defined per template (e.g. headline 80 chars, summary 400 chars, each bullet 120 chars).
  - The system **truncates or summarizes** content that exceeds those limits (e.g. trim with ellipsis, or collapse extra bullets into "Key points: …") so the Canva layout never breaks. Rules are explicit and consistent so output is predictable.
- **Formatting parity:** Where the PDF uses strict layout rules (e.g. LaTeX-style spacing or print CSS), the Canva mapping respects equivalent constraints (line count, paragraph length) so the **same content** looks "human-crafted" in both PDF and Canva, with no manual reformatting after export.

### Technical Constraints (light)

- **Resume/JD data:** Processed in memory or short-lived storage; no long-term retention required for MVP. User data (JD + generated resume) is not shared beyond the PDF/Canva export paths they choose.
- **Canva API:** Use only official Canva API capabilities for populating template text. Adhere to Canva's usage and branding policies for API-driven design.

## Innovation & Novel Patterns

### Detected Innovation Areas

**Novel pattern: Separate AI content generation from strict layout enforcement**

- **Core idea:** The product treats **content** and **layout** as separate concerns. The AI layer is responsible only for *what* is said (JD→resume, ATS keyword mapping, narrative). A dedicated **formatting/layout engine** is responsible for *how* it looks (spacing, line breaks, widows/orphans, print/media rules). The two are connected by a single structured source of truth (e.g. JSON/Markdown); the layout engine never "edits" content, only constrains how it is displayed.
- **Why it matters:** Usually, AI-generated or pasted content is poured into a template and the user then fixes overflow, wraps, and bad breaks—especially on mobile. Here, **human-grade formatting on mobile without manual tweaks** is a product requirement. The layout engine applies strict rules (e.g. LaTeX-style spacing or CSS print-media queries) so that the same content always renders in a "human-crafted" way on small screens and in PDF/Canva. This separation is the main innovation and the core reason for building the product.
- **Concrete expression:** "Perfect Spacing" and the data-to-Canva mapping (length limits, truncation rules) are the layout-enforcement layer. The AI redraft and ATS extraction are the content layer. One pipeline, two clear responsibilities; the user never has to fix widows, orphans, or white space.

### Market Context & Competitive Landscape

- Most resume tools either focus on **content** (AI writing, ATS tips) or **design** (templates, Canva). When both exist, the user often has to manually fix layout after the AI writes. Resume-Builder-V1 enforces layout by design so that **human-grade formatting on mobile without manual tweaks** is the default, not an afterthought. The differentiator is the explicit separation of content and layout and the guarantee that the layout layer always wins.

### Validation Approach

- **User success:** User gets a job notification on iOS, pastes JD or URL, and receives a perfectly formatted PDF in the mobile browser in under 3 minutes with no manual layout fixes. If that holds consistently, the innovation is validated for the primary workflow.
- **Technical success:** Same structured content drives both PDF and Canva; the layout engine (and Canva mapping rules) produce output that meets the "human-crafted" bar. Validation = no manual reformatting after export and no user-reported "broken" or "ugly" layout on mobile.

### Risk Mitigation

- **Content overflow:** Domain rules (e.g. max chars per field, truncation/summarization) keep content within layout limits so the layout engine never has to handle arbitrary length; overflow is handled in the content/schema layer.
- **Layout engine failures:** Layout logic is deterministic and testable (fixed templates, known constraints). If a layout bug appears, fallback is to constrain or shorten input further rather than asking the user to fix the document manually.
- **Canva API / template changes:** Mapping spec and length limits are defined per template; if Canva changes a template, we update the mapping and limits rather than allowing unconstrained content to break "Perfect Spacing."

## CLI + Web Specific Requirements

### Project-Type Overview

Dual interface optimized for an iOS, high-speed factory workflow: **CLI** for the core engine and batch/automation; **Web (SPA)** for the primary "notification → resume" path on mobile. Both use the same content pipeline (JD → AI redraft → structured output) and the same layout engine; only the entry point and UX differ. The shared core ensures the resume looks **human-grade** regardless of which device is used to apply.

### Technical Architecture Considerations

- **Shared core:** One pipeline: JD ingestion (paste or URL) → AI redraft (ATS + narrative) → structured output (JSON/Markdown) → PDF generation + Canva mapping. CLI and Web are two front-ends to this pipeline; no duplicate layout or content logic.
- **Config:** `.env` for secrets (Anthropic, Canva API keys); `config.json` for template preferences and Canva template IDs. Both CLI and Web (or their backend) read from the same config where applicable so behavior stays consistent.
- **Performance:** End-to-end "paste → PDF/Canva" targets **under 3 minutes (180s)** to allow high-reasoning AI for deep JD analysis and ATS optimization. Web must reach **TTI ≤ 2s** on a mobile 5G connection so the user isn't staring at a blank screen while the AI thinks.

### CLI-Specific Requirements

| Area | Requirement |
|------|-------------|
| **Interactive vs scriptable** | Support both. Interactive prompts for quick mobile-terminal runs; non-interactive flags (e.g. `--jd-text "..."`) for batch processing. |
| **Output formats** | PDF (primary), Canva export (primary), Markdown/JSON for internal debugging and piping. |
| **Config method** | `.env` for API keys (Anthropic, Canva); local `config.json` for template preferences and Canva template IDs. |
| **Shell completion** | Not required for MVP; planned for later. |

### Web-Specific Requirements

| Area | Requirement |
|------|-------------|
| **SPA vs MPA** | SPA (Single-Page App) for the fastest "iOS notification → resume" experience; no full page reloads. |
| **Browser / devices** | Primary: iOS Safari (mobile-first). Desktop secondary. |
| **Performance** | End-to-end target **under 3 minutes** for the full loop (paste → PDF/Canva) to allow high-reasoning AI. UI must be interactive: **TTI ≤ 2 seconds** on a mobile 5G connection. |
| **Accessibility** | Minimum bar: high contrast and large touch targets for on-the-fly use on iPhone. |

### Implementation Considerations

- CLI and Web must share the same **layout engine** and **content schema** so PDF and Canva output are identical in quality and "Perfect Spacing" is guaranteed in both interfaces.
- Config (`config.json`) should be shared where possible (e.g. template IDs, defaults) or clearly split (CLI-only vs Web-only) to avoid drift and duplicate configuration.
- Web stack and hosting should be chosen to support fast cold start and low latency on mobile (e.g. edge or low-latency regions) to meet the 2s TTI target.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

- **MVP type:** **Experience MVP** — the minimum that delivers the core experience: paste JD (or URL with Paste fallback) → human-grade PDF in under 3 minutes on mobile, with optional Canva export. If that experience isn't reliable, the product doesn't justify use. *The product only exists if it can consistently deliver that human-grade PDF on the user's phone while they're on the go.*
- **Resource assumption:** Buildable by a small team or solo developer with the shared core (content + layout) implemented first; CLI and Web are two front-ends. No minimum team size specified; scale to fit.

### MVP Feature Set (Phase 1)

**Core journeys supported:** Jordan (Web: paste or URL → PDF in under 3 min; URL blocked → Paste JD fallback); Sam (CLI: JD file or URL → PDF + Canva from shared pipeline, interactive and non-interactive).

**Must-have capabilities:**

- iOS-friendly SPA: JD input (paste + URL with scraping), with **Paste JD** as fallback when URL is blocked.
- JD → ATS-optimized Markdown/structured content (single JD per run).
- **One** resume template with **Perfect Spacing** (strict layout rules; no widows/orphans).
- Local PDF generation from the same source.
- **One** Canva template with defined mapping and length limits (accurate placement, no manual reformatting).
- Shared core: one content pipeline + one layout engine used by both CLI and Web.
- Config: `.env` for API keys; `config.json` for template/Canva IDs.
- Performance: end-to-end under 3 minutes; Web TTI ≤2s on mobile 5G.

**Explicitly out of MVP:** Shell completion, multiple Canva templates, enhanced ATS scoring, full browser/LinkedIn automation.

### Post-MVP Features

**Phase 2 (Growth):** Multiple Canva templates; enhanced ATS keyword scoring; richer Web UI for JD paste and workflow; optional shell completion for CLI.

**Phase 3 (Vision):** Full browser automation (e.g. paste LinkedIn JD URL → one click → PDF + Canva ready).

### Risk Mitigation Strategy

| Risk area | Mitigation |
|-----------|------------|
| **Technical** | Layout engine is deterministic and testable (fixed template, known constraints). Canva: one template + explicit mapping and limits; if API or template changes, update mapping only. Scraping failure is handled by Paste JD, not by making every URL work. |
| **Market** | Validate by using it as the only way to apply; track interview callback rate. MVP is the fastest path to that learning. |
| **Resource** | MVP is scoped to one template, one Canva design, single JD per run. If resources shrink, ship Web + shared core first and defer CLI or Canva to a later phase. |

## Functional Requirements

### JD Input & Ingestion

- **FR1:** User can paste job description text into the system (Web).
- **FR2:** User can submit a job description URL for the system to attempt to fetch (Web).
- **FR3:** When URL fetch is blocked or fails, the system can fall back to paste-based input so the user can still complete the flow (Web).
- **FR4:** User can supply job description to the system via CLI (e.g. file path, inline text, or URL).
- **FR5:** User can supply existing structured resume content (JSON or Markdown) as input for PDF and/or Canva export without re-running AI redraft.

### Content Generation (AI)

- **FR6:** System can generate ATS-optimized resume content from a single job description.
- **FR7:** System can extract and prioritize keywords from the job description for ATS matching.
- **FR8:** System can weave extracted keywords into the resume narrative so it reads naturally and supports ATS matching within layout limits.
- **FR9:** System can produce structured resume output (e.g. JSON/Markdown) that serves as the single source for layout and export.

### Layout & Formatting

- **FR10:** System can apply strict layout rules so PDF output has no widows, orphans, or awkward white space.
- **FR11:** System can render one high-impact resume template with consistent, human-crafted appearance.
- **FR12:** System can enforce content length limits so layout does not overflow or break (e.g. truncation/summarization rules). The system must enforce character count limits per section based on the target Canva/PDF template to ensure layout integrity.

### PDF Generation

- **FR13:** System can generate a local PDF from the structured resume content. The generated PDF must use standard searchable text (no flattening) to ensure 100% ATS readability.
- **FR14:** User can obtain the generated PDF (Web: download; CLI: file output).

### Canva Export

- **FR15:** System can populate one Canva resume template with resume content via the Canva API.
- **FR16:** System can map structured resume fields to Canva template elements within defined length limits so layout stays intact. The system must enforce character count limits per section based on the target Canva/PDF template to ensure layout integrity.
- **FR17:** User can export the same resume content to Canva from Web and/or CLI (as configured).

### Web Experience

- **FR18:** User can complete the JD-to-PDF flow (paste or URL → PDF) without full page reloads (SPA).
- **FR19:** User can use the Web flow on iOS Safari with a mobile-friendly experience.
- **FR20:** User can download the generated PDF from the Web interface.

### CLI Experience

- **FR21:** User can run the resume pipeline interactively via CLI (e.g. prompts for JD input).
- **FR22:** User can run the resume pipeline non-interactively via CLI (e.g. flags for JD text, file, or URL).
- **FR23:** User can produce PDF output from the CLI.
- **FR24:** User can trigger Canva export from the CLI when configured.
- **FR25:** User can obtain Markdown or JSON output from the CLI for debugging or piping.

### Configuration

- **FR26:** User can configure API keys (e.g. Anthropic, Canva) without hardcoding (e.g. via environment or .env).
- **FR27:** User can configure template preferences and Canva template ID (e.g. via config file).

### Shared Core

- **FR28:** System uses a single content pipeline and layout engine for both Web and CLI so output quality and layout are consistent across interfaces.

## Non-Functional Requirements

### Performance

- **NFR-P1:** The end-to-end flow (JD submission to PDF available) must target **under 3 minutes (180 seconds)** to allow the AI to use a high-reasoning model for deep JD analysis and ATS optimization. The Web UI must still be interactive (TTI) within **≤ 2 seconds** so the user isn't staring at a blank screen while the AI thinks.
- **NFR-P2:** Web UI must become interactive (TTI) within **≤ 2 seconds** on a mobile 5G connection.
- **NFR-P3:** When URL fetch fails and the user switches to Paste JD, the same **under 3 minutes** end-to-end target applies from paste to PDF.

### Accessibility

- **NFR-A1:** Web UI must provide **high contrast** between text and background for on-the-fly use in varied lighting.
- **NFR-A2:** Touch targets (buttons, links, inputs) must be **large enough for reliable use on iPhone** (e.g. minimum 44pt touch area).

### Security

- **NFR-S1:** API keys (e.g. Anthropic, Canva) must be configurable **outside the codebase** (e.g. environment or .env) and must not appear in logs or client-side assets.
- **NFR-S2:** Resume and JD content may be processed in memory or short-lived storage; there is **no requirement for long-term retention** in MVP. Data must not be shared beyond the PDF/Canva export paths the user chooses.

### Integration

- **NFR-I1:** Canva API calls must handle **timeouts and errors** so that a Canva failure does not block PDF generation; user can still receive the PDF when Canva is unavailable.
- **NFR-I2:** When JD is supplied via URL, the system must **gracefully degrade** to Paste JD when fetch fails (blocked, timeout, or error) so the user can always complete the flow.
