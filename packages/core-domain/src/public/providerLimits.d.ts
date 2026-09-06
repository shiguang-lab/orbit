export function fetchAndPersistProviderLimits(
  connectionId: string,
  source?: "manual" | "scheduled",
  options?: { allowRotatingRefresh?: boolean },
): Promise<{ connection: Record<string, unknown>; usage: Record<string, unknown>; cache: Record<string, unknown> }>;
export function shouldClearErrorStateOnValidProbe(
  connection: { rateLimitedUntil?: string | number | null },
  probeValid: boolean,
  now?: number,
): boolean;
