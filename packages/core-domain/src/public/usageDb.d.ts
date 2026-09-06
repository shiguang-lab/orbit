export function saveCallLog(entry: Record<string, unknown>): Promise<void>;
export function saveRequestUsage(entry: Record<string, any>): Promise<void>;
export function trackPendingRequest(
  model: string,
  provider: string,
  connectionId: string | null,
  started: boolean,
  metadata?: Record<string, any>,
): string | undefined;
export function appendRequestLog(entry: {
  model?: string;
  provider?: string;
  connectionId?: string;
  tokens?: unknown;
  status?: string | number;
}): Promise<void>;
export function getRecentLogs(limit?: number): Promise<string[]>;
export function getCallLogs(filter?: Record<string, unknown>): Promise<any[]>;
export function getCallLogById(id: string): Promise<any | null>;
export function exportCallLogsSince(since: string): Promise<any[]>;
export function getPendingById(): Map<string, any>;
export function getCompletedDetails(): Map<string, any>;
export function getUsageStats(): Promise<any>;
export function getModelLatencyStats(options?: {
  windowHours?: number;
  minSamples?: number;
  maxRows?: number;
  provider?: string;
  model?: string;
}): Promise<Record<string, any>>;
