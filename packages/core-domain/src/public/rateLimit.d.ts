export type RateLimitedCredentials = {
  allRateLimited: true;
  retryAfter?: string | number | Date | null;
  retryAfterHuman?: string;
};
export declare function isAllRateLimitedCredentials(value: unknown): value is RateLimitedCredentials;
export declare function rateLimitedProviderResponse(provider: string, credentials: RateLimitedCredentials): Response;
