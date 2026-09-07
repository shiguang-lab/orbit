import type { ModelCooldownErrorPayload } from "@orbit/contracts";
import {
  sanitizeErrorMessage,
  sanitizeUpstreamDetails,
} from "./index.js";

export type ErrorInfo = {
  type: string;
  code: string;
};

export const ERROR_TYPES: Record<number, ErrorInfo> = {
  400: { type: "invalid_request_error", code: "bad_request" },
  401: { type: "authentication_error", code: "invalid_api_key" },
  402: { type: "billing_error", code: "payment_required" },
  403: { type: "permission_error", code: "insufficient_quota" },
  404: { type: "invalid_request_error", code: "model_not_found" },
  406: { type: "invalid_request_error", code: "model_not_supported" },
  410: { type: "invalid_request_error", code: "model_shutdown" },
  429: { type: "rate_limit_error", code: "rate_limit_exceeded" },
  499: { type: "client_disconnected", code: "client_disconnected" },
  500: { type: "server_error", code: "internal_server_error" },
  502: { type: "server_error", code: "bad_gateway" },
  503: { type: "server_error", code: "service_unavailable" },
  504: { type: "server_error", code: "gateway_timeout" },
};

export const DEFAULT_ERROR_MESSAGES: Record<number, string> = {
  400: "Bad request",
  401: "Invalid API key provided",
  402: "Payment required",
  403: "You exceeded your current quota",
  404: "Model not found",
  406: "Model not supported",
  410: "Model has been shut down",
  429: "Rate limit exceeded",
  499: "Client disconnected",
  500: "Internal server error",
  502: "Bad gateway - upstream provider error",
  503: "Service temporarily unavailable",
  504: "Gateway timeout",
};

export function getErrorInfo(statusCode: number): ErrorInfo {
  return (
    ERROR_TYPES[statusCode] ||
    (statusCode >= 500
      ? { type: "server_error", code: "internal_server_error" }
      : { type: "invalid_request_error", code: "" })
  );
}

export function getDefaultErrorMessage(statusCode: number): string {
  return DEFAULT_ERROR_MESSAGES[statusCode] || "An error occurred";
}

export interface ErrorResponseBody {
  error: {
    message: string;
    type?: string;
    code?: string;
    reason?: string;
  };
  upstream_details?: Record<string, unknown> | null;
}

export type ErrorBodyClassification = {
  type?: string;
  code?: string;
  reason?: string;
};

export function buildErrorBody(
  statusCode: number,
  message: string,
  upstreamDetails?: unknown,
  classification?: ErrorBodyClassification
): ErrorResponseBody {
  const errorInfo = getErrorInfo(statusCode);
  const safeMessage = sanitizeErrorMessage(message) || getDefaultErrorMessage(statusCode);
  const body: ErrorResponseBody = {
    error: {
      message: safeMessage,
      type: classification?.type ?? errorInfo.type,
      code: classification?.code ?? errorInfo.code,
      reason: classification?.reason,
    },
  };

  if (upstreamDetails !== undefined && upstreamDetails !== null) {
    const sanitized = sanitizeUpstreamDetails(upstreamDetails);
    if (sanitized !== null && typeof sanitized === "object" && !Array.isArray(sanitized)) {
      body.upstream_details = sanitized as Record<string, unknown>;
    }
  }

  return body;
}

export function errorResponse(
  statusCode: number,
  message: string,
  classification?: ErrorBodyClassification
): Response {
  return new Response(
    JSON.stringify(
      buildErrorBody(statusCode, sanitizeErrorMessage(message), undefined, classification)
    ),
    {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    }
  );
}

function normalizeRetryAfterSeconds(retryAfter?: string | number | Date | null): number {
  if (typeof retryAfter === "number" && Number.isFinite(retryAfter)) {
    if (retryAfter > 0 && retryAfter < 1_000_000_000) {
      return Math.max(Math.ceil(retryAfter), 1);
    }
    const retryTimeMs = new Date(retryAfter).getTime();
    if (Number.isFinite(retryTimeMs)) {
      return Math.max(Math.ceil((retryTimeMs - Date.now()) / 1000), 1);
    }
  }

  if (retryAfter instanceof Date || typeof retryAfter === "string") {
    const retryTimeMs = new Date(retryAfter).getTime();
    if (Number.isFinite(retryTimeMs)) {
      return Math.max(Math.ceil((retryTimeMs - Date.now()) / 1000), 1);
    }
  }
  return 1;
}

export function unavailableResponse(
  statusCode: number,
  message: string,
  retryAfter?: string | number | Date | null,
  retryAfterHuman?: string
): Response {
  const retryAfterSec = normalizeRetryAfterSeconds(retryAfter);
  const msg = retryAfterHuman ? `${message} (${retryAfterHuman})` : message;
  return new Response(JSON.stringify({ error: { message: msg } }), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfterSec),
    },
  });
}

export function providerCircuitOpenResponse(
  provider: string,
  retryAfter?: string | number | Date | null
): Response {
  const retryAfterSec = normalizeRetryAfterSeconds(retryAfter);
  return new Response(
    JSON.stringify({
      error: {
        message: `Provider ${provider} circuit breaker is open`,
        type: "server_error",
        code: "provider_circuit_open",
        provider,
        retry_after: retryAfterSec,
      },
    }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
        "X-Orbit-Provider-Breaker": "open",
      },
    }
  );
}

export function buildModelCooldownBody({
  model,
  retryAfterSec,
  retryAfterAt,
  credentialsCoolingCount,
}: {
  model?: string | null;
  retryAfterSec: number;
  retryAfterAt?: string | null;
  credentialsCoolingCount?: number | null;
}): ModelCooldownErrorPayload {
  const resolvedModel = typeof model === "string" && model.trim().length > 0 ? model.trim() : null;
  const resolvedRetryAfterAt =
    typeof retryAfterAt === "string" && retryAfterAt.length > 0 ? retryAfterAt : null;
  const resolvedCoolingCount =
    typeof credentialsCoolingCount === "number" &&
    Number.isFinite(credentialsCoolingCount) &&
    credentialsCoolingCount > 0
      ? Math.floor(credentialsCoolingCount)
      : null;

  return {
    error: {
      message: resolvedModel
        ? `All credentials for model ${resolvedModel} are cooling down`
        : "All credentials for the requested model are cooling down",
      type: "rate_limit_error",
      code: "model_cooldown",
      ...(resolvedModel ? { model: resolvedModel } : {}),
      reset_seconds: Math.max(Math.ceil(retryAfterSec), 1),
      ...(resolvedRetryAfterAt ? { retry_after: resolvedRetryAfterAt } : {}),
      ...(resolvedCoolingCount ? { credentials_cooling: resolvedCoolingCount } : {}),
    },
  };
}

export function modelCooldownResponse({
  model,
  retryAfter,
  retryAfterAt,
  credentialsCoolingCount,
}: {
  model?: string | null;
  retryAfter?: string | number | Date | null;
  retryAfterAt?: string | null;
  credentialsCoolingCount?: number | null;
}): Response {
  const retryAfterSec = normalizeRetryAfterSeconds(retryAfter);
  const resolvedRetryAfterAt =
    typeof retryAfterAt === "string" && retryAfterAt.length > 0
      ? retryAfterAt
      : typeof retryAfter === "string" && retryAfter.length > 0
        ? retryAfter
        : null;
  return new Response(
    JSON.stringify(
      buildModelCooldownBody({
        model,
        retryAfterSec,
        retryAfterAt: resolvedRetryAfterAt,
        credentialsCoolingCount,
      })
    ),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}
