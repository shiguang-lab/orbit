export const BACKGROUND_IDE_AUTH_TIMEOUT_MS: number;
export function renewCursorConnection(current: Record<string, unknown>, deps?: Record<string, unknown>): Promise<any>;
export function buildCursorRenewedUpdate(current: Record<string, unknown>, result: any, now: string): Record<string, unknown>;
export function runCursorRenewalExclusive<T>(connectionId: string, fn: () => Promise<T>): Promise<T>;
