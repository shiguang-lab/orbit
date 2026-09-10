/**
 * chatCore per-attempt logging persistence (Quality Gate v2 / Fase 9 — chatCore god-file
 * decomposition, #3501).
 *
 * Extracted from handleChatCore: persists one attempt's call log. Emits a provider.warning audit
 * event when the provider response carries warnings, fills the detailed pipeline payloads (when
 * detailed logging is on), and writes the bounded/truncated call-log row (request/response bodies
 * with the Claude prompt-cache meta attached). Best-effort: the saveCallLog write swallows its own
 * errors. The per-request context (provider/model/ids/combo/etc.) is threaded via `ctx` so the 16
 * call sites in the handler stay byte-identical; behaviour is unchanged.
 */

import { extractProviderWarnings } from "@orbit/core/compliance/provider-audit";
import { logAuditEvent } from "@orbit/core/compliance/audit-log";
import { emit } from "@orbit/core/events/eventBus";
import type { RequestCompletedPayload, RequestFailedPayload } from "@orbit/core/events/types";
import { saveCallLog } from "@orbit/core/usage/call-logs";
import { FORMATS } from "../../translator/formats.ts";
import { takeEarlyKeepaliveBytes } from "../../utils/earlyKeepaliveByteBuffer.ts";
import { buildErrorBody } from "../../utils/error.ts";
import { cloneBoundedChatLogPayload, truncateForLog } from "./logTruncation.ts";
import { attachLogMeta } from "./cacheUsageMeta.ts";

type VideoBridgeLogRedactionEntry = {
  container: "messages" | "input";
  fullText: string;
  redactedText: string;
};

export function applyVideoBridgeLogRedaction(
  body: unknown,
  entries: VideoBridgeLogRedactionEntry[] | null | undefined
): unknown {
  if (!entries?.length || !body || typeof body !== "object") return body;
  const source = body as Record<string, unknown>;
  const clone = structuredClone(source);
  let changed = false;
  for (const entry of entries) {
    const container = clone[entry.container];
    if (!Array.isArray(container) || !entry.fullText) continue;
    const expectedType = entry.container === "input" ? "input_text" : "text";
    for (const message of container) {
      if (!message || typeof message !== "object") continue;
      const content = (message as Record<string, unknown>).content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        if (!part || typeof part !== "object") continue;
        const record = part as Record<string, unknown>;
        if (record.type === expectedType && record.text === entry.fullText) {
          record.text = entry.redactedText;
          changed = true;
        }
      }
    }
  }
  return changed ? clone : body;
}

/**
 * Extract the OpenAI Responses API response id this attempt produced, so it
 * can be indexed for Orbit-native `previous_response_id` continuation
 * (see src/lib/db/responsesContinuationStore.ts). Only meaningful when the
 * client actually used the Responses endpoint -- a Chat Completions
 * `chatcmpl-*` id must never be mistaken for a Responses response id.
 *
 * A non-streaming clientResponse carries `id` directly. A streaming one goes
 * through clientPayloadCollector.build(), which always nests the caller's
 * summary under `.summary` (see createStructuredSSECollector in
 * streamPayloadCollector.ts) -- check both shapes rather than assuming one.
 */
export function extractResponsesId(sourceFormat: unknown, clientResponse: unknown): string | null {
  if (sourceFormat !== FORMATS.OPENAI_RESPONSES) return null;
  if (!clientResponse || typeof clientResponse !== "object") return null;
  const record = clientResponse as { id?: unknown; summary?: unknown };
  const directId = record.id;
  if (typeof directId === "string" && directId.length > 0) return directId;
  const summary = record.summary;
  if (summary && typeof summary === "object") {
    const summaryId = (summary as { id?: unknown }).id;
    if (typeof summaryId === "string" && summaryId.length > 0) return summaryId;
  }
  return null;
}

export type PersistAttemptLogsArgs = {
  status: number;
  tokens?: unknown;
  responseBody?: unknown;
  error?: string | null;
  providerRequest?: unknown;
  providerResponse?: unknown;
  clientResponse?: unknown;
  claudeCacheMeta?: Record<string, unknown>;
  claudeCacheUsageMeta?: Record<string, unknown>;
  cacheSource?: "upstream" | "semantic";
};

