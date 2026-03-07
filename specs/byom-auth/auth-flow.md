# BYOM Auth Flow Specification

**Phase:** 2 — Bring Your Own Model (BYOM) Pivot
**Date:** 2026-03-07
**Status:** Approved for implementation

---

## Overview

Phase 2 shifts credential ownership from the system operator to the end user.
Instead of a shared backend API key, each user authenticates with their own
Anthropic and Canva credentials. Two auth paths are supported:

| Path | Persona | Anthropic | Canva |
|------|---------|-----------|-------|
| **API Key** | Power user / CLI (Sam) | API key from console.anthropic.com | Canva Connect API key |
| **Personal Subscription** | Mobile / Web (Jordan) | API key from console.anthropic.com | Canva OAuth 2.0 (Authorization Code) |

> **Note on Anthropic:** Anthropic does not currently expose an OAuth endpoint
> for personal Claude.ai subscriptions. Both paths use an API key. The
> distinction is billing model: pay-as-you-go (API key) vs. a Pro subscription
> seat whose API key is issued from the same console.

---

## Path A — API Key (Power User / CLI)

### Anthropic

```
User → console.anthropic.com → generates API key
     ↓
Provides key via:
  CLI:  ANTHROPIC_API_KEY=sk-ant-... in .env or shell env
  Web:  Settings page → "Enter API Key" field → stored in session-scoped server env
     ↓
packages/core/src/ai/redraft.ts reads process.env.ANTHROPIC_API_KEY at call time
```

**Security invariants:**
- Key is never logged or returned to the client.
- Key is never embedded in any build artifact.
- CLI: read from environment, sourced from `.env` (gitignored).
- Web: key is accepted once per session, stored server-side in encrypted session store; not persisted to DB for MVP.

### Canva

```
User → Canva Developer Portal → creates a Connect app → receives Client ID + API Key
     ↓
Provides via:
  CLI:  CANVA_CLIENT_ID + CANVA_API_KEY in .env
  Web:  Settings page → stored in session-scoped server env
     ↓
packages/core/src/rendering/canva/ uses credentials for service-to-service API calls
```

**Security invariants (same as Anthropic above).**

---

## Path B — Personal Subscription (Web / Mobile)

### Anthropic (same as Path A)

Personal Claude.ai subscriptions do not expose a separate OAuth endpoint.
Users obtain an API key from `console.anthropic.com` (even on Pro plans) and
provide it as in Path A.

Placeholder: if Anthropic releases an OAuth / "use your subscription" flow in
future, this spec should be updated and a new story created. No code changes
are needed now beyond the credential injection described in Path A.

### Canva OAuth 2.0 (Authorization Code Flow)

Jordan has a personal Canva account (free or Pro). She clicks **"Connect Canva"**
in the Web UI.

```
Sequence:

1. [Web UI] User clicks "Connect Canva"
        |
        v
2. [Backend] Build Canva OAuth URL
        scope:  design:content:write design:meta:read
        state:  CSRF token (server-generated, stored in session)
        redirect_uri: https://<app-host>/auth/canva/callback
        |
        v
3. [Browser] Redirect → https://www.canva.com/api/oauth/authorize?...
        |
        v
4. [Canva] User reviews permissions → clicks "Allow"
        |
        v
5. [Canva] Redirect → /auth/canva/callback?code=<auth_code>&state=<csrf>
        |
        v
6. [Backend] Validate CSRF state (reject if mismatch)
        POST https://api.canva.com/rest/v1/oauth/token
          grant_type=authorization_code
          code=<auth_code>
          client_id=<CANVA_CLIENT_ID>
          client_secret=<CANVA_CLIENT_SECRET>
          redirect_uri=<same as step 2>
        |
        v
7. [Canva] Returns { access_token, refresh_token, expires_in, token_type }
        |
        v
8. [Backend] Store tokens in server-side session (NOT client cookie body)
        |
        v
9. [Web UI] Show "Canva connected" confirmation; pipeline now has a token for
           this session

Token Refresh (if access_token expires during a pipeline run):
        POST https://api.canva.com/rest/v1/oauth/token
          grant_type=refresh_token
          refresh_token=<stored_refresh_token>
          client_id=<CANVA_CLIENT_ID>
          client_secret=<CANVA_CLIENT_SECRET>
```

**Security invariants:**
- `access_token` and `refresh_token` are stored ONLY in the server-side session; never sent to the client in a readable cookie or response body.
- CSRF state token is validated before any token exchange.
- `client_secret` is a server-side secret; never exposed to the browser.
- Token scope is minimal: `design:content:write design:meta:read` only.
- Session lifetime: tokens expire with the session (no long-term persistence for MVP). User re-authenticates on next session.
- HTTPS is required for redirect_uri in production.

---

## Credential Resolution Order

The pipeline resolves credentials in this priority order (highest to lowest):

```
1. Explicit per-request credential (passed programmatically in tests or CLI flags)
2. Web session store (Path B tokens, Path A key entered in UI)
3. Environment variable (ANTHROPIC_API_KEY, CANVA_API_KEY, CANVA_CLIENT_ID)
4. .env file (loaded at startup via dotenv; gitignored)
5. Error: MissingCredentialError (surfaces to user with setup instructions)
```

---

## CredentialProvider Interface (TypeScript)

```typescript
// packages/types/src/credentials.ts

export interface AnthropicCredentials {
  apiKey: string;
}

export interface CanvaCredentials {
  /** Path A: service-to-service API key */
  apiKey?: string;
  clientId: string;
  /** Path B: OAuth access token */
  accessToken?: string;
  /** Path B: OAuth refresh token (server-side only) */
  refreshToken?: string;
}

export interface CredentialProvider {
  getAnthropic(): Promise<AnthropicCredentials>;
  getCanva(): Promise<CanvaCredentials>;
}
```

Implementations:
- `EnvCredentialProvider` — reads from `process.env` (Path A, CLI)
- `SessionCredentialProvider` — reads from server session store (Path A/B, Web)
- `StaticCredentialProvider` — accepts explicit values (tests)

---

## Error States

| Condition | Error Code | User-facing message |
|-----------|-----------|---------------------|
| No Anthropic key provided | `MISSING_ANTHROPIC_KEY` | "Add your Anthropic API key in Settings to continue." |
| Anthropic key invalid (401) | `INVALID_ANTHROPIC_KEY` | "Anthropic API key rejected. Check your key in Settings." |
| Canva OAuth cancelled by user | `CANVA_OAUTH_CANCELLED` | "Canva connection cancelled. Connect Canva to enable export." |
| Canva token exchange failed | `CANVA_TOKEN_EXCHANGE_FAILED` | "Canva connection failed. Please try again." |
| Canva token expired, refresh failed | `CANVA_TOKEN_REFRESH_FAILED` | "Canva session expired. Reconnect Canva in Settings." |
| No Canva credentials (API key path) | `MISSING_CANVA_KEY` | "Add your Canva API key in Settings to enable export." |

Per the existing pipeline rule: **Canva failures MUST NOT block PDF delivery.**
All Canva error codes result in a `PipelineWarning` and the pipeline returns the
PDF with `warnings` populated; the Canva export is skipped for that run.

---

## Out of Scope for Phase 2

- Multi-user account system / database-persisted tokens
- Anthropic OAuth (not yet available)
- Canva token rotation beyond the session lifetime
- Canva API key rotation / revocation UX
- Rate limiting / quota enforcement per user (Phase 3)
