/**
 * 引擎 shim 类型声明：让 tsc 在编译期把 `@/*` 引擎模块视为 any。
 * 运行时由 tsx 通过 tsconfig paths 解析到真实 Orbit 源码(已验证可行)。
 * 这样 BFF 的 typecheck 只严格检查自身源码，引擎作为运行时依赖不强类型约束。
 */
declare module "@/*" {
  const value: any;
  export default value;
  export = value;
}

declare module "@omniroute/open-sse/*" {
  const value: any;
  export default value;
  export = value;
}

declare module "@omniroute/open-sse" {
  const value: any;
  export default value;
  export = value;
}

declare module "@/sse/services/auth" {
  export function isValidApiKey(apiKey: string): Promise<boolean>;
  export function extractApiKey(...args: unknown[]): string | null;
}

declare module "@/lib/db/apiKeys" {
  export function getApiKeyMetadata(apiKey: string): Promise<{ scopes: string[]; name?: string } | null>;
  export function getApiKeys(limit?: number, offset?: number): Promise<unknown[]>;
  export function getApiKeysCount(): number;
  export function getApiKeyById(id: string): Promise<unknown | null>;
  export function createApiKey(
    name: string,
    machineId: string,
    scopes?: string[],
    options?: { allowedConnections?: string[] },
  ): Promise<{ key: string; id: string }>;
  export function regenerateApiKey(id: string): Promise<{ id: string; key: string } | null>;
  export function updateApiKeyPermissions(id: string, update: Record<string, unknown>): Promise<unknown>;
  export function deleteApiKey(id: string): Promise<boolean>;
}

declare module "@/shared/utils/machineId" {
  export function getConsistentMachineId(salt?: string | null): Promise<string>;
}

declare module "@/lib/apiKeyExposure" {
  export function isApiKeyRevealEnabled(): boolean;
  export function maskStoredApiKey(key: string): string;
}

declare module "@/lib/db/secrets" {
  export function getPersistedSecret(key: string): string | null;
  export function persistSecret(key: string, value: string): void;
}

declare module "@/lib/db/providers" {
  export function getProviderConnections(filter: Record<string, unknown>, limit?: number, offset?: number): Promise<unknown[]>;
  export function getProviderConnectionsCount(filter: Record<string, unknown>): number;
  export function getProviderNodes(filter?: Record<string, unknown>, limit?: number, offset?: number): Promise<unknown[]>;
  export function getProviderNodesCount(filter?: Record<string, unknown>): number;
  export function getProviderConnectionById(id: string): Promise<unknown | null>;
  export function createProviderConnection(data: Record<string, unknown>): Promise<unknown>;
  export function updateProviderConnection(id: string, data: Record<string, unknown>): Promise<unknown>;
  export function deleteProviderConnection(id: string): Promise<boolean>;
  export function deleteProviderConnections(ids: string[]): Promise<number>;
  export function maskStoredApiKey(key: string): string;
  export function sanitizeProviderSpecificDataForResponse(data: unknown): unknown;
}

declare module "@/lib/providers/requestDefaults" {
  export function sanitizeProviderSpecificDataForResponse(value: unknown): Record<string, unknown> | undefined;
}

declare module "@/lib/localDb" {
  export function getSettings(): Promise<Record<string, unknown>>;
}

declare module "@/lib/auth/managementPassword" {
  export function getStoredManagementPassword(settings: Record<string, unknown>): Promise<string | null>;
  export function verifyManagementPassword(password: string, storedHash: string): Promise<boolean>;
}
