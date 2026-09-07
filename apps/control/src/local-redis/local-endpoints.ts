import type { FastifyRequest } from "fastify";
import { isDirectLoopbackOrigin } from "../infrastructure/control-local-only.guard.js";

export interface LocalRequestContext {
  headers: FastifyRequest["headers"];
  peerIp: string;
}

export function isLocalRequestAllowed(
  context?: LocalRequestContext,
): { allowed: true } | { allowed: false; reason: string } {
  if (!context) return { allowed: false, reason: "request context unavailable" };
  if (!isDirectLoopbackOrigin(context.headers, context.peerIp)) {
    if (hasForwardingHeaders(context.headers)) {
      return { allowed: false, reason: "proxied origin" };
    }
    return { allowed: false, reason: "non-local origin" };
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.SHIGUANG_GATEWAY_LOCAL_ENDPOINTS_ENABLED !== "1"
  ) {
    return { allowed: false, reason: "disabled in production" };
  }
  return { allowed: true };
}

function hasForwardingHeaders(headers: FastifyRequest["headers"]): boolean {
  return headers.forwarded !== undefined ||
    headers["x-forwarded-for"] !== undefined ||
    headers["x-forwarded-host"] !== undefined ||
    headers["x-forwarded-proto"] !== undefined ||
    headers["x-real-ip"] !== undefined;
}
