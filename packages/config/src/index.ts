/**
 * @omniroute/config
 * 共享配置：从环境变量解析，BFF 与 admin 复用同一套语义。
 */

export interface OmnirouteConfig {
  /** 旧后端(Orbit vendor)地址 */
  orbitApiUrl: string;
  /** shiguang 统一登录 origin(登录页属于 shiguang website) */
  unifiedLoginOrigin: string;
  /** 是否启用本地开发免登录(仅 dev) */
  devBypassAuth: boolean;
}

export function resolveConfig(env: Record<string, string | undefined> = {}): OmnirouteConfig {
  return {
    orbitApiUrl: env.OMNIROUTE_ORBIT_URL ?? "http://100.87.115.78:20128",
    unifiedLoginOrigin: env.VITE_UNIFIED_LOGIN_ORIGIN ?? "https://shiguanglab.com",
    devBypassAuth: env.VITE_DEV_BYPASS_AUTH === "1",
  };
}

/**
 * Node 侧(BFF)配置：直接读 process.env。
 * 注意：Vite 的 import.meta.env 是浏览器专用，Node 下不可用。
 */
export function resolveNodeConfig(): OmnirouteConfig {
  return resolveConfig(process.env as Record<string, string | undefined>);
}

