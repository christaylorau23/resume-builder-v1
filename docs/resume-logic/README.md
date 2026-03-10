# Resume logic & ATS research

This folder holds research and reference docs that drive ATS-friendly resume logic in the pipeline.

## Expected files (add from your sources)

- **ultimate-guide-ats-2025.md** — "The Ultimate Guide to ATS Friendly Resume Templates 2025 From Parsing to Passed"
- **ats-optimize-research.md** — "please do a verbose research to find ats optimize" (verbose ATS optimization research)

When present, these are referenced in specs and in the AI redraft/extraction prompts so the logic follows parsing rules, section structure, and anti-stuffing guidance from the research.

## How the pipeline uses this

- **JD keyword extraction** (`packages/core/src/ai/extract-jd-keywords.ts`) extracts tiered keywords from the job description; rules align with PRD (exact phrases, required vs preferred, role titles, tools, certifications).
- **Redraft** (`packages/core/src/ai/redraft.ts`) receives the extracted keyword list and weaves them naturally; prompt rules also reflect `docs/ats-standards-2026.md` and, when available, concrete rules from the docs above.
