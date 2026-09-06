export interface HealthStatus {
  nodeId: string;
  prefix: string;
  isHealthy: boolean;
  lastCheck: Date;
  lastError?: string;
  consecutiveFailures: number;
  responseTimeMs?: number;
}

export function getAllHealthStatuses(): Record<string, HealthStatus>;
