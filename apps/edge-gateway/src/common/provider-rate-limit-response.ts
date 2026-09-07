import { HTTP_STATUS } from "@orbit/contracts/http-status";
import { unavailableResponse } from "@orbit/utils/errors/error-response";
import type { RateLimitedCredentials } from "@orbit/inference/services/credential-selection";

/** Translate an exhausted credential pool into the edge gateway's HTTP response. */
export function rateLimitedProviderResponse(
  provider: string,
  credentials: RateLimitedCredentials,
): Response {
  return unavailableResponse(
    HTTP_STATUS.RATE_LIMITED,
    `[${provider}] All accounts rate limited`,
    credentials.retryAfter,
    credentials.retryAfterHuman,
  );
}
