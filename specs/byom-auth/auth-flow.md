# Credential Strategy

**Revised:** 2026-03-09
**Status:** Active — replaces previous BYOM spec

---

## Strategy Decision

This is a **personal tool** (single user: Chris Taylor). The previous BYOM (Bring
Your Own Model) design assumed multi-user SaaS with per-user credential injection.
That added UI friction (token extraction via DevTools) that is incompatible with the
primary use case: submitting job applications **on-the-fly on an iPhone**.

**Decision:** The backend owns the Anthropic API key via environment variable.
No credential UI is needed. No session tokens. No per-request auth headers.

---

## Anthropic Credentials

```
ANTHROPIC_API_KEY=sk-ant-...   ← in apps/api/.env (gitignored)
                                  or in hosting platform env vars
```

- The API server reads `process.env.ANTHROPIC_API_KEY` at startup.
- `redraftResume` receives the key directly (no CredentialProvider abstraction needed).
- All resume pipeline requests from the Web or CLI use this single key.
- Cost estimate: ~$0.02 per resume redraft with `claude-sonnet-4-6`. Personal use
  (a few applications per week) costs < $3/year.

### Model

**`claude-sonnet-4-6`** — best balance of instruction-following precision, professional
writing quality, and structured JSON output reliability for this task. Do not use Haiku
for redraft; quality is insufficient for ATS-calibrated resume writing.

---

## Canva Credentials

Canva OAuth 2.0 (Authorization Code) is unchanged — this is still needed because
Canva requires user-level OAuth for personal account access.

```
CANVA_CLIENT_ID=...            ← apps/api/.env
CANVA_CLIENT_SECRET=...        ← apps/api/.env
CANVA_TEMPLATE_ID=...          ← apps/api/.env
```

OAuth flow: User clicks "Connect Canva" → OAuth redirect → tokens stored in
server-side session → used for Canva API calls for that session.

See existing `apps/api/src/canva-oauth.ts` — no changes needed.

---

## What Was Removed

The following are no longer part of the architecture:

| Removed | Reason |
|---------|--------|
| `X-Anthropic-Session-Token` header | Not needed — backend owns the key |
| `CredentialProvider` interface | Over-engineering for single-user personal tool |
| `createRequestScopedCredentialProvider` | No longer used |
| Claude Pro session token UI in Settings | Too complex for mobile; API cost is negligible |
| "Paste & Save token" flow | Removed — no token to paste |
| Per-request credential resolution order | Single source: `process.env.ANTHROPIC_API_KEY` |

---

## API Error States

| Condition | Code | Handling |
|-----------|------|----------|
| `ANTHROPIC_API_KEY` not set | `MISSING_ANTHROPIC_KEY` | API returns 500 with clear message; check server env |
| Anthropic returns 401 | `INVALID_ANTHROPIC_KEY` | API returns 500; check key validity |
| Anthropic returns 429 | `ANTHROPIC_RATE_LIMITED` | API returns 503; retry |
| Canva OAuth cancelled | `CANVA_OAUTH_CANCELLED` | PipelineWarning; PDF still delivered |
| Canva token refresh failed | `CANVA_TOKEN_REFRESH_FAILED` | PipelineWarning; PDF still delivered |

**Canva failures never block PDF delivery** — existing pipeline isolation rule unchanged.

---

## Settings UI (Simplified)

The Settings section now contains only:
1. **Target Market toggle** (US / AU) — sets phone number for identity pillars
2. **Canva connection** — OAuth connect/disconnect

The "Claude Pro token" section is removed entirely.

---

## Security Invariants

- `ANTHROPIC_API_KEY` is never logged, never in client-side assets, never in API responses.
- Canva OAuth tokens stored in server-side session only; never sent to client.
- All sensitive keys in `.env` (gitignored) or hosting platform environment.
- HTTPS required in production for all API communication.
