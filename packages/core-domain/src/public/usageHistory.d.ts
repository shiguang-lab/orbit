export interface UsageEntry {
  provider?: string | null;
  model?: string | null;
  tokens?: unknown;
  status?: string | null;
  success?: boolean;
  latencyMs?: number;
  timeToFirstTokenMs?: number;
  errorCode?: string | null;
  timestamp?: string;
  connectionId?: string | null;
  apiKeyId?: string | null;
  apiKeyName?: string | null;
  serviceTier?: string | null;
  service_tier?: string | null;
  comboStrategy?: string | null;
  combo_strategy?: string | null;
  endpoint?: string | null;
}

export function saveRequestUsage(entry: UsageEntry): Promise<void>;
