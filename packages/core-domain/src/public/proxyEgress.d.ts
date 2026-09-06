export interface EgressSharingWarning {
  egressIp: string;
  rotationGroup: string;
  connections: string[];
}
export interface EgressSharingSummary {
  windowStart: string;
  windowEnd: string;
  distinctEgressIps: number;
  sharingByRotationGroup: Array<{
    rotationGroup: string;
    sharedIps: number;
    maxAccountsSharingOneIp: number;
  }>;
  maxAccountsSharingOneIp: number;
}
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
  summary: EgressSharingSummary;
  warnings: EgressSharingWarning[];
}>;
export function validateProxyPool(): Promise<ProxyValidationResult[]>;
