import type { RequestQueueSettings } from "@shiguang-gateway/core-domain/resilience/settings";

export interface RateLimitStatus extends Record<string, unknown> {
  enabled: boolean;
  active: boolean;
  queued: number;
  running: number;
  executing?: number;
  done?: number;
}

export interface LearnedRateLimit {
  provider: string;
  connectionId: string;
  lastUpdated: number;
  limit?: number;
  remaining?: number;
  minTime?: number;
}

export function applyRequestQueueSettings(settings: RequestQueueSettings): Promise<void>;
export function getAllRateLimitStatus(): Record<
  string,
  { queued: number; running: number; executing: number }
>;
export function getLearnedLimits(): Record<string, LearnedRateLimit>;
export function enableRateLimitProtection(connectionId: string): void;
export function disableRateLimitProtection(connectionId: string): void;
export function refreshConnectionRateLimits(
  connectionId: string,
  overrides?: Record<string, number> | null,
): void;
export function getRateLimitStatus(provider: string, connectionId: string): RateLimitStatus;
export function withRateLimit<TResult>(
  provider: string,
  connectionId: string,
  model: string | null | undefined,
  operation: () => TResult | Promise<TResult>,
  signal?: AbortSignal | null,
): Promise<Awaited<TResult>>;
