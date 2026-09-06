export type ProxyValue = Record<string, unknown> | string | null;
export interface ProxyConfig {
  global: ProxyValue;
  providers: Record<string, ProxyValue>;
  combos: Record<string, ProxyValue>;
  keys: Record<string, ProxyValue>;
  [key: string]: unknown;
}

export function getProxyConfig(): Promise<ProxyConfig>;
export function getProxyForLevel(level: string, id?: string | null): Promise<ProxyValue>;
export function setProxyConfig(config: Record<string, unknown>): Promise<ProxyConfig>;
export function deleteProxyForLevel(level: string, id: string | null): Promise<ProxyConfig>;
