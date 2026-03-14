# Canva OAuth and token setup (archived)

**Archived:** PDF-only MVP; Canva is out of scope. This doc is kept for reference only.

---

# Canva OAuth and token setup

This doc describes how to obtain and use a Canva access token for the resume-builder pipeline (web app and CLI). Use the OAuth flow so the token is correctly scoped for the Canva Connect API and maps to your Canva identity.

## 1. Start the engine

Run both servers so the OAuth callback has a place to land:

- **Terminal 1 (API):** `pnpm --filter api dev` (port 3001)
- **Terminal 2 (Web):** `pnpm --filter web dev` (port 5173)

## 2. Trigger the "Connect Canva" flow

1. Open **http://localhost:5173** in your browser.
2. Go to **Settings** (or the Pipeline section) and click **Connect Canva**.
3. Complete the Canva authorization (log in and click **Allow**).

## 3. Capture the token

After redirect back to the PWA, the token is in the API session. To use it in `.env` for CLI/scripted runs:

- **API terminal:** The server logs: `[Canva Auth] Success! Access Token: <LONG_STRING>` — copy the token value.
- **Alternatively:** DevTools → Network → find the callback or session response from `localhost:3001` and inspect the token there.

## 4. Lock it into `.env`

Add or update the token in `apps/api/.env`:

```bash
# In your project root (WSL or local)
# Replace your_actual_token_here with the string from step 3
sed -i 's/CANVA_ACCESS_TOKEN=.*/CANVA_ACCESS_TOKEN=your_actual_token_here/' apps/api/.env
```

Or edit `apps/api/.env` and set:

```env
CANVA_ACCESS_TOKEN=<paste the token here>
```

- **Web app:** Pipeline runs use the session first; if no session, the API falls back to `CANVA_ACCESS_TOKEN` from env.
- **CLI:** `pnpm run redraft --jd <path> --export canva` loads `apps/api/.env` and uses `CANVA_ACCESS_TOKEN` for Canva export.

## Token refresh

- **Session path:** If you use "Connect Canva" in the browser, the API refreshes the access token automatically when it's near expiry (using the stored refresh token).
- **Env path:** Tokens in `.env` do not auto-refresh. When the token expires, run the OAuth flow again (steps 1–4) to get a new token and update `CANVA_ACCESS_TOKEN`.

Always use this OAuth flow to obtain or refresh the token; do not use manual API keys. That keeps the token correctly scoped and tied to your Canva identity.
