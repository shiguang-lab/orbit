import { unwrapClinepassEnvelope } from "./clinepassEnvelope.ts";
import { normalizePayloadForLog } from "./logPayload.ts";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import {
  buildErrorBody,
  type ErrorResponseBody,
} from "@shiguang-gateway/http-kernel/error-response";
import { buildPassthroughErrorResponse } from "./upstreamErrorPassthrough.ts";

export {
  redactSensitiveErrorText,
  sanitizeErrorMessage,
  sanitizeUpstreamDetails,
} from "@shiguang-gateway/error-sanitization";
export {
  buildErrorBody,
  buildModelCooldownBody,
  errorResponse,
  modelCooldownResponse,
  providerCircuitOpenResponse,
  unavailableResponse,
} from "@shiguang-gateway/http-kernel/error-response";
export type {
  ErrorBodyClassification,
  ErrorResponseBody,
} from "@shiguang-gateway/http-kernel/error-response";

/**
 * Sanitized auto-combo diagnostic trace surfaced on a combo terminal failure.
 * Contains ONLY provider/model ids, enumerated reason codes, and counts — never
 * keys, tokens, cookies, credentials, or upstream bodies. Fields are length- and
 * count-capped so the projection is safe to place in HTTP headers too. (QA P0:
 * "Add a sanitized combo diagnostic trace … candidate pool count, excluded
 * provider/model reasons, selected attempt order, terminal failure summary.")
 */
export interface ComboExclusion {
  provider: string;
  model?: string;
  reason: string;
}
/**
 * Next-step suggestion surfaced when a combo cascade fails. Lets the client (e.g.
 * the OpenCode plugin) auto-render an actionable hint in the TUI instead of an
 * opaque "model stopped producing output" error — fixes the silent-stop pattern
 * where the user has no way to recover a session without guessing. Whitelisted to
 * a small set so the projection remains bounded.
 */
export type ComboRecoveryAction =
  /** Cascade failed because every candidate is exhausted — try a different combo or `auto`. */
  | "try-auto"
  /** Upstream asks to retry after a cooldown window — wait, then retry the same combo. */
  | "wait"
  /** Transient failure (network, 5xx) — retry the same combo immediately. */
  | "retry"
  /** Cascade used every account of every provider — switch to a different combo entirely. */
  | "switch-combo";

export interface ComboRecoveryHint {
  /** Machine-readable action verb — consumed by clients to render a UI hint. */
  action: ComboRecoveryAction;
  /** Seconds the client should wait before retrying. Only meaningful when action="wait". */
  retry_after_seconds?: number;
  /** Human-readable next step — included verbatim in the error body for non-MCP clients. */
  next_step: string;
}

export interface ComboExclusion {
  provider: string;
  model?: string;
  reason: string;
}
export interface ComboDiagnostics {
  poolSize: number;
  attempted: number;
  excluded: ComboExclusion[];
  attemptOrder: Array<{ provider: string; model: string }>;
  terminalReason: string;
  /** Optional next-step hint — populated when the dispatcher can recommend a recovery action. */
  recovery?: ComboRecoveryHint;
}

function clampDiagStr(v: unknown, max = 128): string {
  return typeof v === "string" ? v.slice(0, max).replace(/[\r\n]+/g, " ") : "";
}

/**
 * HTTP header values must be Latin1/ByteString (undici throws a TypeError
 * otherwise — see #6612). Replace any codepoint outside the Latin1 range
 * (0-255) with "?" so header construction never throws. Only used for the
 * literal header value; the JSON body keeps the original, unsanitized
 * readable text via `sanitizeComboDiagnostics`.
 */
function toHeaderSafeAscii(v: string): string {
  let out = "";
  for (let i = 0; i < v.length; i++) {
    const code = v.charCodeAt(i);
    out += code > 255 ? "?" : v[i];
  }
  return out;
}

/**
 * Whitelist sanitizer for the recovery hint. The `action` enum is a closed set;
 * `retry_after_seconds` is clamped to a non-negative integer ≤ 3600; `next_step` is
 * capped and stripped of CR/LF (would break header parsing). Returns undefined when
 * no usable input was supplied so downstream code can branch cleanly on absence.
 */
