export function knownProviders(): string[];
export function getKnownPlan(provider: string): any;
export function resolvePlan(connectionId: string, provider: string): any;
export function resolveConnectionProvider(connectionId: string): Promise<string>;
export function resolveQuotaKeyScope(allowedQuotas: string[]): Promise<{ poolSlugs: string[] }>;
export function filterModelsToQuotaPools(candidates: Array<{ id: string }>, poolSlugs: string[]): Array<{ id: string }>;
export function syncQuotaCombos(poolId: string): Promise<void>;
export function removeQuotaCombosForPool(poolId: string): Promise<void>;
export function reconcilePoolExclusivity(
  poolId: string,
  prevApiKeyIds: string[],
  nextApiKeyIds: string[],
  exclusive: boolean
): Promise<void>;
export function getQuotaStore(): Promise<any>;
export function resetQuotaStoreSingleton(): void;
export function enforceQuotaShare(params: any): Promise<any>;
export interface PoolUsageSnapshot {
  poolId: string;
  [key: string]: any;
}
