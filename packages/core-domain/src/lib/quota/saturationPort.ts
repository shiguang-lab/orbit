import type { QuotaUnit, QuotaWindow } from "./dimensions.js";

export interface QuotaSaturationRuntime {
  getSaturation(
    connectionId: string,
    provider: string,
    dimension: { unit: QuotaUnit; window: QuotaWindow },
    connection?: Record<string, unknown>,
  ): Promise<number>;
}

let runtime: QuotaSaturationRuntime = {
  async getSaturation() {
    return 0;
  },
};

export function registerQuotaSaturationRuntime(next: QuotaSaturationRuntime): void {
  runtime = next;
}

export function getSaturation(
  connectionId: string,
  provider: string,
  dimension: { unit: QuotaUnit; window: QuotaWindow },
  connection?: Record<string, unknown>,
): Promise<number> {
  return runtime.getSaturation(connectionId, provider, dimension, connection);
}
