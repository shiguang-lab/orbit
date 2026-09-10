import { buildErrorBody, sanitizeUpstreamDetails } from "./error.ts";

interface SanitizedUpstreamErrorResponseOptions {
  status: number;
  rawBody: string;
  fallbackMessage: string;
  headers?: Record<string, string>;
}

export function buildSanitizedUpstreamErrorResponse({
  status,
  rawBody,
  fallbackMessage,
  headers,
}: SanitizedUpstreamErrorResponseOptions): Response {
  const trimmedBody = rawBody.trim();
  if (trimmedBody) {
    try {
      const parsedBody: unknown = JSON.parse(trimmedBody);
      const serializedBody = JSON.stringify(sanitizeUpstreamDetails(parsedBody));
      if (serializedBody !== undefined) {
        return new Response(serializedBody, {
          status,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
    } catch {
      // Plain text and HTML are opaque upstream diagnostics and are never echoed.
    }
  }
  return new Response(JSON.stringify(buildErrorBody(status, fallbackMessage)), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
