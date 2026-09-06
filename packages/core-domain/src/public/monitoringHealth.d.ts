export function buildMonitoringHealthSnapshot(): Promise<unknown>;
export function resetMonitoringCircuitBreakers(): Promise<number>;
export const EMPTY_MONITORING_HEALTH_SNAPSHOT: Readonly<Record<string, unknown>>;
