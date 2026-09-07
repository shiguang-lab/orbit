import { CORS_HEADERS } from "@shiguang-gateway/contracts/cors";
import { v1CountTokensSchema } from "@shiguang-gateway/core-domain/edge/count-tokens-validation";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { countTextTokens, type TokenizerContext } from "@shiguang-gateway/core-domain/shared/tokenizer";
import { isRuntimeProviderRetirementError } from "@shiguang-gateway/contracts/provider-retirement";
import { buildErrorBody } from "@shiguang-gateway/open-sse/utils/error";
import { runWithProxyContext } from "@shiguang-gateway/open-sse/utils/proxyFetch";
import { isCommonChatGptWebRetirementError } from "@shiguang-gateway/contracts/chatgpt-web-retirement";
import { getProviderCredentials } from "@shiguang-gateway/open-sse/services/auth";
import { isAllRateLimitedCredentials } from "@shiguang-gateway/open-sse/services/credential-selection";
import * as log from "@shiguang-gateway/core-domain/sse/logger";

const load = (specifier: string): Promise<any> => import(specifier);

/**
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * POST /v1/messages/count_tokens - Hybrid token count response.
 * Uses real provider-side count when supported, falling back to estimation.
 */
export async function POST(request: Request): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  const validation = validateBody(v1CountTokensSchema, rawBody);
  if (isValidationFailure(validation)) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
  const body = validation.data;

  const tokenizerContext: TokenizerContext = {
    model: typeof body.model === "string" ? body.model : undefined,
  };
  const estimated = buildEstimatedCountResponse(body, tokenizerContext);
  const requestedModel = typeof body.model === "string" ? body.model : "";
  if (!requestedModel) {
    return estimated;
  }

  try {
    const [modelApi, proxyApi, executorApi, usageApi] = await Promise.all([
      load("@shiguang-gateway/open-sse/services/runtimeModel"),
      load("@shiguang-gateway/open-sse/handlers/chatHelpers"),
      load("@shiguang-gateway/open-sse/executors/index"),
      load("@shiguang-gateway/open-sse/utils/usageTracking"),
    ]);
    const { getModelInfo } = modelApi;
    const { safeResolveProxy } = proxyApi;
    const { getExecutor } = executorApi;
    const { isInputTokenCountPlausible } = usageApi;
    const modelInfo = await getModelInfo(requestedModel);
    if (!modelInfo?.provider || !modelInfo?.model) {
      return estimated;
    }

    const credentials = await getProviderCredentials(
      modelInfo.provider,
      null,
      null,
      modelInfo.model
    );
    if (!credentials || isAllRateLimitedCredentials(credentials)) {
      return estimated;
    }

    const executor = await getExecutor(modelInfo.provider);
    // The provider-side count is a real upstream call — it must honor the
    // connection's proxy assignment exactly like chat execution does.
    const connectionId =
      "connectionId" in credentials && typeof credentials.connectionId === "string"
        ? credentials.connectionId
        : undefined;
    const proxyInfo = await safeResolveProxy(
      connectionId,
      undefined,
      modelInfo.provider
    );
    const counted = (await runWithProxyContext(proxyInfo?.proxy || null, () =>
      executor?.countTokens?.({
        model: modelInfo.model,
        body,
        credentials,
        log,
      })
    )) as { input_tokens?: unknown; source?: string } | null | undefined;

    if (
      !counted ||
      !Number.isFinite(counted.input_tokens) ||
      !isInputTokenCountPlausible(counted.input_tokens, body)
    ) {
      return estimated;
    }

    return new Response(
      JSON.stringify({
        input_tokens: counted.input_tokens,
        model: modelInfo.model,
        provider: modelInfo.provider,
        source: counted.source || "provider",
      }),
      {
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      }
    );
  } catch (error) {
    if (isRuntimeProviderRetirementError(error) || isCommonChatGptWebRetirementError(error)) {
      return new Response(
        JSON.stringify(
          buildErrorBody(error.status, error.message, null, {
            type: "provider_error",
            code: error.code,
          })
        ),
        {
          status: error.status,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        }
      );
    }
    log.debug(
      "COUNT_TOKENS",
      `Falling back to estimate for ${requestedModel}: ${error instanceof Error ? error.message : String(error)}`
    );
    return estimated;
  }
}

function safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
}

// Estimate tokens for a single Anthropic content block. Real agentic
// conversations carry most of their tokens in `tool_use` inputs, `tool_result`
// content, and `thinking` blocks — counting only `text` (as before) reported
// near-zero for those messages and silently broke Claude Code's auto-compaction
// (#2337). Image / redacted_thinking blocks are not text-estimable and count 0.
function estimateContentBlockTokens(part: unknown, tokenizerContext: TokenizerContext): number {
  if (!part || typeof part !== "object") return 0;
  const block = part as Record<string, unknown>;
  let tokens = 0;
  switch (block.type) {
    case "text":
      if (typeof block.text === "string") tokens += countTextTokens(block.text, tokenizerContext);
      break;
    case "tool_use":
      if (typeof block.name === "string") tokens += countTextTokens(block.name, tokenizerContext);
      if (block.input !== undefined) tokens += countTextTokens(safeStringify(block.input), tokenizerContext);
      break;
    case "tool_result":
      tokens += estimateToolResultTokens(block.content, tokenizerContext);
      break;
    case "thinking":
      if (typeof block.thinking === "string") tokens += countTextTokens(block.thinking, tokenizerContext);
      break;
    default:
      break;
  }
  return tokens;
}

// A `tool_result` content can be a plain string or an array of nested blocks
// (text / image). Count string content and nested text blocks.
function estimateToolResultTokens(content: unknown, tokenizerContext: TokenizerContext): number {
  if (typeof content === "string") return countTextTokens(content, tokenizerContext);
  if (Array.isArray(content)) {
    let tokens = 0;
    for (const block of content) {
      if (block?.type === "text" && typeof block.text === "string") {
        tokens += countTextTokens(block.text, tokenizerContext);
      }
    }
    return tokens;
  }
  return 0;
}

function buildEstimatedCountResponse(body: Record<string, unknown>, tokenizerContext: TokenizerContext = {}): Response {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  let inputTokens = 0;

  for (const msg of messages) {
    if (typeof msg?.content === "string") {
      inputTokens += countTextTokens(msg.content, tokenizerContext);
      continue;
    }

    if (Array.isArray(msg?.content)) {
      for (const part of msg.content) {
        inputTokens += estimateContentBlockTokens(part, tokenizerContext);
      }
    }
  }

  if (typeof body?.system === "string") {
    inputTokens += countTextTokens(body.system, tokenizerContext);
  } else if (Array.isArray(body?.system)) {
    for (const block of body.system) {
      if (block?.type === "text" && typeof block.text === "string") {
        inputTokens += countTextTokens(block.text, tokenizerContext);
      }
    }
  }

  return new Response(
    JSON.stringify({
      input_tokens: inputTokens,
      source: "local",
    }),
    {
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    }
  );
}
