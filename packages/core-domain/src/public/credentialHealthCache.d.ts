export function isCredentialHealthy(connectionId: string): boolean | undefined;
export function isCredentialStale(connectionId: string): boolean;
export function getCredentialHealthSummary(): {
  total: number;
  healthy: number;
  failed: number;
  unknown: number;
  stale: number;
};
