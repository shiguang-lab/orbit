/**
 * Sentinel returned by provider credential selection when every eligible
 * account is temporarily unavailable because of a cooldown or quota window.
 */
export type RateLimitedCredentials = {
  allRateLimited: true;
  retryAfter?: string | number | Date | null;
  retryAfterHuman?: string;
  lastError?: string | null;
  lastErrorCode?: string | number | null;
  cooldownScope?: "model" | "connection";
  cooldownModel?: string | null;
  connectionsCount?: number;
};

export declare function isAllRateLimitedCredentials(
  value: unknown,
): value is RateLimitedCredentials;
