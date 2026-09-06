export function runWithProxyContext<T>(proxyConfig: unknown, fn: () => Promise<T>, options?: unknown): Promise<T>;
export function runWithProxyContextOrDirect<T>(proxyConfig: unknown, fn: () => Promise<T>): Promise<T>;
