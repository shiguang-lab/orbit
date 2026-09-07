/**
 * CSRF 保护：移植自 Orbit Orbit src/shared/utils/dashboardCsrf.ts。
 *
 * Orbit 管理接口使用网关签名的 X-SG-Identity 会话；
 * mutating 请求需带 x-orbit-csrf 头。
 * token 从 GET /api/auth/csrf 获取，按 expiresAt 缓存 + 单飞去重。
 */

export const DASHBOARD_CSRF_HEADER = "x-orbit-csrf";

interface CsrfResponse {
  token: string;
  expiresAt?: number;
}

let cachedToken: string | null = null;
let cachedExpiresAt = 0;
let pendingToken: Promise<string> | null = null;

/** 公开/免 CSRF 的路径前缀与精确路径（与后端 publicApiRoutes.ts 对齐，取核心部分） */
const PUBLIC_PREFIXES = ["/api/v1/"];
const PUBLIC_EXACT = new Set([
  "/api/auth/logout",
  "/api/auth/csrf",
  "/api/init",
]);

export function isPublicApiRoute(pathname: string, method: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  // 客户端 LLM API 路径不归管理 cookie 管，也免 CSRF
  if (/^\/v1\//.test(pathname) || pathname.startsWith("/api/v1/")) return true;
  void method;
  return false;
}

export function needsCsrf(pathname: string, method: string): boolean {
  if (!/^\/api\//.test(pathname)) return false;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;
  return !isPublicApiRoute(pathname, method);
}

async function fetchCsrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf", { credentials: "same-origin" });
  if (!response.ok) throw new Error(`CSRF token 获取失败 (${response.status})`);
  const body = (await response.json()) as CsrfResponse;
  return body.token;
}

/** 单飞 + 过期前 30s 续取 */
export async function getCsrfToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < cachedExpiresAt - 30_000) return cachedToken;
  if (pendingToken) return pendingToken;
  pendingToken = fetchCsrfToken()
    .then((token) => {
      cachedToken = token;
      cachedExpiresAt = now + 10 * 60_000;
      return token;
    })
    .finally(() => {
      pendingToken = null;
    });
  return pendingToken;
}

/** 给单个 fetch 请求附加 CSRF 头（内部由 api client 统一调用） */
export async function withCsrfHeader(
  init: RequestInit,
  pathname: string,
): Promise<RequestInit> {
  const method = (init.method ?? "GET").toUpperCase();
  if (!needsCsrf(pathname, method)) return init;
  const headers = new Headers(init.headers);
  if (headers.has(DASHBOARD_CSRF_HEADER)) return init;
  const token = await getCsrfToken();
  headers.set(DASHBOARD_CSRF_HEADER, token);
  return { ...init, headers };
}
