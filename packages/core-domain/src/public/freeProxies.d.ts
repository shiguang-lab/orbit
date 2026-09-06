export type FreeProxySourceId = "1proxy" | "proxifly" | "iplocate" | "webshare";
export interface FreeProxyRecord {
  id: string;
  source: FreeProxySourceId;
  host: string;
  port: number;
  type: string;
  countryCode: string | null;
  qualityScore: number | null;
  latencyMs: number | null;
  anonymity: string | null;
  lastValidated: string | null;
  inPool: boolean;
  poolProxyId: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface FreeProxyStats {
  total: number;
  inPool: number;
  avgQuality: number | null;
  bySource: Array<{ source: string; count: number }>;
  lastSyncAt: string | null;
}
export type FreeProxySyncErrors = Record<string, string[]>;
export function listFreeProxies(options?: {
  sources?: FreeProxySourceId[];
  protocol?: string;
  country?: string;
  minQuality?: number;
  onlyInPool?: boolean;
  onlyNotInPool?: boolean;
  search?: string;
  sortBy?: "quality" | "latency" | "recent";
  limit?: number;
  offset?: number;
}): Promise<FreeProxyRecord[]>;
export function countFreeProxies(options?: {
  sources?: FreeProxySourceId[];
  protocol?: string;
  country?: string;
  minQuality?: number;
  onlyInPool?: boolean;
  onlyNotInPool?: boolean;
  search?: string;
}): Promise<number>;
export function getFreeProxyById(id: string): Promise<FreeProxyRecord | null>;
export function promoteFreeProxyToPool(
  id: string,
  payload: { name: string; type: string; host: string; port: number; source: string },
): Promise<string | null>;
export function deleteFreeProxy(id: string): Promise<boolean>;
export function clearFreeProxiesBySource(source: FreeProxySourceId): Promise<number>;
export function getFreeProxyStats(): Promise<FreeProxyStats>;
export function getEnabledProviders(): FreeProxyProvider[];
export function getFreeProxySyncErrors(): Promise<FreeProxySyncErrors>;

export interface FreeProxyProvider {
  readonly id: FreeProxySourceId;
  readonly name: string;
  isEnabled(): boolean;
  sync(): Promise<{ fetched: number; added: number; updated: number; errors: string[] }>;
  list(filters: {
    protocol?: string;
    country?: string;
    minQuality?: number;
    limit?: number;
  }): Promise<unknown[]>;
}
export function getAllProviders(): FreeProxyProvider[];
export function getProvider(id: FreeProxySourceId): FreeProxyProvider | undefined;
export interface FreeProxySyncCycleResult {
  results: Record<string, unknown>;
  lastSyncAt: string;
}
export function runFreeProxySyncCycle(providers?: FreeProxyProvider[]): Promise<FreeProxySyncCycleResult>;
export function isFreeProxyAutoSyncEnabled(env?: Record<string, string | undefined>): boolean;
export function getFreeProxyAutoSyncIntervalMs(env?: Record<string, string | undefined>): number;
