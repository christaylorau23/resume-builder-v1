# Scratchpad

## 2026-03-07 — Phase 2 BYOM Pivot

### Objective
Pivot architecture to Bring Your Own Model (BYOM). Document auth flows for:
1. Personal subscription path (Claude.ai Pro, Canva Pro via OAuth)
2. API key path (ANTHROPIC_API_KEY, Canva Connect API key)

### Current State
- Phase 1 MVP: system operator provides API keys in .env (ANTHROPIC_API_KEY, Canva API)
- AI redraft: placeholder in packages/core/src/ai/redraft.ts (not yet wired to Anthropic SDK)
- Pipeline: runPipeline is placeholder; layout-prep wiring incomplete (task-1772918021-8399 exists)

### BYOM Design
Phase 2 shifts from operator-owned credentials to user-owned credentials. Two auth paths:

**Path A — API Key** (developer/power-user persona "Sam"):
- User supplies ANTHROPIC_API_KEY (Anthropic console)
- User supplies Canva Connect API credentials (client ID + API key)
- Config: env vars or .env file; never hardcoded
- Simpler to implement, no OAuth dance

**Path B — Personal Subscription** (mobile-first persona "Jordan"):
- User has Claude Pro subscription → Anthropic doesn't expose OAuth for personal accounts yet
  → Likely means: user still gets API key from console.anthropic.com (same as Path A)
  → OR: future Claude.ai OAuth flow (post-MVP placeholder)
- User has Canva Pro → authenticates via Canva OAuth 2.0 (Authorization Code flow)
  → Web UI initiates OAuth, stores token per-user session

### Auth Flow Details

**Anthropic (both paths use API key for now):**
- Personal subscription doesn't unlock a separate OAuth endpoint at present
- Distinguish by: basic API key (pay-as-you-go) vs API key from a Pro account (same mechanism, different billing)
- Future: Claude.ai SSO/OAuth could enable "use your subscription" natively

**Canva OAuth (personal subscription):**
1. User clicks "Connect Canva" in Web UI
2. Redirect to Canva OAuth endpoint with client_id, scope (design:content:write), redirect_uri
3. User authorizes → Canva redirects back with authorization code
4. Backend exchanges code for access_token + refresh_token
5. Token stored in short-lived server session (no long-term DB for MVP)
6. API calls use Bearer token

**Canva API Key (developer path):**
- User registers Canva Connect app → gets client_id + API key
- Provided via CANVA_CLIENT_ID + CANVA_API_KEY env vars
- Used for service-to-service calls

### Plan
1. Create specs/byom-auth/ directory with auth-flow.md
2. Update architecture.md to add BYOM section
3. (Future tasks) Wire credentials into redraft.ts and canva client
