import { HTTP_STATUS } from "@shiguang-gateway/contracts/http-status";
import { unavailableResponse } from "@shiguang-gateway/http-kernel/error-response";
import type { RateLimitedCredentials } from "@shiguang-gateway/open-sse/services/credential-selection";

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
