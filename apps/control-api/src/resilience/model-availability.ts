import {
  clearModelLock,
  getAllModelLockouts,
  type ModelLockoutInfo,
} from "@shiguang-gateway/open-sse/services/accountFallback";

export type AvailabilityReportItem = Pick<
  ModelLockoutInfo,
  "provider" | "model" | "reason" | "remainingMs" | "failureCount"
> & { connectionId: string };

export function getAvailabilityReport(): AvailabilityReportItem[] {
  return getAllModelLockouts().map((entry) => ({
    provider: entry.provider,
    model: entry.model,
    connectionId: entry.connectionId,
    reason: entry.reason,
    remainingMs: entry.remainingMs,
    failureCount: entry.failureCount,
  }));
}

export function clearModelUnavailability(provider: string, model: string): boolean {
  const matching = getAllModelLockouts().filter(
    (entry) => entry.provider === provider && entry.model === model
  );
  let cleared = false;
  for (const entry of matching) {
    if (clearModelLock(provider, entry.connectionId, model)) cleared = true;
  }
  return cleared;
}

export function resetAllAvailability(): void {
  for (const entry of getAllModelLockouts()) {
    clearModelLock(entry.provider, entry.connectionId, entry.model);
  }
}
