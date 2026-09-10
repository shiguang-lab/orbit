import { sanitizePII } from "./piiSanitizer.ts";
import { sanitizeErrorMessage, sanitizeUpstreamDetails } from "@orbit/utils/errors";

const SENSITIVE_KEYS = new Set([
  "api_key",
  "apiKey",
  "api-key",
  "authorization",
  "Authorization",
  "x-api-key",
  "X-Api-Key",
  "x-goog-api-key",
  "access_token",
  "accessToken",
  "refresh_token",
  "refreshToken",
  "password",
  "secret",
  "token",
  // secret-leak hardening: session cookies + browser-storage credentials that
  // some web-impersonation providers (Meta AI ecto_1_sess, Perplexity Web
  // storageState / runtimeKey) can surface into a request/response BODY field
  // rather than a header. Header-borne values are already masked by
  // maskSensitiveHeaders; this covers the body path into the on-disk call-log
  // artifact. Scoped to the actual credential field names only — the generic
  // word "capability" was intentionally NOT included: it is a common non-secret
  // field (model catalogs' `capabilities`, degradation/provider-discovery
  // `capability` strings, MCP tool schemas) and matching it here would broadly
  // redact useful diagnostics from call-log artifacts. The real Meta AI secret
  // is the ecto_1_sess cookie / ecto1: WS token, already covered by
  // cookie/authorization/storageState above.
  "cookie",
  "Cookie",
  "storageState",
  "storage-state",
  "runtimeKey",
]);

const SENSITIVE_CHALLENGE_KEYS = new Set([
  "recaptchav3token",
  "recaptchatoken",
  "turnstiletoken",
  "prooftoken",
  "resumetoken",
  "preparetoken",
]);

function isSensitivePayloadKey(key: string): boolean {
  return (
    SENSITIVE_KEYS.has(key) ||
    SENSITIVE_CHALLENGE_KEYS.has(key.replace(/[-_]/g, "").toLowerCase())
  );
}

type JsonRecord = Record<string, unknown>;

const ENCRYPTED_REASONING_KEY = "encrypted_content";

function encryptedReasoningOmissionMarker(length?: number): string {
  return length === undefined
    ? "[omitted: encrypted reasoning]"
    : `[omitted: encrypted reasoning, ${length} chars]`;
}

// Matches a JSON string field in captured SSE text. Alternatives inside the value are disjoint,
// keeping the scan linear even for large encrypted blobs.
const SERIALIZED_ENCRYPTED_REASONING_RE = /(\"encrypted_content\"\s*:\s*\")((?:\\.|[^\"\\])*)\"/g;
const STREAM_CHUNK_TIMESTAMP_RE = /^\[\d{2}:\d{2}:\d{2}\.\d{3}\] /;

export function omitEncryptedReasoningFromLogChunks(chunks: string[]): string[] {
  const combined = chunks.map((chunk) => chunk.replace(STREAM_CHUNK_TIMESTAMP_RE, "")).join("");
  let found = false;
  const omitted = combined.replace(SERIALIZED_ENCRYPTED_REASONING_RE, (_match, prefix: string) => {
    found = true;
    return `${prefix}${encryptedReasoningOmissionMarker()}\"`;
  });
  return found ? [omitted] : chunks;
}

const ERROR_SUBTREE_KEYS = new Set([
  "error",
  "errors",
  "warning",
  "warnings",
  "errormessage",
  "warningmessage",
  "errordescription",
  "warningdescription",
  "lasterror",
]);

function isErrorSubtreeKey(key: string): boolean {
  return ERROR_SUBTREE_KEYS.has(key.replace(/[-_]/g, "").toLowerCase());
}

function isFailureEnvelope(value: JsonRecord): boolean {
  try {
    return [value.type, value.event, value.kind].some(
      (entry) => typeof entry === "string" && entry.toLowerCase() === "response.failed"
    ) || value.status === "failed";
  } catch {
    return true;
  }
}

function projectErrorSubtreesForLog(
  value: unknown,
  seen = new WeakSet<object>(),
  forceFailure = false,
  preserveOutput = false
): unknown {
  if (typeof value === "string") {
    return forceFailure && !preserveOutput ? sanitizeErrorMessage(value) || "[REDACTED]" : value;
  }
  if (!value || typeof value !== "object" || isOpaqueBinary(value)) return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((entry) =>
        projectErrorSubtreesForLog(entry, seen, forceFailure, preserveOutput)
      );
    }
    const record = value as JsonRecord;
    const failure = forceFailure || isFailureEnvelope(record);
    const projected: JsonRecord = {};
    for (const [key, entry] of Object.entries(record)) {
      const normalized = key.replace(/[-_]/g, "").toLowerCase();
      if (isErrorSubtreeKey(key)) {
        projected[key] =
          typeof entry === "string"
            ? sanitizeErrorMessage(entry)
            : sanitizeUpstreamDetails(entry);
      } else {
        projected[key] = projectErrorSubtreesForLog(
          entry,
          seen,
          failure,
          normalized === "output"
        );
      }
    }
    return projected;
  } catch {
    return "[REDACTED]";
  } finally {
    seen.delete(value);
  }
}

