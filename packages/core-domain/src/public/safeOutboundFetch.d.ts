import type { OutboundUrlGuardMode } from "@shiguang-gateway/network-guard";

export type SafeOutboundFetchGuard = OutboundUrlGuardMode;
export type SafeOutboundFetchErrorCode =
  | "INVALID_URL"
  | "URL_GUARD_BLOCKED"
  | "TIMEOUT"
  | "REDIRECT_BLOCKED"
  | "NETWORK_ERROR";

export interface SafeOutboundFetchRetryOptions {
  attempts?: number;
  backoffMs?: number | number[];
  methods?: string[];
  statusCodes?: number[];
}

export interface SafeOutboundFetchOptions extends RequestInit {
  timeoutMs?: number;
  allowRedirect?: boolean;
  retry?: SafeOutboundFetchRetryOptions | false;
  guard?: SafeOutboundFetchGuard;
  proxyConfig?: unknown;
  bypassProxyPatch?: boolean;
}

export const SAFE_OUTBOUND_FETCH_PRESETS: Record<string, SafeOutboundFetchOptions>;

export class SafeOutboundFetchError extends Error {
  code: SafeOutboundFetchErrorCode;
  url: string;
  method: string;
  attempts: number;
  isRetryable: boolean;
  timeoutMs?: number;
  status?: number;
  location?: string | null;
}

export function safeOutboundFetch(
  url: string | URL,
  options?: SafeOutboundFetchOptions,
): Promise<Response>;
export function getSafeOutboundFetchErrorStatus(error: unknown): number | null;
