# Use Claude Pro (No Extra Cost)

Use your Claude Pro subscription for resume redrafting without paying for API usage.

## Why

The Resume Builder can call Anthropic's API with an API key (pay-per-use) or use your **Claude Pro session token** so requests count against your subscription instead. Pasting a session token lets you avoid extra API cost.

## How

1. **Get your session token** from the Claude web app:
   - Open [claude.ai](https://claude.ai) and sign in.
   - Open your browser’s Developer Tools (F12 or right‑click → Inspect).
   - Go to **Application** (Chrome) or **Storage** (Firefox) → **Local Storage** (or **Cookies**).
   - Find the cookie or storage key that holds your session (e.g. a session or auth token). Copy its value.
   - *Exact key names may change; look for session-related names. Do not share this value or include it in screenshots.*

2. **Paste the token in Settings** in the Resume Builder web app (section “Use Claude Pro (no extra cost)”).

3. The app stores the token **only in your browser** (e.g. `localStorage`). It is sent to the backend **per request** when you run the pipeline and is **never logged or stored on the server**.

## Security

- The token stays in your browser; the backend uses it only for that request (Path C in [BYOM auth flow](../specs/byom-auth/auth-flow.md)).
- It is never written to server logs, error messages, or long-term storage.
- Use HTTPS in production so the token is not sent over plain HTTP.

## If you don’t use a token

You can instead add an **Anthropic API key** (from [console.anthropic.com](https://console.anthropic.com)) in Settings or in the backend environment. The app will use that for redrafting; usage is billed to your API account.
