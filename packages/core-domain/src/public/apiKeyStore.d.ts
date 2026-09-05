export function getApiKeys(limit?: number, offset?: number): Promise<any[]>;
export function getApiKeysCount(): number;
export function createApiKey(name: string, machineId: string, scopes: string[], options?: { allowedConnections?: string[] }): Promise<any>;
export function updateApiKeyPermissions(id: string, payload: Record<string, unknown>): Promise<any>;
