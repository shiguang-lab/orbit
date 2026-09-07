export function configureIPFilter(config: Record<string, unknown>): void;
export function getIPFilterConfig(): any;
export function addToBlacklist(ip: string): void;
export function removeFromBlacklist(ip: string): void;
export function addToWhitelist(ip: string): void;
export function removeFromWhitelist(ip: string): void;
export function tempBanIP(ip: string, durationMs?: number, reason?: string): void;
export function removeTempBan(ip: string): void;