const RECOVERY_ACTIONS = new Set<ComboRecoveryAction>([
  "try-auto",
  "wait",
  "retry",
  "switch-combo",
]);
export function sanitizeRecoveryHint(
  r: ComboRecoveryHint | null | undefined
): ComboRecoveryHint | undefined {
  if (!r || typeof r !== "object") return undefined;
  const action = typeof r.action === "string" ? (r.action as ComboRecoveryAction) : null;
  if (!action || !RECOVERY_ACTIONS.has(action)) return undefined;
  // Reject empty OR whitespace-only next_step — the value must render usefully as a
  // header and as a body field. A whitespace-only string would print as a blank hint.
  const next_step = clampDiagStr(r.next_step, 200).trim();
  if (!next_step) return undefined;
  const hint: ComboRecoveryHint = { action, next_step };
  if (typeof r.retry_after_seconds === "number" && Number.isFinite(r.retry_after_seconds)) {
    hint.retry_after_seconds = Math.max(0, Math.min(3600, Math.floor(r.retry_after_seconds)));
  }
  return hint;
}

/**
 * Whitelist projection — guarantees only id/reason string primitives + integer
 * counts can escape, regardless of what the caller assembled. This is the secret
 * containment boundary for the diagnostic trace.
 */
export function sanitizeComboDiagnostics(d: ComboDiagnostics): ComboDiagnostics {
  const recovery = sanitizeRecoveryHint(d?.recovery);
  const out: ComboDiagnostics = {
    poolSize: Number.isFinite(d?.poolSize) ? d.poolSize : 0,
    attempted: Number.isFinite(d?.attempted) ? d.attempted : 0,
    excluded: (d?.excluded ?? []).slice(0, 64).map((e) => ({
      provider: clampDiagStr(e?.provider, 64),
      ...(e?.model ? { model: clampDiagStr(e.model, 96) } : {}),
      reason: clampDiagStr(e?.reason, 64),
    })),
    attemptOrder: (d?.attemptOrder ?? [])
      .slice(0, 64)
      .map((a) => ({ provider: clampDiagStr(a?.provider, 64), model: clampDiagStr(a?.model, 96) })),
    terminalReason: clampDiagStr(d?.terminalReason, 200),
  };
  if (recovery) out.recovery = recovery;
  return out;
}

/**
 * errorResponse variant that attaches a sanitized combo diagnostic trace as BOTH
 * `x-shiguangGateway-combo-*` headers and a `diagnostics` field in the OpenAI-shaped
 * error body (extra field — backward-compatible with standard error parsers).
 * `opts.code`/`opts.type` override the status-derived defaults (e.g. to preserve
 * the `ALL_ACCOUNTS_INACTIVE` code on the 503 terminal path). When the diagnostic
 * carries a `recovery` hint it is mirrored as `x-shiguangGateway-recovery-action` /
 * `x-shiguangGateway-recovery-next-step` / `x-shiguangGateway-retry-after-seconds` headers and as a
 * top-level `recovery_hint` field on the body so non-header-aware clients (curl,
 * MCP tools, log scrapers) can also pick it up.
 */
export function errorResponseWithComboDiagnostics(
  statusCode: number,
  message: string,
  diagnostics: ComboDiagnostics,
  opts: { code?: string; type?: string } = {}
): Response {
  const safe = sanitizeComboDiagnostics(diagnostics);
  const body = buildErrorBody(statusCode, message) as ErrorResponseBody & {
    diagnostics?: ComboDiagnostics;
    recovery_hint?: ComboRecoveryHint;
  };
  if (opts.code) body.error.code = opts.code;
  if (opts.type) body.error.type = opts.type;
  body.diagnostics = safe;
  if (safe.recovery) body.recovery_hint = safe.recovery;
  const excludedHeader = toHeaderSafeAscii(
    safe.excluded
      .map((e) => `${e.provider}${e.model ? `/${e.model}` : ""}:${e.reason}`)
      .join(",")
      .slice(0, 900)
  );
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-shiguangGateway-combo-pool-size": String(safe.poolSize),
    "x-shiguangGateway-combo-attempted": String(safe.attempted),
    "x-shiguangGateway-combo-excluded": excludedHeader,
    "x-shiguangGateway-combo-terminal-reason": toHeaderSafeAscii(safe.terminalReason.slice(0, 200)),
  };

  if (safe.recovery) {
    headers["x-shiguangGateway-recovery-action"] = safe.recovery.action;
    // Header limit of 128 chars — keep next_step compact for fast parsing.
    // The body field carries the full 200-char value for richer display.
    headers["x-shiguangGateway-recovery-next-step"] = toHeaderSafeAscii(safe.recovery.next_step).slice(
      0,
      128
    );
    if (
      typeof safe.recovery.retry_after_seconds === "number" &&
      safe.recovery.retry_after_seconds > 0
    ) {
      headers["x-shiguangGateway-retry-after-seconds"] = String(safe.recovery.retry_after_seconds);
    }
  }

  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers,
  });
}

