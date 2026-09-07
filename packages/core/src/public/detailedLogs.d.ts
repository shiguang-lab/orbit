interface RequestDetailLog {
  id?: string;
  call_log_id?: string | null;
  timestamp?: string;
  client_request?: unknown | null;
  translated_request?: unknown | null;
  provider_response?: unknown | null;
  client_response?: unknown | null;
  provider?: string | null;
  model?: string | null;
  source_format?: string | null;
  target_format?: string | null;
  duration_ms?: number;
  api_key_id?: string | null;
  no_log?: boolean;
}

export function isDetailedLoggingEnabled(): Promise<boolean>;
export function getRequestDetailLogs(limit?: number, offset?: number): RequestDetailLog[];
export function getRequestDetailLogCount(): number;
