// HTTP orchestration for the edge rerank domain.
import { handleRerank } from "./provider-handler.js";
import { parseRerankModel } from "@shiguang-gateway/rerank-catalog";
import { errorResponse } from "@shiguang-gateway/open-sse/utils/error";
import { HTTP_STATUS } from "@shiguang-gateway/open-sse/config/constants";
import { CORS_HEADERS } from "@shiguang-gateway/contracts/cors";
import { isAllRateLimitedCredentials } from "@shiguang-gateway/open-sse/services/credential-selection";
import { rateLimitedProviderResponse } from "../common/provider-rate-limit-response.js";

const load = (specifier: string): Promise<any> => import(specifier as string);

type RerankRequestBody = {
  model: string;
  query: string;
  documents: Array<string | { text?: string }>;
  top_n?: number;
  return_documents?: boolean;
};

/**
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/**
 * Build dynamic rerank provider from a local provider_node.
 * Local OpenAI-compatible backends (oMLX, vLLM, etc.) expose /v1/rerank
 * under the same base URL as chat.
 */
function buildDynamicRerankProvider(node: any) {
  // Strip trailing /v1 if present — we'll add /rerank
  let base = node.baseUrl || "";
  if (base.endsWith("/v1")) base = base.slice(0, -3);
  return {
    id: node.prefix,
    baseUrl: `${base}/v1/rerank`,
    authType: "apikey",
    authHeader: "bearer",
    providerId: node.id, // full provider connection ID for credential lookup
  };
}

/**
 * POST /v1/rerank - Cohere-compatible rerank endpoint
 *
 * Supports cloud providers (Cohere, Together, NVIDIA, Fireworks)
 * and local provider_nodes (oMLX, vLLM, etc.) via dynamic routing.
 */
