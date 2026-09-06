export function extractApiKey(request: unknown, opts?: { allowUrl?: boolean }): string | null;
export function isValidApiKey(apiKey: string): Promise<boolean>;