/**
 * Write error to SSE stream (for streaming)
 * @param {WritableStreamDefaultWriter} writer - Stream writer
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 */
export async function writeStreamError(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  statusCode: number,
  message: string
): Promise<void> {
  const errorBody = buildErrorBody(statusCode, sanitizeErrorMessage(message));
  const encoder = new TextEncoder();
  await writer.write(encoder.encode(`data: ${JSON.stringify(errorBody)}\n\n`));
}

/**
 * Parse Antigravity error message to extract retry time
 * Example: "You have exhausted your capacity on this model. Your quota will reset after 2h7m23s."
 * @param {string} message - Error message
 * @returns {number|null} Retry time in milliseconds, or null if not found
 */
export function parseAntigravityRetryTime(message: unknown): number | null {
  if (typeof message !== "string") return null;

  // Match patterns like: 2h7m23s, 5m30s, 45s, 1h20m, etc.
  const match = message.match(/reset after (\d+h)?(\d+m)?(\d+s)?/i);
  if (!match) return null;

  let totalMs = 0;

  // Extract hours
  if (match[1]) {
    const hours = parseInt(match[1]);
    totalMs += hours * 60 * 60 * 1000;
  }

  // Extract minutes
  if (match[2]) {
    const minutes = parseInt(match[2]);
    totalMs += minutes * 60 * 1000;
  }

  // Extract seconds
  if (match[3]) {
    const seconds = parseInt(match[3]);
    totalMs += seconds * 1000;
  }

  return totalMs > 0 ? totalMs : null;
}

/**
 * Parse upstream provider error response
 * @param {Response} response - Fetch response from provider
 * @param {string} provider - Provider name (for Antigravity-specific parsing)
 * @returns {Promise<{statusCode: number, message: string, retryAfterMs: number|null, responseBody: unknown}>}
 */
export async function parseUpstreamError(response: Response, provider: string | null = null) {
  let message: unknown = "";
  let retryAfterMs: number | null = null;
  let responseBody: unknown = null;
  let errorCode: unknown = undefined;
  let errorType: unknown = undefined;

  try {
    const text = await response.text();
    responseBody = normalizePayloadForLog(text);

    // Try parse as JSON
    try {
      const parsed = JSON.parse(text);
      // Handle array responses (e.g., from some Gemini APIs)
      const json = (Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : parsed) || {};
      // ClinePass wraps upstream errors in a {success:false, error} envelope.
      // Extract the upstream error string (an upstream JSON field, not a local
      // stack) — still routed through sanitizeErrorMessage/buildErrorBody by
      // every consumer below (Rule #12).
      const { error: clinepassEnvError } = unwrapClinepassEnvelope(json, provider);
      message = clinepassEnvError
        ? clinepassEnvError.message
        : json.error?.message || json.message || json.error || text;
      errorCode = json.error?.code || json.code;
      errorType = json.error?.type || json.type;
    } catch {
      message = text;
    }
  } catch {
    message = `Upstream error: ${response.status}`;
    responseBody = { _rawText: message };
  }

  const messageStr = typeof message === "string" ? message : JSON.stringify(message);

  const retryAfterHeader = response.headers?.get?.("retry-after");
  if (retryAfterHeader && !retryAfterMs) {
    const retryAfterSec = Number.parseInt(retryAfterHeader, 10);
    if (Number.isFinite(retryAfterSec) && retryAfterSec > 0) {
      retryAfterMs = retryAfterSec * 1000;
    } else {
      const retryAfterDate = new Date(retryAfterHeader).getTime();
      if (Number.isFinite(retryAfterDate) && retryAfterDate > Date.now()) {
        retryAfterMs = retryAfterDate - Date.now();
      }
    }
  }

  // Parse Antigravity-specific retry time from error message
  if (provider === "antigravity" && response.status === 429) {
    retryAfterMs = parseAntigravityRetryTime(messageStr);
  }

  // Also parse retry time for other providers (Qwen, etc.) with "quota will reset after XhYmZs" format
  if (response.status === 429 && !retryAfterMs) {
    retryAfterMs = parseAntigravityRetryTime(messageStr);
  }

  // Generic providers: "Please retry after 20s"
  if (response.status === 429 && !retryAfterMs) {
    const retryMatch = messageStr.match(/retry\s+after\s+(\d+)\s*s/i);
    if (retryMatch) {
      retryAfterMs = Number.parseInt(retryMatch[1], 10) * 1000;
    }
  }

  // Cap maximum retry time at 24 hours to prevent infinite wait
  const MAX_RETRY_MS = 24 * 60 * 60 * 1000;
  if (retryAfterMs && retryAfterMs > MAX_RETRY_MS) {
    retryAfterMs = MAX_RETRY_MS;
  }

  const responseHeaders: Record<string, string> | null = response.headers
    ? Object.fromEntries(response.headers.entries())
    : null;

  return {
    statusCode: response.status,
    message: messageStr,
    errorCode,
    errorType,
    retryAfterMs,
    responseBody,
    responseHeaders,
  };
}

