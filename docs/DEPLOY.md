# Deploy API and Web (Vercel)

Follow these steps in order. All work is done in the Vercel dashboard (and your API host if different).

## 1. Deploy API

Deploy the API to any Node host (e.g. Vercel serverless, a VPS, or another provider). From the repo root:

- **Build:** `pnpm --filter api build`
- **Start:** `node apps/api/dist/index.js` (or `pnpm --filter api start`)
- **Root:** Use the monorepo root so `pnpm-workspace.yaml` and workspace dependencies resolve.

Set these **environment variables** on your API service:

- `ANTHROPIC_API_KEY` = your Anthropic API key
- `FIRECRAWL_API_KEY` = your Firecrawl key (optional; only for Job URL scrape)
- `FRONTEND_ORIGIN` = `https://PLACEHOLDER` (replace after step 2 with your web app origin)
- `PUPPETEER_SKIP_DOWNLOAD` = `true`
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` = `true`

Deploy and note the **public API URL** (e.g. `https://your-api.example.com`).

**Docker:** You can use the repo’s root `Dockerfile` to build and run the API in a container.

## 2. Deploy Web on Vercel

1. Go to [Vercel](https://vercel.com) → **Add New → Project** → **Import** your GitHub repo and branch.
2. Vercel uses `vercel.json`: `pnpm --filter web build`, output `apps/web/dist`.
3. In **Environment Variables**, set:
   - `VITE_API_URL` = your **API URL** from step 1 (e.g. `https://your-api.example.com`)
4. Deploy. Copy the **Vercel URL** (e.g. `https://resume-builder-xxx.vercel.app`).

## 3. Point API at the frontend (CORS)

1. On your **API host** → **Variables** (or **Environment**).
2. Set `FRONTEND_ORIGIN` = the **Vercel URL** from step 2 (exact origin, e.g. `https://resume-builder-xxx.vercel.app`). To allow multiple URLs (e.g. production and preview), use a comma-separated list or set `FRONTEND_ORIGIN_PREVIEW` to the preview URL.
3. Save and redeploy the API if needed. The web app can then call the API without CORS errors.

## 4. Verify

Open the **Vercel URL** in a browser and run the pipeline (paste JD or use Job URL). If it completes and you can download the PDF, the round-trip is working.

## 5. Optional: iPhone home screen

On your iPhone: open the **Vercel URL** in Safari → Share → **Add to Home Screen**.
