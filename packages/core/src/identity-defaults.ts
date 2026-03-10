/**
 * Identity pillars: static defaults and phone-by-market for redraft prompt injection.
 * These values are locked so the LLM never hallucinates name or email; system instructions
 * must use them verbatim. See architecture "Identity Injection" and PRD "Prompt Constraints".
 */
import type { IdentityPillars, IdentityProfileInput } from '@repo/types';

/** Static default name — never overridden by input. */
export const DEFAULT_IDENTITY_NAME = 'Chris Taylor';

/** Static default email — never overridden by input. */
export const DEFAULT_IDENTITY_EMAIL = 'christaylorau23@gmail.com';

/** Phone by target market (US/AU). */
export const PHONE_BY_MARKET: Record<'US' | 'AU', string> = {
  US: '424-388-9521',
  AU: '0403 905 751',
};

const DEFAULT_TARGET_MARKET: 'US' | 'AU' = 'US';

/**
 * Resolves full IdentityPillars for the redraft prompt. Name and email are always
 * the static defaults; phone comes from profile.phone or profile.targetMarket.
 */
export function resolveIdentityPillars(profile?: IdentityProfileInput | null): IdentityPillars {
  const market = profile?.targetMarket ?? DEFAULT_TARGET_MARKET;
  const phone = profile?.phone?.trim() || PHONE_BY_MARKET[market];
  return {
    name: DEFAULT_IDENTITY_NAME,
    email: DEFAULT_IDENTITY_EMAIL,
    phone,
  };
}
