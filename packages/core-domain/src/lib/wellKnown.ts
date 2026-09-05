import type { NextRequest } from "next/server";

/**
 * Derive the base URL for A2A agent card endpoints.
 * Prefers SHIGUANG_GATEWAY_BASE_URL env var for admin override; falls back to the
 * request's dynamic origin so the gateway works behind any hostname without
 * hardcoded localhost:8787 (S2 security fix).
 */
export function getBaseUrl(request?: NextRequest | null): string {
  if (process.env.SHIGUANG_GATEWAY_BASE_URL) return process.env.SHIGUANG_GATEWAY_BASE_URL;
  // Direct route-handler invocation (unit tests, programmatic calls) passes no
  // Request — fall back to the default local gateway origin instead of crashing.
  return request?.nextUrl?.origin ?? process.env.PUBLIC_BASE_URL ?? "http://127.0.0.1:8787";
}
