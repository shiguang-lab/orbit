export interface QuotaConsumptionCost {
  tokens?: number;
  usd?: number;
  requests?: number;
}

export interface RecordQuotaConsumptionInput {
  apiKeyId: string;
  connectionId: string;
  provider: string;
  model?: string;
  cost: QuotaConsumptionCost;
}

export interface QuotaConsumptionLogger {
  warn?(data: unknown, message?: string): void;
}

export interface StreamingQuotaConsumptionInput {
  apiKeyId?: string | null;
  connectionId?: string | null;
  provider?: string | null;
  model: string;
  streamUsage: unknown;
  streamStatus: number;
  serviceTier?: string;
}

export type QuotaCostResolver = (
  provider: string,
  model: string,
  usage: Record<string, number | undefined> | null | undefined,
  options: { serviceTier?: string },
) => Promise<number>;

export function scheduleRecordConsumption(
  input: RecordQuotaConsumptionInput,
  log?: QuotaConsumptionLogger | null,
): void;
export function buildConsumptionCost(
  usage: unknown,
  estimatedCost: number,
): { tokens: number; usd: number; requests: number };
export function recordStreamingConsumption(
  input: StreamingQuotaConsumptionInput,
  dependencies: {
    calculateCost: QuotaCostResolver;
    schedule?: (
      input: RecordQuotaConsumptionInput,
      log?: QuotaConsumptionLogger | null,
    ) => void;
    log?: QuotaConsumptionLogger | null;
  },
): Promise<void>;
