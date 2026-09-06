/**
 * @shiguang-gateway/config
 * 共享配置：从环境变量解析，BFF 与 admin 复用同一套语义。
 */

export interface ShiguangGatewayConfig {
  /** Public origin of this independent deployment. */
  publicBaseUrl: string;
  /** Optional internal origin for service-to-service callbacks. */
  internalBaseUrl: string;
  /** shiguang 统一登录 origin(登录页属于 shiguang website) */
  unifiedLoginOrigin: string;
  /** 是否启用本地开发免登录(仅 dev) */
  devBypassAuth: boolean;
}

export function resolveConfig(env: Record<string, string | undefined> = {}): ShiguangGatewayConfig {
  return {
    publicBaseUrl: env.PUBLIC_BASE_URL ?? env.VITE_PUBLIC_BASE_URL ?? "http://127.0.0.1:8787",
    internalBaseUrl: env.INTERNAL_BASE_URL ?? "http://127.0.0.1:8787",
    unifiedLoginOrigin: env.VITE_UNIFIED_LOGIN_ORIGIN ?? "https://shiguanglab.com",
    devBypassAuth: env.VITE_DEV_BYPASS_AUTH === "1",
  };
}

/**
 * Node 侧(BFF)配置：直接读 process.env。
 * 注意：Vite 的 import.meta.env 是浏览器专用，Node 下不可用。
 */
export function resolveNodeConfig(): ShiguangGatewayConfig {
  return resolveConfig(process.env as Record<string, string | undefined>);
}

export * from "./dataPaths.js";
export * from "./oauth.js";
export * from "./logEnv.js";
