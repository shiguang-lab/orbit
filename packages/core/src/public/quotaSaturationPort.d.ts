export interface QuotaSaturationRuntime {
  getSaturation(
    connectionId: string,
    provider: string,
    dimension: { unit: "percent" | "requests" | "tokens" | "usd"; window: "5h" | "hourly" | "daily" | "weekly" | "monthly" },
    connection?: Record<string, unknown>,
  ): Promise<number>;
}

export declare function registerQuotaSaturationRuntime(runtime: QuotaSaturationRuntime): void;
export declare function getSaturation(
  connectionId: string,
  provider: string,
  dimension: Parameters<QuotaSaturationRuntime["getSaturation"]>[2],
  connection?: Record<string, unknown>,
): Promise<number>;