export function sanitizeErrorFramesFromLogChunks(chunks: string[]): string[] {
  const combined = chunks.map((chunk) => chunk.replace(STREAM_CHUNK_TIMESTAMP_RE, "")).join("");
  let changed = false;
  let errorEvent = false;
  const lines = combined.split("\n").map((line) => {
    const event = line.match(/^\s*event:\s*([^\s]+)\s*$/i)?.[1]?.toLowerCase();
    if (event) {
      errorEvent = event === "error" || event === "warning" || event === "response.failed";
      return line;
    }
    if (!line.trim()) {
      errorEvent = false;
      return line;
    }
    const match = line.match(/^(\s*data:\s?)(.*)$/);
    const raw = match ? match[2] : line.trim();
    if (!raw || raw === "[DONE]" || (!errorEvent && !/[{[]/.test(raw[0]))) return line;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const projected = projectErrorSubtreesForLog(parsed, new WeakSet<object>(), errorEvent);
      const serialized = JSON.stringify(projected);
      if (serialized === raw) return line;
      changed = true;
      return match ? `${match[1]}${serialized}` : serialized;
    } catch {
      if (!errorEvent) return line;
      changed = true;
      return match
        ? `${match[1]}${sanitizeErrorMessage(raw) || "[REDACTED]"}`
        : sanitizeErrorMessage(line) || "[REDACTED]";
    }
  });
  return changed ? [lines.join("\n")] : chunks;
}

/**
 * True for any binary/opaque byte view (Uint8Array, Buffer, DataView, other
 * typed arrays). `Array.isArray()` returns false for these, so callers that
 * branch on it before recursing would otherwise fall into the generic-object
 * branch and enumerate one JS property key per decoded byte (#7297).
 */
function isOpaqueBinary(value: unknown): value is ArrayBufferView {
  return ArrayBuffer.isView(value);
}

function describeOpaqueBinary(value: ArrayBufferView): string {
  const byteLength = value.byteLength;
  return `[binary ${byteLength} bytes]`;
}

export function cloneLogPayload<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export function compactStructuredStreamPayload(payload: unknown): unknown {
  const record =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as JsonRecord)
      : {};
  if (record._streamed !== true || !("summary" in record)) return payload;

  const toString = (value: unknown, fallback: string): string =>
    typeof value === "string" ? value : fallback;
  const toNumber = (value: unknown, fallback: number): number => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  };
  const streamMeta: JsonRecord = {
    format: toString(record._format, "sse-json"),
    stage: toString(record._stage, "response"),
    eventCount: toNumber(record._eventCount, 0),
  };
  if (record._truncated === true) streamMeta.truncated = true;
  if (typeof record._droppedEvents === "number" && record._droppedEvents > 0) {
    streamMeta.droppedEvents = record._droppedEvents;
  }
  const summary = cloneLogPayload(record.summary);
  return summary && typeof summary === "object" && !Array.isArray(summary)
    ? { ...(summary as JsonRecord), _orbit_stream: streamMeta }
    : { summary, _orbit_stream: streamMeta };
}

