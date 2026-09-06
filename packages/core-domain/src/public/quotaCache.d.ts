export function isQuotaExhaustedForRequest(
  connectionId: string,
  provider: string,
  requestedModel?: string | null,
): boolean;
export function isAccountQuotaExhausted(connectionId: string): boolean;
export function getQuotaWindowStatus(
  connectionId: string,
  windowName: string,
  thresholdPercent?: number,
): Record<string, any> | null;
export function getQuotaCache(connectionId: string): Record<string, any> | null;
