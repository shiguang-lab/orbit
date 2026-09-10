export interface QuotaInfo {
  remainingPercentage: number;
  resetAt: string | null;
  fractionReported?: boolean;
}

export interface QuotaCacheEntry {
  connectionId: string;
  provider: string;
  quotas: Record<string, QuotaInfo>;
  fetchedAt: number;
  exhausted: boolean;
  nextResetAt: string | null;
  windowDurationMs?: number | null;
}

export interface QuotaWindowStatus {
  remainingPercentage: number;
  usedPercentage: number;
  resetAt: string | null;
  reachedThreshold: boolean;
}

export const DEFAULT_QUOTA_THRESHOLD_PERCENT: 99;

export function isQuotaExhaustedForRequest(
  connectionId: string,
  provider: string,
  requestedModel?: string | null,
  providerSpecificData?: unknown,
): boolean;
export function isAccountQuotaExhausted(connectionId: string): boolean;
export function getQuotaWindowStatus(
  connectionId: string,
  windowName: string,
  thresholdPercent?: number,
): QuotaWindowStatus | null;
export function getQuotaCache(connectionId: string): QuotaCacheEntry | null;
export function hydrateCodexQuotaCacheForRequest(
  connection: {
    id: string;
    provider: string;
    providerSpecificData?: Readonly<Record<string, unknown>> | null;
  },
  requestedModel: string | null,
): void;
export function markAccountExhaustedFrom429(connectionId: string, provider: string): void;
export function setQuotaCache(
  connectionId: string,
  provider: string,
  rawQuotas: Record<string, unknown>,
): void;
