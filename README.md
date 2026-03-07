# Project Template (BMAD + Ralph)

This repo was bootstrapped by the AI Software Factory template.

What’s inside:
- `_bmad/` and `_bmad-output/` (BMAD Method files)
- `specs/` (Ralph spec-driven features)
- `.ralph/` (Ralph agent state + tasks)
- `scripts/verify.sh` (quality gate)
- `ralph.*.yml` (loop configs)

Start in Cursor:
- `/bmad-help`

Then:
- create PRD
- create architecture
- create epics/stories
- sprint planning
- create one story
- convert story to spec
- run Ralph

## Run redraft

From the repo root, run the AI redraft orchestrator with a job description URL (e.g. Varonis Sydney):

```bash
pnpm run redraft -- --jd "https://au.indeed.com/viewjob?jk=920838c1687672ac"
```

or with npm:

```bash
npm run redraft -- --jd "https://au.indeed.com/viewjob?jk=920838c1687672ac"
```

- **Mobile fallback (FR3):** If the URL fetch fails (e.g. LinkedIn/Indeed blocks), the logic triggers the “Paste JD” fallback; the CLI exits with a clear message so you can paste the JD instead.
- **Sydney compliance:** When the redraft/orchestrator is implemented, it will inject the Australian Citizen / Fair Work compliance statement for local enterprise filters.
- **Heatmap scoring:** It will weave “Data Defense,” “Security Ecosystems,” and “C-suite Stakeholders” into experience bullets (when that logic is implemented in redraft).
