export const CLOUD_URL: string | undefined;
export function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs?: number): Promise<Response>;
export function syncToCloud(machineId: string, createdKey?: unknown): Promise<unknown>;
