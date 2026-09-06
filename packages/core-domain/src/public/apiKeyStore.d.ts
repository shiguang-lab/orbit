export function getApiKeys(limit?: number, offset?: number): Promise<any[]>;
export function getApiKeysCount(): number;
export function createApiKey(name: string, machineId: string, scopes: string[], options?: { allowedConnections?: string[] }): Promise<any>;
export function pickApiKeyForInternalUse(reason?: string): Promise<string | null>;
export function updateApiKeyPermissions(id: string, payload: Record<string, unknown>): Promise<any>;
export function getApiKeyById(id: string): Promise<any | null>;
export function deleteApiKey(id: string): Promise<boolean>;
export function regenerateApiKey(id: string): Promise<{ id: string; key: string } | null>;
export class ApiKeyPolicyInvariantError extends Error {
  readonly code: string;
}
