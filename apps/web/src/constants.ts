/**
 * Storage keys and profile constants for web app.
 */

export const STORAGE_KEYS = {
  /** Target market: 'US' | 'AU'. Used to set contact.phone before redraft. */
  TARGET_MARKET: 'resume_builder_target_market',
} as const;

export type TargetMarket = 'US' | 'AU';

export const PHONE_BY_MARKET: Record<TargetMarket, string> = {
  US: '424-388-9521',
  AU: '0403 905 751',
};

export const DEFAULT_TARGET_MARKET: TargetMarket = 'US';

/** Base URL for the API server (Canva OAuth, pipeline). Set VITE_API_URL in .env (e.g. http://localhost:3001). */
export function getApiBaseUrl(): string {
  return (typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL) || '';
}
