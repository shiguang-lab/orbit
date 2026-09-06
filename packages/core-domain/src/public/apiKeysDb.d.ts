export function getApiKeys(limit?: number, offset?: number): Promise<any[]>;
export function getApiKeyMetadata(key: string | null | undefined): Promise<any | null>;
export function validateApiKey(key: string | null | undefined): Promise<boolean>;
