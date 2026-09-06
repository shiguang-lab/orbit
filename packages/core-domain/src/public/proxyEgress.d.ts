export interface ProxyValidationResult {
  proxyId: string;
  host: string;
  port: number | string;
  alive: boolean;
  egressIp: string | null;
  latencyMs: number;
  previousStatus: string | null;
  newStatus: "active" | "error";
}
export function diagnoseAllEgressIps(): Promise<Record<string, unknown>>;
export function getRecentEgressSharingSummary(): Promise<{
  summary: Record<string, unknown>;
  warnings: Array<Record<string, unknown>>;
}>;
export function validateProxyPool(): Promise<ProxyValidationResult[]>;
