# Deploy API (Railway) and Web (Vercel)

Follow these steps in order. All work is done in the Railway and Vercel dashboards.

## 1. Deploy API on Railway

1. Go to [Railway](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Select `christaylorau23/resume-builder-v1`, branch `feature/current-work` (or your target branch).
3. Create **one** service for the API (do not add a separate service for the web app; the web app goes on Vercel in step 2).
4. For the API service, ensure **Root Directory** is **empty** (repo root). In Railway: service → **Settings** → **Root Directory** → leave blank so the build runs from the monorepo root where `pnpm-workspace.yaml` and `railway.toml` live.
5. Railway uses `railway.toml` and `nixpacks.toml`: Node 20, pnpm, then `pnpm --filter api build` / `pnpm --filter api start`.
6. In the service **Variables** (or **Settings → Environment**), set:
   - `ANTHROPIC_API_KEY` = your Anthropic API key
   - `FIRECRAWL_API_KEY` = your Firecrawl key (optional; only for Job URL scrape)
   - `FRONTEND_ORIGIN` = `https://PLACEHOLDER` (you’ll replace this after step 2)
7. Deploy and wait until the service is up. Copy the **public URL** (e.g. `https://your-app.up.railway.app`) — this is your **Railway API URL**.

**If the build fails:** Check the build logs. Ensure Root Directory is not set to `apps/api` (it must be repo root). The repo includes `nixpacks.toml` so Nixpacks uses Node 20 and pnpm; if you see “pnpm: command not found”, the install phase may need to run from repo root.

## 2. Deploy Web on Vercel

1. Go to [Vercel](https://vercel.com) → **Add New → Project** → **Import** the same GitHub repo, branch `feature/current-work`.
2. Vercel uses `vercel.json`: `pnpm --filter web build`, output `apps/web/dist`.
3. In **Environment Variables**, set:
   - `VITE_API_URL` = the **Railway API URL** from step 1 (e.g. `https://your-app.up.railway.app`)
4. Deploy. Copy the **Vercel URL** (e.g. `https://resume-builder-xxx.vercel.app`).

## 3. Point API at the frontend (CORS)

1. Back in **Railway** → same service → **Variables**.
2. Set `FRONTEND_ORIGIN` = the **Vercel URL** from step 2 (exact origin, e.g. `https://resume-builder-xxx.vercel.app`).
3. Save; Railway will redeploy. The web app can then call the API without CORS errors.

## 4. Verify

Open the **Vercel URL** in a browser and run the pipeline (paste JD or use Job URL). If it completes and you can download the PDF, the round-trip is working.

## 5. Optional: iPhone home screen

On your iPhone: open the **Vercel URL** in Safari → Share → **Add to Home Screen**.
