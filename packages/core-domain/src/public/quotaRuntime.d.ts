export type EnforceDecision =
  | { kind: "allow"; deprioritize?: boolean }
  | { kind: "block"; reason: string; httpStatus: 429; retryAfterSeconds?: number };
export function isBucketSaturated(connectionId: string, windowKey: string, nowMs?: number): boolean;
export function canAffordRequest(
  connectionId: string,
  model: string,
  requestBody: Record<string, unknown> | null | undefined,
): Record<string, any>;
export function reserveQuota(
  connectionId: string,
  model: string,
  requestBody: Record<string, unknown> | null | undefined,
  options?: { tokenLimit?: number; windowMs?: number },
): void;
export function storeRateLimitHeaders(
  connectionId: string,
  provider: string,
  headers: Record<string, string>,
): void;
export function scheduleRecordConsumption(input: Record<string, any>, log?: any): void;
export function buildConsumptionCost(
  usage: unknown,
  estimatedCost: number,
): { tokens: number; usd: number; requests: number };
export function recordStreamingConsumption(input: Record<string, any>, log?: any): Promise<void>;
export function getSaturation(
  connectionId: string,
  provider: string,
  dimension: Record<string, any>,
  connection?: Record<string, unknown>,
): Promise<number>;
