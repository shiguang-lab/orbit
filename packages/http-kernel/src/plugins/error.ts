/**
 * 错误信封：与 Shiguang Gateway src/lib/api/errorResponse.ts 行为一致。
 * 响应形状：{error:{type,message,details}, requestId}
 * type 未传时按 status 推断：>=500→server_error, 404→not_found, 409→conflict, 否则 invalid_request。
 */
import type { FastifyInstance, FastifyError } from "fastify";

export interface ApiErrorBody {
  error: {
    type: "invalid_request" | "not_found" | "conflict" | "server_error" | string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

export function errorTypeForStatus(status: number): ApiErrorBody["error"]["type"] {
  if (status >= 500) return "server_error";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  return "invalid_request";
}

export function createErrorResponse(
  status: number,
  message: string,
  type?: ApiErrorBody["error"]["type"],
  details?: unknown,
  requestId?: string,
): { status: number; body: ApiErrorBody } {
  return {
    status,
    body: {
      error: {
        type: type ?? errorTypeForStatus(status),
        message,
        ...(details !== undefined ? { details } : {}),
      },
      ...(requestId ? { requestId } : {}),
    },
  };
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err, request, reply) => {
    const requestId = (request as { id?: string }).id;
    const e = err as FastifyError & { validation?: Array<{ instancePath: string; message?: string }> };
    // Fastify 校验错误(400) → invalid_request
    if (e.validation) {
      return reply.status(400).send({
        error: {
          type: "invalid_request",
          message: e.message ?? "Invalid request",
          details: e.validation.map((v) => ({ field: v.instancePath, message: v.message })),
        },
        ...(requestId ? { requestId } : {}),
      });
    }
    const status = e.statusCode && e.statusCode >= 400 ? e.statusCode : 500;
    if (status >= 500) {
      app.log.error(e);
    }
    return reply.status(status).send({
      error: { type: errorTypeForStatus(status), message: e.message ?? "Internal Server Error" },
      ...(requestId ? { requestId } : {}),
    });
  });
}
