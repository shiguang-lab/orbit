import { errorResponse, sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";

export function failure(error: unknown, status = 500): Response {
  return errorResponse(status, sanitizeErrorMessage(error instanceof Error ? error.message : String(error)));
}

export function invalid(message: string, details?: unknown): Response {
  return errorResponse(400, message, details === undefined ? undefined : { code: "validation", reason: JSON.stringify(details) });
}

export function notFound(message: string): Response {
  return errorResponse(404, message);
}
