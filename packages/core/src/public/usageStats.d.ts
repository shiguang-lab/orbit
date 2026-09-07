export interface UsageBucket {
  requests: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
}

export interface UsageBreakdown extends UsageBucket {
  rawModel?: string;
  provider?: string;
  lastUsed?: string;
  connectionId?: string;
  accountName?: string;
  apiKeyId?: string | null;
  apiKeyName?: string;
  historicalApiKeyNames?: string[];
}

export interface PendingRequestCounts {
  byModel: Record<string, number>;
  byAccount: Record<string, Record<string, number>>;
}

export interface UsageStats {
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCost: number;
  byProvider: Record<string, UsageBreakdown>;
  byModel: Record<string, UsageBreakdown>;
  byAccount: Record<string, UsageBreakdown>;
  byApiKey: Record<string, UsageBreakdown>;
  last10Minutes: UsageBucket[];
  pending: PendingRequestCounts;
  activeRequests: Array<{ model: string; provider: string; account: string; count: number }>;
}

export function getMonthlyProviderTokensForConnection(provider: string, connectionId: string): number;
export function getConnectionSpendUsdSinceAdded(
  provider: string,
  connectionId: string,
): Promise<{ costUsd: number; requests: number }>;
export function getUsageStats(): Promise<UsageStats>;