/**
 * Create error result for chatCore handler
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {number|null} retryAfterMs - Optional retry-after time in milliseconds
 * @returns {{ success: false, status: number, error: string, response: Response, retryAfterMs?: number }}
 */
export function createErrorResult(
  statusCode: number,
  message: string,
  retryAfterMs: number | null = null,
  errorCode?: string,
  errorType?: string,
  upstreamDetails?: unknown,
  opts?: { passthrough?: boolean }
) {
  const body = buildErrorBody(statusCode, message, upstreamDetails);
  if (errorCode) {
    body.error.code = errorCode;
  }
  if (errorType) {
    body.error.type = errorType;
  }

  const result: {
    success: false;
    status: number;
    error: string;
    /**
     * #7360: the FULL, un-sanitized upstream message — `error` above is
     * truncated to its first line by sanitizeErrorMessage() (correctly, for
     * the client-facing response body). Server-side classification
     * (checkFallbackError / Gemini TPM-vs-RPD metric detection) needs the
     * complete multi-line text — e.g. Google's metric name and retry hint
     * live on lines 2-3, after the generic "quota exceeded" preamble on
     * line 1. This field NEVER reaches the HTTP response body (`response`
     * below is already built from the sanitized `body`); it exists purely
     * for internal callers that inspect the returned object.
     */
    rawMessage: string;
    errorType?: string;
    errorCode?: string;
    response: Response;
    retryAfterMs?: number;
  } = {
    success: false,
    status: statusCode,
    error: body.error.message,
    rawMessage: message,
    errorType,
    errorCode,
    response: new Response(JSON.stringify(body), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    }),
  };

  // Add retryAfterMs if available (for Antigravity quota errors)
  if (retryAfterMs) {
    result.retryAfterMs = retryAfterMs;
  }

  // Opt-in relay of the verbatim upstream error body (Claude Code auto-recover
  // contract — see upstreamErrorPassthrough.ts). Only swaps `result.response`;
  // `result.error`/`rawMessage`/`errorType`/`errorCode` stay untouched so
  // server-side classification (checkFallbackError, combo retry logic, etc.)
  // never sees a different value depending on this flag.
  if (opts?.passthrough) {
    const passthroughResponse = buildPassthroughErrorResponse(
      statusCode,
      upstreamDetails,
      retryAfterMs ? { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } : undefined
    );
    if (passthroughResponse) {
      result.response = passthroughResponse;
    }
  }

  return result;
}

/**
 * Build an executor-style error result (response + url + headers + transformedBody).
 * Shared by web-cookie executors that return the `{ response, url, headers, transformedBody }` shape.
 */
export function makeExecutorErrorResult(
  status: number,
  message: string,
  body: unknown,
  url: string
) {
  return {
    response: new Response(
      JSON.stringify({
        error: {
          message: sanitizeErrorMessage(message),
          type: "upstream_error",
          code: `HTTP_${status}`,
        },
      }),
      { status, headers: { "Content-Type": "application/json" } }
    ),
    url,
    headers: {} as Record<string, string>,
    transformedBody: body,
  };
}

/**
 * Normalize a cookie string: strip a leading "Cookie:" prefix if present.
 */
export function normalizeCookie(raw: string): string {
  return raw?.startsWith("Cookie:") ? raw.slice(7).trim() : raw || "";
}

/**
 * Format provider error with context
 * @param {Error} error - Original error
 * @param {string} provider - Provider name
 * @param {string} model - Model name
 * @param {number|string} statusCode - HTTP status code or error code
 * @returns {string} Formatted error message
 */
export function formatProviderError(
  error: { code?: string | number; message?: string; cause?: unknown } | Error,
  provider: string,
  model: string,
  statusCode?: string | number | null
): string {
  const providerCode = "code" in error ? error.code : undefined;
  const code = statusCode || providerCode || "FETCH_FAILED";
  const message = error.message || "Unknown error";
  // Expose low-level cause (e.g. UND_ERR_SOCKET, ECONNRESET, ETIMEDOUT) for diagnosing fetch failures
  const cause = (error as { cause?: unknown }).cause;
  const causeObj =
    cause && typeof cause === "object" ? (cause as Record<string, unknown>) : undefined;
  const causeCode = typeof causeObj?.code === "string" ? causeObj.code : undefined;
  const causeMsg = typeof causeObj?.message === "string" ? causeObj.message : undefined;
  const causeStr =
    causeCode || causeMsg ? ` (cause: ${[causeCode, causeMsg].filter(Boolean).join(": ")})` : "";
  return `[${code}]: ${message}${causeStr}`;
}