export type PersistAttemptLogsContext = {
  /** Per-attempt trace id — MUST match the id emitted in `request.started` so the live
   * dashboard can pair the terminal event and clear the topology node's active pulse. */
  traceId: string;
  provider: string | null | undefined;
  connectionId: string | null | undefined;
  model: string | null | undefined;
  skillRequestId: string;
  detailedLoggingEnabled: boolean;
  reqLogger: { getPipelinePayloads?: () => Record<string, unknown> | undefined } | null | undefined;
  pendingRequestId: unknown;
  clientRawRequest: { endpoint?: string } | null | undefined;
  requestedModel: unknown;
  credentials: { connectionId?: string } | null | undefined;
  startTime: number;
  body: unknown;
  sourceFormat: unknown;
  targetFormat: unknown;
  comboName: unknown;
  comboStepId: unknown;
  comboExecutionKey: unknown;
  tokensCompressed: unknown;
  apiKeyInfo: { id?: string | null; name?: string | null } | null | undefined;
  noLogEnabled: unknown;
  correlationId?: string | null;
  modelPinned?: boolean;
  /** #8249: caller-supplied X-Orbit-Session-Id header, only set when the header was
   * explicitly present (never synthesized from skillRequestId) — persisted as call_logs.session_tag
   * for per-session cost attribution. */
  sessionTag?: string | null;
  videoContentRemoved?: boolean;
  videoBridgeLogRedaction?: VideoBridgeLogRedactionEntry[];
};

