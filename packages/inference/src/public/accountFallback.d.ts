export interface ModelLockoutInfo {
  provider: string;
  model: string;
  connectionId: string;
  reason: string;
  remainingMs: number;
  failureCount: number;
  lockedAt: string;
  until: number;
}
export function getAllModelLockouts(): ModelLockoutInfo[];
export function clearAllModelLockouts(): void;
export function clearModelLock(provider: string, connectionId: string, model: string): boolean;
export function clearProviderFailure(provider: string | null | undefined): void;
export function cooldownUntilMs(value: string | number | null | undefined): number;
export function getModelLockoutInfo(
  provider: string,
  connectionId: string,
  model: string | null | undefined,
): {
  reason: string;
  remainingMs: number;
  lockedAt: string;
  failureCount: number;
} | null;
export function isCreditsExhausted(errorText: string): boolean;
export function isDailyQuotaExhausted(errorText: string): boolean;
