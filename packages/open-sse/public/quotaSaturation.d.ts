export declare function storeRateLimitHeaders(
  connectionId: string,
  provider: string,
  headers: Record<string, string>,
): void;
export declare function installQuotaSaturationRuntimePort(): void;
export declare function getTokenHeaderSaturation(
  provider: string,
  connectionId: string,
): { saturation: number; resetAt: number | null } | null;
export declare function getSaturation(
  connectionId: string,
  provider: string,
  dimension: { unit: "percent" | "requests" | "tokens" | "usd"; window: "5h" | "hourly" | "daily" | "weekly" | "monthly" },
  connection?: Record<string, unknown>,
): Promise<number>;
