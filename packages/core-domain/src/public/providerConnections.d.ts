export interface ProviderConnectionSummary {
  provider?: unknown;
  isActive?: boolean;
  refreshToken?: string | null;
  testStatus?: string | null;
  lastError?: string | null;
  lastErrorType?: string | null;
  lastHealthCheckAt?: string | null;
  [key: string]: unknown;
}

export function getProviderConnections(
  filter?: Record<string, unknown>,
  limit?: number,
  offset?: number,
): any[];
export function getProviderConnectionById(id: string): Promise<ProviderConnectionSummary | null>;
export function createProviderConnection(data: Record<string, unknown>): Promise<{ id?: unknown } | null>;
export function getProviderConnectionById(id: string): Promise<Record<string, unknown> | null>;
export function updateProviderConnection(
  id: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown> | null>;
export function deleteProviderConnectionsByProvider(providerId: string): Promise<unknown>;
export function getRawProviderConnections(
  filter?: Record<string, unknown>,
  limit?: number,
  offset?: number,
  columns?: string[],
): Promise<Record<string, unknown>[]>;
export function getProviderConnectionsCount(filter?: Record<string, unknown>): number;
export function setConnectionRateLimitUntil(connectionId: string, until: number | null): void;
export function updateCodexScopedQuotaState(
  id: string,
  scope: "codex" | "spark",
  patch: {
    quotaState?: Record<string, unknown>;
    exhaustedWindow?: "5h" | "7d" | null;
    rateLimitedUntil?: string;
    rateLimitSource?: "fallback" | "quota_reset";
  },
): Promise<Record<string, unknown> | null>;
export function updateCodexScopeCooldown(
  id: string,
  scope: "codex" | "spark",
  rateLimitedUntil: string,
): Promise<Record<string, unknown> | null>;
export { touchConnectionLastUsed } from "../lib/db/providers.js";
