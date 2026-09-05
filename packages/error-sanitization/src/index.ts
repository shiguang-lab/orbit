/**
 * Transport-neutral sanitization for errors returned by gateway applications.
 *
 * This module deliberately has no framework, persistence, provider, or runtime
 * dependencies. It is safe to use from both HTTP applications and the streaming
 * engine without importing the legacy core-domain tree.
 */

const MAX_ERROR_LEN = 4096;
const SOURCE_EXT = ["ts", "tsx", "js", "jsx", "mjs", "cjs"] as const;

function looksLikeAbsolutePath(token: string): boolean {
  // POSIX: "/<...>.ts" (optionally followed by :line[:col]).
  // Windows: "C:\\<...>.ts" or "C:/<...>.ts".
  if (token.length < 4 || token.length > 2048) return false;
  const isPosix = token.charCodeAt(0) === 0x2f;
  const isWindows =
    token.length > 2 && token.charCodeAt(1) === 0x3a && /[A-Za-z]/.test(token[0]);
  if (!isPosix && !isWindows) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0 || dot === token.length - 1) return false;
  const extension = token.slice(dot + 1).split(":", 1)[0].toLowerCase();
  return (SOURCE_EXT as readonly string[]).includes(extension);
}

/** Redact credentials and inline data URLs from attacker-controlled text. */
export function redactSensitiveErrorText(value: string): string {
  return value
    .replace(/data:[^,\s]+;base64,[A-Za-z0-9+/=_-]+/gi, "[REDACTED_DATA_URL]")
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [REDACTED]")
    .replace(
      /(["']?(?:api[_-]?key|access[_-]?token|authorization|cookie|secret)["']?\s*[:=]\s*["'])[^"']*(["'])/gi,
      "$1[REDACTED]$2",
    )
    .replace(
      /(["']?(?:api[_-]?key|access[_-]?token|authorization|cookie|secret)["']?\s*[:=]\s*)[^"',\s}]+/gi,
      "$1[REDACTED]",
    );
}

/**
 * Remove stack-trace tails, source paths, and credentials from an error message.
 * The bounded, token-based implementation avoids regex backtracking on hostile
 * provider responses.
 */
export function sanitizeErrorMessage(message: unknown): string {
  let value = typeof message === "string" ? message : String(message ?? "");
  if (value.length > MAX_ERROR_LEN) value = value.slice(0, MAX_ERROR_LEN);
  const newline = value.indexOf("\n");
  const firstLine = newline >= 0 ? value.slice(0, newline) : value;
  const parts = firstLine.split(/(\s+)/);
  for (let index = 0; index < parts.length; index += 1) {
    if (looksLikeAbsolutePath(parts[index])) parts[index] = "<path>";
  }
  return redactSensitiveErrorText(parts.join(""));
}

const BLOCKED_KEYS =
  /stack|trace|path|file|cwd|dir|password|secret|token|key|authorization|cookie/i;
const MAX_DEPTH = 4;

/**
 * Recursively project an upstream JSON value into a safe diagnostic payload.
 * Sensitive keys are dropped and nested data is bounded to prevent oversized
 * or credential-bearing error responses.
 */
export function sanitizeUpstreamDetails(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[truncated]";
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return sanitizeErrorMessage(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 32).map((entry) => sanitizeUpstreamDetails(entry, depth + 1));
  }
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (BLOCKED_KEYS.test(key)) continue;
      output[key] = sanitizeUpstreamDetails(entry, depth + 1);
    }
    return output;
  }
  return null;
}