function toConnectionId(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function buildAccountRotationMeta(
  provider: string | null | undefined,
  initialConnectionId: string | null,
  finalConnectionId: string | null
) {
  if (provider !== "codex" || !initialConnectionId || !finalConnectionId) return null;
  if (initialConnectionId === finalConnectionId) return null;

  return {
    codexAccountRotation: {
      initialConnectionId,
      finalConnectionId,
    },
  };
}

/**
 * Pure resolver for the terminal request-lifecycle dashboard event. Extracted so the
 * "stuck green" latch fix (emitting request.completed/failed to clear the live topology
 * node) is unit-testable without the DB write in persistAttemptLogs. A 2xx/3xx status
 * with no error is a completion; everything else (including a missing/odd status) is a
 * failure. `id` mirrors the `traceId` used by the paired `request.started`.
 */
export function resolveRequestLifecycleEvent(input: {
  traceId: string;
  status: number;
  error?: string | null;
  model?: string | null;
  provider?: string | null;
  comboName?: unknown;
  tokens?: unknown;
  latencyMs: number;
}):
  | { name: "request.completed"; payload: RequestCompletedPayload }
  | { name: "request.failed"; payload: RequestFailedPayload } {
  const { traceId, status, error, model, provider, comboName, tokens, latencyMs } = input;
  const succeeded = typeof status === "number" && status >= 200 && status < 400 && !error;
  const resolvedComboName = typeof comboName === "string" && comboName ? comboName : undefined;
  if (succeeded) {
    const tokenBag = (tokens && typeof tokens === "object" ? tokens : {}) as Record<
      string,
      unknown
    >;
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
    return {
      name: "request.completed",
      payload: {
        id: traceId,
        status: "success",
        model: model || "unknown",
        provider: provider || "unknown",
        tokensInput: num(tokenBag.input ?? tokenBag.prompt_tokens ?? tokenBag.inputTokens),
        tokensOutput: num(tokenBag.output ?? tokenBag.completion_tokens ?? tokenBag.outputTokens),
        latencyMs,
        comboName: resolvedComboName,
      },
    };
  }
  return {
    name: "request.failed",
    payload: {
      id: traceId,
      error: buildErrorBody(status, error || `HTTP ${status}`).error.message,
      statusCode: typeof status === "number" ? status : undefined,
      latencyMs,
      model: model || undefined,
      provider: provider || undefined,
    },
  };
}

export function persistAttemptLogs(args: PersistAttemptLogsArgs, ctx: PersistAttemptLogsContext) {
  const {
    status,
    tokens,
    responseBody,
    error,
    providerRequest,
    providerResponse,
    clientResponse,
    claudeCacheMeta,
    claudeCacheUsageMeta,
    cacheSource,
  } = args;
  const {
    traceId,
    provider,
    connectionId,
    model,
    skillRequestId,
    detailedLoggingEnabled,
    reqLogger,
    pendingRequestId,
    clientRawRequest,
    requestedModel,
    credentials,
    startTime,
    body,
    sourceFormat,
    targetFormat,
    comboName,
    comboStepId,
    comboExecutionKey,
    tokensCompressed,
    apiKeyInfo,
    noLogEnabled,
    correlationId,
    modelPinned,
    sessionTag,
    videoContentRemoved,
    videoBridgeLogRedaction,
  } = ctx;
  const initialConnectionId = toConnectionId(connectionId);
  const finalConnectionId = toConnectionId(credentials?.connectionId) || initialConnectionId;
  const accountRotationMeta = buildAccountRotationMeta(
    provider,
    initialConnectionId,
    finalConnectionId
  );

  const providerWarnings = extractProviderWarnings(providerResponse, clientResponse, responseBody);
  if (providerWarnings.length > 0) {
    logAuditEvent({
      action: "provider.warning",
      actor: "system",
      target: [provider, finalConnectionId].filter(Boolean).join(":") || provider || model,
      resourceType: "provider_warning",
      status: "warning",
      requestId: skillRequestId,
      details: {
        provider,
        model,
        connectionId: finalConnectionId,
        httpStatus: status,
        warnings: providerWarnings,
      },
    });
  }

  const capturedPipeline = reqLogger?.getPipelinePayloads?.() ?? null;
  const pipelinePayloads = detailedLoggingEnabled
    ? (capturedPipeline ?? {})
    : capturedPipeline?.routeDecision
      ? { routeDecision: capturedPipeline.routeDecision }
      : null;

  if (pipelinePayloads) {
    if (providerRequest !== undefined && !pipelinePayloads.providerRequest) {
      pipelinePayloads.providerRequest = providerRequest as Record<string, unknown>;
    }
    if (providerResponse !== undefined && !pipelinePayloads.providerResponse) {
      pipelinePayloads.providerResponse = providerResponse as Record<string, unknown>;
    }
    if (clientResponse !== undefined) {
      pipelinePayloads.clientResponse = clientResponse as Record<string, unknown>;
    }
    if (error) {
      pipelinePayloads.error = {
        ...(typeof pipelinePayloads.error === "object" && pipelinePayloads.error
          ? (pipelinePayloads.error as Record<string, unknown>)
          : {}),
        message: error,
      };
    }
    // withEarlyStreamKeepalive writes keepalive/startup/error frames directly
    // to the client from OUTSIDE this handler's own reqLogger, so they never
    // reach reqLogger.appendConvertedChunk. correlationId is the only thing
    // both sides share (see earlyKeepaliveByteBuffer.ts's file doc for why);
    // merge here, once, right before persistence, prepended in send order.
    if (detailedLoggingEnabled && correlationId) {
      const earlyClientBytes = takeEarlyKeepaliveBytes(correlationId);
      if (earlyClientBytes.length > 0) {
        const existingStreamChunks =
          (pipelinePayloads.streamChunks as { client?: string[] } | undefined) ?? {};
        pipelinePayloads.streamChunks = {
          ...existingStreamChunks,
          client: [...earlyClientBytes, ...(existingStreamChunks.client ?? [])],
        };
      }
    }
  }

  saveCallLog({
    id: pendingRequestId,
    method: "POST",
    path: clientRawRequest?.endpoint || "/v1/chat/completions",
    status,
    model,
    requestedModel,
    provider,
    connectionId: finalConnectionId || undefined,
    duration: Date.now() - startTime,
    tokens: tokens || {},
    requestBody: cloneBoundedChatLogPayload(
      attachLogMeta(truncateForLog(applyVideoBridgeLogRedaction(body, videoBridgeLogRedaction) as Record<string, unknown>), {
        ...accountRotationMeta,
        claudePromptCache: claudeCacheMeta,
      })
    ),
    responseBody: cloneBoundedChatLogPayload(
      attachLogMeta(truncateForLog(responseBody as Record<string, unknown>), {
        ...accountRotationMeta,
        claudePromptCache: claudeCacheMeta
          ? {
              applied: claudeCacheMeta.applied,
              totalBreakpoints: claudeCacheMeta.totalBreakpoints,
              anthropicBeta: claudeCacheMeta.anthropicBeta,
            }
          : null,
        claudePromptCacheUsage: claudeCacheUsageMeta,
      })
    ),
    error: error || null,
    sourceFormat,
    targetFormat,
    comboName,
    comboStepId,
    comboExecutionKey,
    tokensCompressed,
    cacheSource: cacheSource === "semantic" ? "semantic" : "upstream",
    apiKeyId: apiKeyInfo?.id || null,
    apiKeyName: apiKeyInfo?.name || null,
    noLog: noLogEnabled,
    pipelinePayloads,
    correlationId,
    modelPinned: modelPinned || false,
    sessionTag: sessionTag || null,
    responseId: extractResponsesId(sourceFormat, clientResponse),
    videoContentRemoved: videoContentRemoved === true,
  }).catch(() => {});

  // Emit the terminal request-lifecycle event to the live dashboard bus. `request.started`
  // is emitted in chatCore with this same `traceId`; without a matching completed/failed the
  // client's active-request map never drains, so the topology node stays green forever (the
  // "stuck green" latch — request.completed/failed were declared + consumed but never emitted).
  // Deferred via setImmediate to keep it off the response hot path, mirroring request.started.
  setImmediate(() => {
    const lifecycle = resolveRequestLifecycleEvent({
      traceId,
      status,
      error,
      model,
      provider,
      comboName,
      tokens,
      latencyMs: Date.now() - startTime,
    });
    if (lifecycle.name === "request.completed") {
      emit("request.completed", lifecycle.payload);
    } else {
      emit("request.failed", lifecycle.payload);
    }
  });
}
