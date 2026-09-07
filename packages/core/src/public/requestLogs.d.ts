export interface RequestLogEntry {
  model?: string;
  provider?: string;
  connectionId?: string;
  tokens?: unknown;
  status?: string | number;
}

export function appendRequestLog(entry: RequestLogEntry): Promise<void>;
export function getRecentLogs(limit?: number): Promise<string[]>;
