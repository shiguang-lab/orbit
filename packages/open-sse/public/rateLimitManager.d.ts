export function applyRequestQueueSettings(settings: unknown): Promise<void>;
export function getAllRateLimitStatus(): Record<string, unknown>;
export function getLearnedLimits(): Record<string, unknown>;
export function enableRateLimitProtection(connectionId: string): void;
export function disableRateLimitProtection(connectionId: string): void;
export function refreshConnectionRateLimits(
  connectionId: string,
  overrides?: Record<string, number> | null,
): void;
