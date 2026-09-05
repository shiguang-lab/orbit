/**
 * Small, transport-only payload helpers used by the streaming package.
 *
 * These helpers intentionally do not import the persistence/domain layer. The
 * full call-log redaction pipeline lives with the application that owns
 * storage; open-sse only needs a safe parser and clone for upstream responses.
 */

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

export function cloneLogPayload<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
