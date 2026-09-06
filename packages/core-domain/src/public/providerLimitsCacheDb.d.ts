import type { GrokBillingStatus } from "@shiguang-gateway/contracts/grok-billing";
import type { KimiBillingStatus } from "@shiguang-gateway/contracts/kimi-billing";

export type ProviderBillingStatus = GrokBillingStatus | KimiBillingStatus;

export interface ProviderLimitsCacheEntry {
  quotas: Record<string, unknown> | null;
  plan: unknown;
  message: string | null;
  fetchedAt: string;
  source?: string | null;
  bankedResetCredits?: number;
  billing?: ProviderBillingStatus;
}

export function getProviderLimitsCache(connectionId: string): ProviderLimitsCacheEntry | null;
export function getAllProviderLimitsCache(): Record<string, ProviderLimitsCacheEntry>;
export function setProviderLimitsCache(
  connectionId: string,
  entry: ProviderLimitsCacheEntry,
): ProviderLimitsCacheEntry;
export function setProviderLimitsCacheBatch(
  entries: Array<{ connectionId: string; entry: ProviderLimitsCacheEntry }>,
): number;