async function postHandler(request: Request, _context: unknown): Promise<Response> {
  const [
    { getProviderCredentialsWithQuotaPreflight, clearRecoveredProviderState },
    { enforceApiKeyPolicy },
    { v1RerankSchema },
    { isValidationFailure, validateBody },
    { getCachedProviderNodes },
    { saveCallLog },
    { attachShiguangGatewayMetaHeaders },
    { generateRequestId },
  ] = await Promise.all([
    load("@shiguang-gateway/open-sse/services/auth"),
    load("@shiguang-gateway/core-domain/runtime/api-key-policy"),
    load("@shiguang-gateway/core-domain/edge/rerank-validation-schemas"),
    load("@shiguang-gateway/core-domain/shared/validation/helpers"),
    load("@shiguang-gateway/core-domain/edge/rerank-provider-nodes"),
    load("@shiguang-gateway/core-domain/usage/call-logs"),
    load("@shiguang-gateway/core-domain/edge/gateway-response-meta"),
    load("@shiguang-gateway/core-domain/runtime/request-id"),
  ]);
  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Invalid JSON body");
  }

  const validation = validateBody(v1RerankSchema, rawBody);
  if (isValidationFailure(validation)) {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, validation.error.message);
  }
  const body = validation.data as RerankRequestBody;

  // Enforce API key policies (model restrictions + budget limits)
  const policy = await enforceApiKeyPolicy(request, body.model);
  if (policy.rejection) return policy.rejection;

  // Load local provider_nodes for rerank routing (localhost only)
  let localProviders: ReturnType<typeof buildDynamicRerankProvider>[] = [];
  try {
    const nodes = await getCachedProviderNodes();
    localProviders = (Array.isArray(nodes) ? nodes : [])
      .filter((n: any) => {
        try {
          const hostname = new URL(n.baseUrl).hostname;
          // Strictly matching 172.16.0.0/12 (Docker/local) and explicitly blocking ::1 per SSRF hardening
          return (
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
          );
        } catch {
          return false;
        }
      })
      .map((n) => {
        try {
          return buildDynamicRerankProvider(n);
        } catch {
          return null;
        }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  } catch {
    // Non-critical — continue with cloud providers only
  }

  // Try cloud registry first
  const { provider, model: modelId } = parseRerankModel(body.model);

  if (provider) {
    // Cloud provider matched
    const credentials = await getProviderCredentialsWithQuotaPreflight(provider);
    if (!credentials) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, `No credentials for provider: ${provider}`);
    }
    if (isAllRateLimitedCredentials(credentials)) {
      return rateLimitedProviderResponse(provider, credentials);
    }

    const response = await handleRerank({
      model: body.model,
      query: body.query,
      documents: body.documents,
      top_n: body.top_n,
      return_documents: body.return_documents,
      credentials,
      connectionId: (credentials as { connectionId?: string } | null)?.connectionId,
      apiKeyId: policy.apiKeyInfo?.id,
      apiKeyName: policy.apiKeyInfo?.name,
    } as any);
    if (response?.ok) {
      await clearRecoveredProviderState(credentials);
    }
    return response;
  }

  // Try local provider_nodes (model format: prefix/model-name)
  const parts = body.model.split("/");
  if (parts.length >= 2) {
    const prefix = parts[0];
    const localModel = parts.slice(1).join("/");
    const localProvider = localProviders.find((p) => p.id === prefix);

    if (localProvider) {
      const credentials = await getProviderCredentialsWithQuotaPreflight(localProvider.providerId);
      if (!credentials) {
        return errorResponse(
          HTTP_STATUS.BAD_REQUEST,
          `No credentials for local provider: ${prefix}`
        );
      }
      if (isAllRateLimitedCredentials(credentials)) {
        return rateLimitedProviderResponse(prefix, credentials);
      }

      const token = credentials?.apiKey || credentials?.accessToken;
      const startTime = Date.now();
      try {
        let res = await fetch(localProvider.baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            model: localModel,
            query: body.query,
            documents: body.documents,
            top_n: body.top_n || body.documents.length,
            return_documents: body.return_documents !== false,
          }),
        });

        // Some local providers (e.g. Infinity, TEI) mount at /rerank rather than /v1/rerank
        if (res.status === 404 && localProvider.baseUrl.endsWith("/v1/rerank")) {
          const fallbackUrl = localProvider.baseUrl.replace(/\/v1\/rerank$/, "/rerank");
          try {
            const fallbackRes = await fetch(fallbackUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                model: localModel,
                query: body.query,
                documents: body.documents,
                top_n: body.top_n || body.documents.length,
                return_documents: body.return_documents !== false,
              }),
            });
            if (fallbackRes.ok || fallbackRes.status !== 404) {
              res = fallbackRes;
            }
          } catch {
            // retain original 404 response if fallback fetch fails
          }
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errorMessage =
            errData.message || errData.detail || `Provider returned HTTP ${res.status}`;
          saveCallLog({
            method: "POST",
            path: "/v1/rerank",
            status: res.status,
            model: body.model,
            provider: prefix,
            connectionId:
              (credentials as { connectionId?: string } | null)?.connectionId || undefined,
            duration: Date.now() - startTime,
            requestBody: {
              model: body.model,
              query: body.query,
              documents: body.documents,
              top_n: body.top_n,
              return_documents: body.return_documents,
            },
            responseBody: errData,
            error: errorMessage,
            apiKeyId: policy.apiKeyInfo?.id || undefined,
            apiKeyName: policy.apiKeyInfo?.name || undefined,
          }).catch(() => {});
          return errorResponse(res.status, errorMessage);
        }

        const data = await res.json();
        const latencyMs = Date.now() - startTime;
        saveCallLog({
          method: "POST",
          path: "/v1/rerank",
          status: 200,
          model: body.model,
          provider: prefix,
          connectionId:
            (credentials as { connectionId?: string } | null)?.connectionId || undefined,
          duration: latencyMs,
          tokens: { prompt_tokens: 0, completion_tokens: 0 },
          requestBody: {
            model: body.model,
            query: body.query,
            documents: body.documents,
            top_n: body.top_n,
            return_documents: body.return_documents,
          },
          responseBody: data,
          apiKeyId: policy.apiKeyInfo?.id || undefined,
          apiKeyName: policy.apiKeyInfo?.name || undefined,
        }).catch(() => {});

        const headers = new Headers({ ...CORS_HEADERS, "Content-Type": "application/json" });
        attachShiguangGatewayMetaHeaders(headers, {
          provider: prefix,
          model: localModel,
          costUsd: 0,
          latencyMs,
          requestId: generateRequestId(),
        });
        return new Response(JSON.stringify(data), {
          status: 200,
          headers,
        });
      } catch (err: any) {
        saveCallLog({
          method: "POST",
          path: "/v1/rerank",
          status: 500,
          model: body.model,
          provider: prefix,
          connectionId:
            (credentials as { connectionId?: string } | null)?.connectionId || undefined,
          duration: Date.now() - startTime,
          error: err.message,
          apiKeyId: policy.apiKeyInfo?.id || undefined,
          apiKeyName: policy.apiKeyInfo?.name || undefined,
        }).catch(() => {});
        return errorResponse(500, `Rerank request failed: ${err.message}`);
      }
    }
  }

  return errorResponse(
    HTTP_STATUS.BAD_REQUEST,
    `Invalid rerank model: ${body.model}. Use format: provider/model`
  );
}

export async function POST(request: Request): Promise<Response> {
  const { withInjectionGuard } = await load("@shiguang-gateway/core-domain/middleware/prompt-injection");
  return withInjectionGuard((guardedRequest: Request) => postHandler(guardedRequest, undefined))(request);
}
