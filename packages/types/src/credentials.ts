export interface CanvaCredentials {
  /** Path A: service-to-service API key */
  apiKey?: string;
  clientId: string;
  /** Path B: OAuth access token */
  accessToken?: string;
  /** Path B: OAuth refresh token (server-side only) */
  refreshToken?: string;
}
