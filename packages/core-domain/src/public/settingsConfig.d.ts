export function getSettings(): Promise<Record<string, unknown>>;
export function updateSettings(patch: Record<string, unknown>): Promise<unknown>;
export function getProviderConnections(
  filter?: Record<string, unknown>,
  limit?: number,
  offset?: number,
): Record<string, unknown>[];
export function getCachedProviderNodes(filter?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
export function invalidateDbCache(
  scope?: "settings" | "pricing" | "connections" | "combos" | "nodes" | "model-capabilities",
  id?: string,
): void;
export function getCombos(limit?: number, offset?: number): Promise<Record<string, unknown>[]>;
export function getApiKeys(limit?: number, offset?: number): Promise<Record<string, unknown>[]>;
export function clearApiKeyCaches(): void;
export function getAllUsageHistory(): Record<string, unknown>[];
export function getAllDomainCostHistory(): Record<string, unknown>[];
export function getAllDomainBudgets(): Record<string, unknown>[];
export function getDbInstance(): any;
export function backupDbFile(reason?: string): any;
export interface LegacyJsonData {
  providerConnections?: Record<string, unknown>[];
  providerNodes?: Record<string, unknown>[];
  combos?: Record<string, unknown>[];
  apiKeys?: Record<string, unknown>[];
  settings?: Record<string, unknown>;
  modelAliases?: Record<string, unknown>;
  mitmAlias?: Record<string, unknown>;
  pricing?: Record<string, unknown>;
  customModels?: Record<string, unknown>;
  proxyConfig?: {
    global?: unknown;
    providers?: unknown;
    combos?: unknown;
    keys?: unknown;
  };
  usageHistory?: Record<string, unknown>[];
  domainCostHistory?: Record<string, unknown>[];
  domainBudgets?: Record<string, unknown>[];
}
export function runJsonMigration(
  db: any,
  data: LegacyJsonData,
): {
  connections: number;
  nodes: number;
  combos: number;
  apiKeys: number;
  usageHistory: number;
  domainCostHistory: number;
  domainBudgets: number;
};
