import { z } from "zod";
import { isRuntimeProviderRetirementError } from "@shiguang-gateway/contracts/provider-retirement";
import { isCommonChatGptWebRetirementError } from "@shiguang-gateway/contracts/chatgpt-web-retirement";

const generation = z.number().int().positive().safe();
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("acquire"), model: z.string().trim().min(1).max(512) }),
  z.object({ action: z.literal("renew"), generation }),
  z.object({
    action: z.literal("release"),
    generation,
    reason: z.enum(["OWNER_EXIT", "CLIENT_CANCELLED"]).optional(),
  }),
]);

const load = (specifier: string): Promise<any> => import(specifier);

const json = (status: number, body: unknown, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function error(status: number, code: string, message: string, corsHeaders: Record<string, string>): Response {
  return json(status, { error: { message, type: "lease_error", code } }, corsHeaders);
}

const lifecycle = (lease: Record<string, unknown>) => {
  const { state, generation, acquiredAt, renewedAt, expiresAt } = lease;
  return { state, generation, acquiredAt, renewedAt, expiresAt };
};

/** CORS preflight for the managed session lease lifecycle. */
export async function OPTIONS(): Promise<Response> {
  const { handleCorsOptions } = await load("@shiguang-gateway/core-domain/shared/cors");
  return handleCorsOptions();
}

/** POST /v1/session-leases — acquire, renew, or release one exclusive connection lease. */
export async function POST(request: Request): Promise<Response> {
  const [auth, policyApi, leaseContext, localDb, modelApi, errorApi, contracts] = await Promise.all([
    load("@shiguang-gateway/open-sse/services/auth"),
    load("@shiguang-gateway/core-domain/runtime/api-key-policy"),
    load("@shiguang-gateway/open-sse/services/leaseContext"),
    load("@shiguang-gateway/core-domain/db/exclusive-connection-leases"),
    load("@shiguang-gateway/open-sse/services/runtimeModel"),
    load("@shiguang-gateway/open-sse/utils/error"),
    load("@shiguang-gateway/contracts/cors"),
  ]);
  const corsHeaders = contracts.CORS_HEADERS as Record<string, string>;
  const { extractApiKey, isValidApiKey, getProviderCredentialsWithQuotaPreflight } = auth;
  const { enforceApiKeyPolicy } = policyApi;
  const {
    buildManagedLeaseSelectionErrorResponse,
    isExclusiveLeaseManagedKey,
    parseLeaseOwnerHeader,
    validateExclusiveLeaseKeyConfiguration,
  } = leaseContext;
  const { releaseExclusiveConnectionLease, renewExclusiveConnectionLease } = localDb;
  const { getModelInfo } = modelApi;
  const { buildErrorBody } = errorApi;

  const fail = (status: number, code: string, message: string) =>
    json(status, buildErrorBody(status, message, null, { type: "lease_error", code }), corsHeaders);

  const apiKey = extractApiKey(request);
  if (!apiKey) return fail(401, "LEASE_AUTHENTICATION_REQUIRED", "Authentication required");
  if (!(await isValidApiKey(apiKey))) return fail(401, "LEASE_API_KEY_INVALID", "Invalid API key");
  const contentType = request.headers.get("content-type")?.toLowerCase().split(";", 1)[0].trim();
  if (contentType !== "application/json") {
    return fail(415, "LEASE_CONTENT_TYPE_REQUIRED", "Content-Type must be application/json");
  }

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "LEASE_ACTION_INVALID", "Invalid lease lifecycle action");

  let acquisitionModelInfo: Awaited<ReturnType<typeof getModelInfo>> | null = null;
  if (parsed.data.action === "acquire") {
    try {
      acquisitionModelInfo = await getModelInfo(parsed.data.model);
    } catch (cause) {
      if (isCommonChatGptWebRetirementError(cause)) {
        const retirement = cause as { status: number; code: string; message: string };
        return fail(retirement.status, retirement.code, retirement.message);
      }
      return fail(503, "LEASE_SERVICE_UNAVAILABLE", "Lease service unavailable");
    }
  }

  const policy = await enforceApiKeyPolicy(request, parsed.data.action === "acquire" ? parsed.data.model : null);
  if (policy.rejection) return policy.rejection;
  if (!policy.apiKeyInfo || !isExclusiveLeaseManagedKey(policy.apiKeyInfo)) {
    return fail(403, "LEASE_SCOPE_REQUIRED", "The lease:exclusive scope is required");
  }

  try {
    validateExclusiveLeaseKeyConfiguration(policy.apiKeyInfo);
    const leaseOwnerId = parseLeaseOwnerHeader(request.headers);
    if (parsed.data.action !== "acquire") {
      const input = { leaseOwnerId, generation: parsed.data.generation, apiKeyId: policy.apiKeyInfo.id };
      const result = parsed.data.action === "renew"
        ? renewExclusiveConnectionLease(input)
        : releaseExclusiveConnectionLease({ ...input, reason: parsed.data.reason });
      return result.kind !== "STALE"
        ? json(200, lifecycle(result.lease), corsHeaders)
        : fail(409, "LEASE_FENCE_STALE", "The lease generation is stale");
    }

    const modelInfo = acquisitionModelInfo!;
    if (!modelInfo.provider) return fail(400, "LEASE_MODEL_INVALID", "The model is unavailable");
    const selection = await getProviderCredentialsWithQuotaPreflight(
      modelInfo.provider,
      null,
      policy.apiKeyInfo.allowedConnections ?? [],
      modelInfo.model || parsed.data.model,
      {
        lease: { apiKeyId: policy.apiKeyInfo.id, context: { leaseOwnerId, generation: 1 }, mode: "acquire" },
        materializeCredentials: false,
        reserveOAuthSession: false,
      },
    );
    if (!selection) return fail(409, "LEASE_NO_ELIGIBLE_CONNECTION", "No eligible connection satisfies the managed key policy");
    const failure = buildManagedLeaseSelectionErrorResponse(selection);
    if (failure) {
      for (const [name, value] of Object.entries(corsHeaders)) failure.headers.set(name, value);
      return failure;
    }
    if (("allRateLimited" in selection && selection.allRateLimited) || ("allExpired" in selection && selection.allExpired)) {
      return fail(429, "LEASE_ELIGIBILITY_UNAVAILABLE", "Eligible connections are unavailable under current routing policy");
    }
    return json(200, lifecycle((selection as any).exclusiveLease), corsHeaders);
  } catch (cause) {
    if (isRuntimeProviderRetirementError(cause) || isCommonChatGptWebRetirementError(cause)) {
      const retirement = cause as { status: number; code: string; message: string };
      return fail(retirement.status, retirement.code, retirement.message);
    }
    if (cause instanceof Error && typeof (cause as any).status === "number" && typeof (cause as any).code === "string") {
      const context = cause as Error & { status: number; code: string };
      return fail(context.status, context.code, context.message);
    }
    return fail(503, "LEASE_SERVICE_UNAVAILABLE", "Lease service unavailable");
  }
}
