export type ProxyConfig = { type?: string; host?: string; port?: string | number; username?: string; password?: string };
export declare const RELAY_TYPES: ReadonlySet<string>;
export declare function isRelayType(type: string | undefined | null): boolean;
export declare function isSocks5ProxyEnabled(): boolean;
export declare function proxyConfigToUrl(config: ProxyConfig, options?: { allowSocks5?: boolean }): string | null;
export declare function proxyUrlForLogs(url: string): string;
export declare function createProxyDispatcher(proxyUrl: string): any;
