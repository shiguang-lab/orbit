export function getRelayTokenByHash(hash: string): any;
export function checkRateLimit(tokenId: string, token: any): { allowed: boolean; resetIn: number };
export function recordRelayUsage(tokenId: string, input: Record<string, unknown>): void;
