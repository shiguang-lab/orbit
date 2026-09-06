export interface CredentialHealthStatus {
  connectionId: string;
  provider: string;
  status: "active" | "error" | "unknown";
  lastTested: Date;
  lastError?: string;
  lastErrorType?: string;
  lastErrorSource?: string;
  consecutiveFailures: number;
  responseTimeMs?: number;
}
export interface CredentialCacheEntry {
  status: CredentialHealthStatus;
  expiresAt: number;
}
export function getCredentialHealth(connectionId: string): CredentialHealthStatus | undefined;
export function setCredentialHealth(
  connectionId: string,
  provider: string,
  status: "active" | "error" | "unknown",
  lastError?: string,
  lastErrorType?: string,
  lastErrorSource?: string,
  responseTimeMs?: number,
): void;
export function removeCredentialHealth(connectionId: string): void;
export function initCredentialCache(): void;
export function isCredentialHealthy(connectionId: string): boolean | undefined;
export function isCredentialStale(connectionId: string): boolean;
export function getAllCredentialHealth(): Record<string, CredentialHealthStatus>;
export function getCredentialHealthSummary(): {
  total: number;
  healthy: number;
  failed: number;
  unknown: number;
  stale: number;
};
