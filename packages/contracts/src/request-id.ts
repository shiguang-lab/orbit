/**
 * Generate a UUID v4 request identifier.
 *
 * Request-context propagation belongs to the HTTP runtime, but the identifier
 * format itself is a transport-neutral contract used by every application.
 */
export function generateRequestId(): string {
  return globalThis.crypto.randomUUID();
}
