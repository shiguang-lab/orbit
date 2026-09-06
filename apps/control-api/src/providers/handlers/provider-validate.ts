import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { getAuditRequestContext, logAuditEvent } from "@shiguang-gateway/core-domain/compliance/audit-log";
import { getProviderNodeById } from "@shiguang-gateway/core-domain/db/provider-nodes";
import {
  isClaudeCodeCompatibleProvider,
  isOpenAICompatibleProvider,
  isAnthropicCompatibleProvider,
} from "@shiguang-gateway/core-domain/catalog/providers";
import { validateProviderApiKey } from "@shiguang-gateway/open-sse/services/provider-validation";
import { getProxyForLevel } from "@shiguang-gateway/core-domain/db/proxy-settings";
import { resolveProxyForProvider } from "@shiguang-gateway/core-domain/db/proxies";
import { validateProviderApiKeySchema } from "@shiguang-gateway/core-domain/control/provider-validation-schemas";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { runWithProxyContextOrDirect } from "@shiguang-gateway/open-sse/utils/proxyFetch";
import {
  CHATGPT_WEB_RETIRED_ERROR_CODE,
  CHATGPT_WEB_RETIRED_MESSAGE,
  isCommonChatGptWebRetiredProviderId,
} from "@shiguang-gateway/contracts/chatgpt-web-retirement";
import { errorResponse } from "@shiguang-gateway/open-sse/utils/error";

function rejectRetiredCommonChatGptWebProvider(providerId: unknown): Response | null {
  return isCommonChatGptWebRetiredProviderId(providerId)
    ? errorResponse(410, CHATGPT_WEB_RETIRED_MESSAGE, {
        type: "provider_error",
        code: CHATGPT_WEB_RETIRED_ERROR_CODE,
      })
    : null;
}

function sanitizeAuditUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "") || parsed.origin;
  } catch {
    return String(url);
  }
}

/** POST /api/providers/validate - Validate an API key against a provider. */
export async function POST(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  const auditContext = getAuditRequestContext(request);
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: { message: "Invalid request", details: [{ field: "body", message: "Invalid JSON body" }] } }, { status: 400 });
  }

  try {
    const validation = validateBody(validateProviderApiKeySchema, rawBody);
    if (isValidationFailure(validation)) return Response.json({ error: validation.error }, { status: 400 });
    const {
      provider, apiKey, validationModelId, customUserAgent, baseUrl: bodyBaseUrl,
      region, accessKeyId, sessionToken, cx, runtimeKey, tunnelId, connectorName,
    } = validation.data;
    const retirementResponse = rejectRetiredCommonChatGptWebProvider(provider);
    if (retirementResponse) return retirementResponse;

    const providerSpecificData: Record<string, unknown> = { validationModelId };
    if (customUserAgent) providerSpecificData.customUserAgent = customUserAgent;
    if (bodyBaseUrl) providerSpecificData.baseUrl = bodyBaseUrl;
    if (region) providerSpecificData.region = region;
    if (accessKeyId) providerSpecificData.accessKeyId = accessKeyId;
    if (sessionToken) providerSpecificData.sessionToken = sessionToken;
    if (cx) providerSpecificData.cx = cx;
    if (runtimeKey) providerSpecificData.runtimeKey = runtimeKey;
    if (tunnelId) providerSpecificData.tunnelId = tunnelId;
    if (connectorName) providerSpecificData.connectorName = connectorName;

    if (isOpenAICompatibleProvider(provider) || isAnthropicCompatibleProvider(provider)) {
      const node = await getProviderNodeById(provider);
      if (!node) {
        const typeName = isOpenAICompatibleProvider(provider)
          ? "OpenAI"
          : isClaudeCodeCompatibleProvider(provider) ? "CC" : "Anthropic";
        return Response.json({ error: `${typeName} Compatible node not found` }, { status: 404 });
      }
      Object.assign(providerSpecificData, {
        baseUrl: bodyBaseUrl || node.baseUrl,
        apiType: node.apiType,
        chatPath: node.chatPath,
        modelsPath: node.modelsPath,
      });
    }

    const registryProxy = await resolveProxyForProvider(provider);
    const providerProxy = registryProxy || await getProxyForLevel("provider", provider);
    const proxyToUse = providerProxy || await getProxyForLevel("global");
    const result = await runWithProxyContextOrDirect(proxyToUse || null, () =>
      validateProviderApiKey({ provider, apiKey, providerSpecificData })
    );

    if (result.unsupported) return Response.json({ error: "Provider validation not supported", unsupported: true }, { status: 400 });
    if (!result.valid && typeof result.statusCode === "number") {
      if (result.securityBlocked) {
        logAuditEvent({
          action: "provider.validation.ssrf_blocked", actor: "admin", target: provider,
          resourceType: "provider_validation", status: "blocked",
          ipAddress: auditContext.ipAddress || undefined, requestId: auditContext.requestId,
          metadata: { provider, route: "/api/providers/validate", reason: result.error || "Blocked provider validation target", baseUrl: sanitizeAuditUrl(bodyBaseUrl || providerSpecificData.baseUrl) },
        });
      }
      return Response.json({ error: result.error || "Validation failed" }, { status: result.statusCode });
    }
    return Response.json({
      valid: !!result.valid, error: result.valid ? null : result.error || "Invalid API key",
      warning: result.warning || null, method: result.method || null,
      capabilities: result.capabilities || null, providerSpecificData: result.providerSpecificData || null,
    });
  } catch (error) {
    console.log("Error validating API key:", error);
    return Response.json({ error: "Validation failed" }, { status: 500 });
  }
}
