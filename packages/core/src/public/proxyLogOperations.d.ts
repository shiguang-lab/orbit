export interface ProxyInfo {
  type: string;
  host: string;
  port: number | string;
}

export interface ProxyLogEntry {
  id: string;
  timestamp: string;
  status: string;
  proxy: ProxyInfo | null;
  level: string;
  levelId: string | null;
  provider: string | null;
  targetUrl: string | null;
  clientIp: string | null;
  egressIp: string | null;
  latencyMs: number;
  error: string | null;
  connectionId: string | null;
  comboId: string | null;
  account: string | null;
  tlsFingerprint: boolean;
}

export type ProxyLogInput = Partial<ProxyLogEntry> & {
  publicIp?: string | null;
};

export interface ProxyLogFilters {
  status?: string;
  type?: string;
  provider?: string;
  level?: string;
  search?: string;
  limit?: number;
}

export function logProxyEvent(entry: ProxyLogInput): ProxyLogEntry;
export function getProxyLogs(filters?: ProxyLogFilters): ProxyLogEntry[];
export function clearProxyLogs(): void;
