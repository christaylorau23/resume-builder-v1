/**
 * Identity pillars for resume redraft: name, email, phone.
 * Locked in core so the LLM never hallucinates these; system prompt must use them verbatim.
 * See architecture "Identity Injection" and PRD "Prompt Constraints".
 */
export interface IdentityPillars {
  /** Full name — static default in core (e.g. Chris Taylor). */
  name: string;
  /** Email — static default in core (e.g. christaylorau23@gmail.com). */
  email: string;
  /** Phone — from Target Market toggle: US (424-388-9521) or AU (0403 905 751). */
  phone: string;
}

/** Input for resolving identity: phone or target market. Name and email are never overridden. */
export interface IdentityProfileInput {
  /** Explicit phone; if omitted, derived from targetMarket. */
  phone?: string;
  /** US → 424-388-9521, AU → 0403 905 751. Default US if neither provided. */
  targetMarket?: 'US' | 'AU';
}
