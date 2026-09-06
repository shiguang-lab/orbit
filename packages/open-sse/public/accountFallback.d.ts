export interface ModelLockoutInfo {
  provider: string;
  model: string;
  connectionId: string;
  reason: string;
  remainingMs: number;
  failureCount: number;
}
export function getAllModelLockouts(): ModelLockoutInfo[];
export function clearAllModelLockouts(): void;
export function clearModelLock(provider: string, connectionId: string, model: string): boolean;
export function clearProviderFailure(provider: string | null | undefined): void;
export function cooldownUntilMs(value: string | number | null | undefined): number;
