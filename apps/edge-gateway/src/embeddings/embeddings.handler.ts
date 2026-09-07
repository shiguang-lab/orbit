import { errorResponse } from "@orbit/inference/utils/error";
import { HTTP_STATUS } from "@orbit/inference/config/constants";
import * as log from "@orbit/core/sse/logger";
import { enforceApiKeyPolicy } from "@orbit/core/runtime/api-key-policy";
import { isRequireApiKeyEnabled } from "@orbit/core/runtime/feature-flags";
import { v1EmbeddingsSchema } from "@orbit/core/edge/embeddings-validation-schemas";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";

import { createEmbeddingResponse, type EmbeddingHandlerOptions } from "@orbit/inference/services/embedding-route";
import { extractApiKey, isValidApiKey } from "@orbit/inference/services/auth";
import { withInjectionGuard } from "@orbit/core/middleware/prompt-injection";
import { getSpecialtyModelsResponse } from "@orbit/inference/catalog/specialty";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export async function GET(request?: Request) {
  return getSpecialtyModelsResponse(
    request,
    "/v1/embeddings",
    (model) => model.type === "embedding"
  );
}

type ValidatedEmbeddingBody = Record<string, unknown> & { model: string };

export async function handleValidatedEmbeddingRequestBody(
  body: ValidatedEmbeddingBody,
  options: EmbeddingHandlerOptions = {}
) {
  return createEmbeddingResponse(body, options);
}

async function postHandler(request: Request, _context: unknown) {
  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    log.warn("EMBED", "Invalid JSON body");
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Invalid JSON body");
  }

  const validation = validateBody(v1EmbeddingsSchema, rawBody);
  if (isValidationFailure(validation)) {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, validation.error.message);
  }
  const body = validation.data as ValidatedEmbeddingBody;

  // Auth check — when REQUIRE_API_KEY=false, ignore presented invalid keys
  // so anonymous access works the same as all other client APIs (#7785).
  const apiKeyRaw = extractApiKey(request);
  if (isRequireApiKeyEnabled() && !apiKeyRaw) {
    return errorResponse(HTTP_STATUS.UNAUTHORIZED, "Authentication required");
  }
  if (isRequireApiKeyEnabled() && apiKeyRaw && !(await isValidApiKey(apiKeyRaw))) {
    return errorResponse(HTTP_STATUS.UNAUTHORIZED, "Invalid API key");
  }

  // Enforce API key policies (model restrictions + budget limits)
  const policy = await enforceApiKeyPolicy(request, body.model);
  if (policy.rejection) return policy.rejection;

  // Extract API key info for logging
  const apiKeyMeta = policy.apiKeyInfo;

  // Build client raw request for logging
  const clientRawRequest = {
    endpoint: "/v1/embeddings",
    body: rawBody,
    headers: Object.fromEntries(request.headers.entries()),
  };

  return handleValidatedEmbeddingRequestBody(body as ValidatedEmbeddingBody, {
    clientRawRequest,
    apiKeyId: apiKeyMeta?.id || null,
    apiKeyName: apiKeyMeta?.name || null,
    connectionId: null,
  });
}

export const POST = withInjectionGuard(postHandler);
