import { extractApiKey } from "@shiguang-gateway/core-domain/sse/auth";
import { getApiKeyMetadata } from "@shiguang-gateway/core-domain/edge/local-db";
import { isDashboardSessionAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";

export interface ApiKeyRequestScope {
  apiKey: string | null;
  apiKeyId: string | null;
  apiKeyMetadata: Awaited<ReturnType<typeof getApiKeyMetadata>>;
  rejection: Response | null;
  isSessionAuth: boolean;
}

/** Resolve the file API's optional key scope without coupling it to Nest. */
export async function getApiKeyRequestScope(request: Request): Promise<ApiKeyRequestScope> {
  const isSessionAuth = await isDashboardSessionAuthenticated(request);
  const apiKey = extractApiKey(request);
  if (!apiKey) {
    return { apiKey: null, apiKeyId: null, apiKeyMetadata: null, rejection: null, isSessionAuth };
  }

  const apiKeyMetadata = await getApiKeyMetadata(apiKey);
  return {
    apiKey,
    apiKeyId: apiKeyMetadata?.id || null,
    apiKeyMetadata,
    rejection: null,
    isSessionAuth,
  };
}