export function normalizePayloadForLog(payload: unknown): unknown {
  if (typeof payload !== "string") return payload;

  const trimmed = payload.trim();
  if (!trimmed) return "";

  try {
    return JSON.parse(trimmed);
  } catch {
    return { _rawText: payload };
  }
}

/**
 * Remove opaque encrypted reasoning from log copies. The value is replayable by clients but
 * provides no useful diagnostics, so retaining its size is sufficient for observability.
 */
export function omitEncryptedReasoningForLog(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  if (isOpaqueBinary(payload)) return describeOpaqueBinary(payload);
  if (Array.isArray(payload)) return payload.map(omitEncryptedReasoningForLog);

  const omitted: JsonRecord = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === ENCRYPTED_REASONING_KEY && typeof value === "string" && value.length > 0) {
      omitted[key] = encryptedReasoningOmissionMarker(value.length);
    } else if (typeof value === "object" && value !== null) {
      omitted[key] = omitEncryptedReasoningForLog(value);
    } else {
      omitted[key] = value;
    }
  }
  return omitted;
}

export function redactPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  if (isOpaqueBinary(payload)) return describeOpaqueBinary(payload);
  if (Array.isArray(payload)) return payload.map(redactPayload);

  const redacted: JsonRecord = {};
  for (const [key, value] of Object.entries(payload)) {
    if (isSensitivePayloadKey(key)) {
      redacted[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.startsWith("Bearer ")) {
      redacted[key] = "Bearer [REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      redacted[key] = redactPayload(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export function sanitizePayloadPII(payload: unknown): unknown {
  if (typeof payload === "string") {
    return sanitizePII(payload).text;
  }
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  if (isOpaqueBinary(payload)) {
    return describeOpaqueBinary(payload);
  }
  if (Array.isArray(payload)) {
    return payload.map(sanitizePayloadPII);
  }

  const sanitized: JsonRecord = {};
  for (const [key, value] of Object.entries(payload)) {
    sanitized[key] = sanitizePayloadPII(value);
  }
  return sanitized;
}

export function protectPayloadForLog(payload: unknown): unknown {
  if (payload === null || payload === undefined) return null;
  const normalized = normalizePayloadForLog(payload);
  const errorProjected = projectErrorSubtreesForLog(normalized);
  const reasoningOmitted = omitEncryptedReasoningForLog(errorProjected);
  const piiSanitized = sanitizePayloadPII(reasoningOmitted);
  return redactPayload(piiSanitized);
}

export function protectErrorPayloadForLog(payload: unknown): unknown {
  if (payload === null || payload === undefined) return null;
  const normalized = normalizePayloadForLog(payload);
  if (isOpaqueBinary(normalized)) return describeOpaqueBinary(normalized);
  const errorProjected = projectErrorSubtreesForLog(normalized, new WeakSet<object>(), true);
  const reasoningOmitted = omitEncryptedReasoningForLog(errorProjected);
  return redactPayload(sanitizePayloadPII(reasoningOmitted));
}

export function serializePayloadForStorage(payload: unknown, maxLength = 65536): string | null {
  if (payload === null || payload === undefined) return null;

  const exact = JSON.stringify(payload);
  if (exact.length <= maxLength) {
    return exact;
  }

  return JSON.stringify({
    _truncated: true,
    _originalSize: exact.length,
    _preview: exact.slice(0, maxLength),
  });
}

export function parseStoredPayload(value: unknown): unknown | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  try {
    return JSON.parse(value);
  } catch {
    return { _rawText: value };
  }
}
