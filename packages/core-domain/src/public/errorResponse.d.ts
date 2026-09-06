export function buildErrorBody(status: number, message: string): Record<string, unknown>;
export function sanitizeErrorMessage(message: unknown): string;
export function createErrorResponse(payload: {
  status: number;
  message: string;
  type?: "invalid_request" | "not_found" | "conflict" | "server_error" | "upstream_error" | "timeout";
  details?: unknown;
}): Response;
export function createErrorResponseFromUnknown(error: unknown, fallbackMessage?: string): Response;
