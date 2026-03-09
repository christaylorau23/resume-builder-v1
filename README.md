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

## Credentials and integrations

### Use Claude Pro (no extra cost)

To use your Claude Pro subscription instead of paying for API usage, paste a Claude session token in the web app **Settings** under "Use Claude Pro (no extra cost)." The token is stored only in your browser and sent per request; it is never logged or stored on the server. See [docs/claude-pro-token.md](docs/claude-pro-token.md) for how to get the token and security details.

### Connect Canva

The Canva API is free for this integration. To export resumes to Canva:

1. Create a [Canva Connect](https://www.canva.dev/docs/connect/) app in the Canva Developer Portal and note your Client ID and Client Secret.
2. Set `CANVA_CLIENT_ID` and `CANVA_CLIENT_SECRET` in `.env` (see [.env.example](.env.example)). Configure the redirect URI in the Canva app to match your API server (e.g. `http://localhost:3001/auth/canva/callback`).
3. Run the API server (`pnpm --filter api dev`) and the web app (`pnpm --filter web dev`). Set `VITE_API_URL=http://localhost:3001` for the web app so it can reach the API.
4. In the web app **Settings**, click **Connect Canva** to sign in with your Canva account. After connecting, pipeline runs can export a design to your Canva account.
