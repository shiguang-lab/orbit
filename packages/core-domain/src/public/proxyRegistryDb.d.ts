export type ProxyScope = "global" | "provider" | "account" | "combo";
export type ProxyRotationStrategy = "round-robin" | "random" | "sticky" | "latency";
export type RelayRepairMode = "noop" | "recovered" | "redeploy" | null;

export interface ProxyRegistryRecord {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  region: string | null;
  notes: string | null;
  status: string;
  source: string;
  family: string;
  subscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProxyPayload {
  name: string;
  type: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  region?: string | null;
  notes?: string | null;
  status?: string;
  source?: string;
  family?: string;
  subscriptionId?: string | null;
}

export interface ProxyAssignmentRecord {
  id: number;
  proxyId: string;
  scope: ProxyScope;
  scopeId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProxyMutationResult {
  proxy: ProxyRegistryRecord;
  assignment: ProxyAssignmentRecord | null;
}

export interface ResolvedRegistryProxy {
  proxy: {
    type: string;
    host: string;
    port: number;
    username?: string;
    password?: string;
    family: string;
    name?: string;
    relayAuth?: string;
  };
  level: ProxyScope;
  levelId: string | null;
  source: "registry";
}

export interface ProxyHealthStats {
  proxyId: string;
  name: string;
  type: string;
  host: string;
  port: number;
  status: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  timeoutCount: number;
  successRate: number | null;
  avgLatencyMs: number | null;
  lastSeenAt: string | null;
}

export function extractRelayAuth(notes: unknown): string | undefined;
export function redactProxySecrets(proxy: ProxyRegistryRecord): ProxyRegistryRecord;
export function isRelayProxyType(type: unknown): boolean;
export function isRelayAuthMissing(notes: unknown, type: unknown): boolean;
export function relayRepairMode(notes: unknown, type: unknown): RelayRepairMode;
export function listProxies(options?: {
  includeSecrets?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ items: ProxyRegistryRecord[]; total: number }>;
export function createProxy(payload: ProxyPayload): Promise<ProxyRegistryRecord | null>;
export function createProxyAndAssign(
  payload: ProxyPayload,
  assignment: { scope: string; scopeId?: string | null },
): Promise<ProxyMutationResult>;
export function updateProxy(
  id: string,
  payload: Partial<ProxyPayload>,
): Promise<ProxyRegistryRecord | null>;
export function updateProxyAndAssign(
  id: string,
  payload: Partial<ProxyPayload>,
  assignment: { scope: string; scopeId?: string | null },
): Promise<ProxyMutationResult | null>;
export function upsertProxy(
  payload: ProxyPayload,
): Promise<{ proxy: ProxyRegistryRecord | null; action: "created" | "updated" }>;
export function deleteProxyById(id: string, options?: { force?: boolean }): Promise<boolean>;
export function getProxyAssignments(filters?: {
  proxyId?: string;
  scope?: string;
}): Promise<ProxyAssignmentRecord[]>;
export function assignProxyToScope(
  scope: string,
  scopeId: string | null,
  proxyId: string | null,
): Promise<ProxyAssignmentRecord | null>;
export function addProxyToScopePool(
  scope: string,
  scopeId: string | null,
  proxyId: string,
): Promise<ProxyAssignmentRecord | null>;
export function removeProxyFromScopePool(
  scope: string,
  scopeId: string | null,
  proxyId: string,
): Promise<boolean>;
export function getScopeProxyPool(
  scope: string,
  scopeId?: string | null,
): Promise<ProxyAssignmentRecord[]>;
export function setScopeRotationStrategy(
  scope: string,
  scopeId: string | null,
  strategy: ProxyRotationStrategy | string,
  options?: { stickyWindowMinutes?: number },
): Promise<ProxyRotationStrategy>;
export function getScopeRotationStrategy(
  scope: string,
  scopeId?: string | null,
): Promise<ProxyRotationStrategy>;
export function resolveProxyForScopeFromRegistry(
  scope: string,
  scopeId?: string | null,
): Promise<ResolvedRegistryProxy | null>;
export function getProxyHealthStats(options?: { hours?: number }): Promise<ProxyHealthStats[]>;
export function bulkAssignProxyToScope(
  scope: string,
  scopeIds: string[],
  proxyId: string | null,
): Promise<{ updated: number; failed: Array<{ scopeId: string; reason: string }> }>;
export function migrateLegacyProxyConfigToRegistry(options?: {
  force?: boolean;
}): Promise<{
  migrated: number;
  skipped: boolean;
  reason?: "registry_not_empty";
}>;
