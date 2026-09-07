export interface ComplianceCleanupResult {
  deletedUsage: number;
  deletedCallLogs: number;
  deletedProxyLogs: number;
  deletedRequestDetailLogs: number;
  deletedAuditLogs: number;
  deletedMcpAuditLogs: number;
  trimmedCallLogs: number;
  trimmedProxyLogs: number;
  appRetentionDays: number;
  callRetentionDays: number;
  callLogsMaxRows: number;
  proxyLogsMaxRows: number;
}

export function initAuditLog(): void;
export function cleanupExpiredLogs(): Promise<ComplianceCleanupResult>;
