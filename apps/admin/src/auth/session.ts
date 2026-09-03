/**
 * Dashboard authentication.
 *
 * 流程：
 *  1. requireAuthSession() 调 /api/auth/session(带 cookie，由 BFF/网关注入身份)
 *  2. 默认未登录 → Orbit 自己的 /login，使用官方 password/OIDC flow。
 *  3. 只有显式启用 VITE_AUTH_MODE=shiguang 时才跳转统一登录站点。
 *
 * 官方模式的登录页由本应用渲染，凭证仍由 Orbit API 处理。
 */
const DEFAULT_LOGIN_ORIGIN = "https://shiguanglab.com";
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE ?? "official";
const USE_UNIFIED_LOGIN = AUTH_MODE === "shiguang";

type BrowserLocation = Pick<
  Location,
  "hash" | "href" | "hostname" | "origin" | "pathname" | "search"
>;

interface UnifiedSessionResponse {
  authenticated?: boolean;
  subject?: string;
  displayName?: string;
  email?: string;
  preferredUsername?: string;
  organization?: { id: string; name: string } | null;
  roles?: string[];
  platformRoles?: string[];
  entitlements?: string[];
  user?: {
    id: string;
    username: string;
    tenantType?: "user" | "org";
    tenantId?: string;
    orgId?: string;
    orgRoles?: string[];
  };
}

export interface AuthSession {
  id: string;
  displayName: string;
  email: string | null;
  roles: string[];
  platformRoles: string[];
}

let activeSession: AuthSession | null = null;
let redirecting = false;

export function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function currentReturnTo(location: BrowserLocation): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

/** Resolve the login page for the selected authentication mode. */
export function unifiedLoginUrl(location: BrowserLocation = window.location): string {
  if (!USE_UNIFIED_LOGIN) {
    const returnTo = currentReturnTo(location);
    return `${location.origin}/login?return_to=${encodeURIComponent(returnTo)}`;
  }
  const local = isLoopbackHost(location.hostname);
  const loginOrigin = local
    ? location.origin
    : (import.meta.env.VITE_UNIFIED_LOGIN_ORIGIN ?? DEFAULT_LOGIN_ORIGIN).replace(/\/$/, "");
  const returnTo = local ? currentReturnTo(location) : location.href;
  return `${loginOrigin}/login?return_to=${encodeURIComponent(returnTo)}`;
}

export function redirectToUnifiedLogin(location: BrowserLocation = window.location): void {
  if (redirecting) return;
  redirecting = true;
  window.location.replace(unifiedLoginUrl(location));
}

export function getAuthSession(): AuthSession | null {
  return activeSession;
}

export function setAuthSession(session: AuthSession | null): void {
  activeSession = session;
}

export class BrokerUnavailableError extends Error {
  constructor() {
    super("本地 SSO Broker 不可用，请检查线上 auth-service 配置或关闭 Broker 模式");
    this.name = "BrokerUnavailableError";
  }
}

/**
 * 会话探测：render 前调用。
 *  - /api/auth/session 返回 authenticated → 返回 session
 *  - 未登录(401/非200) → 跳转当前模式的登录页，返回 null
 */
export async function requireAuthSession(): Promise<AuthSession | null> {
  let body: UnifiedSessionResponse | null = null;
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (response.status === 503) {
      let code = "";
      try {
        code = ((await response.json()) as { error?: string }).error ?? "";
      } catch {
        // Keep the stable status-based error below.
      }
      if (code === "local_broker_unavailable") throw new BrokerUnavailableError();
    }
    if (response.ok) {
      body = (await response.json()) as UnifiedSessionResponse;
    }
  } catch {
    body = null;
  }

  if (!body) {
    redirectToUnifiedLogin();
    return null;
  }

  activeSession = normalizeSession(body);
  if (!activeSession) redirectToUnifiedLogin();
  return activeSession;
}

/** 轻量探测：不跳转，仅返回是否已登录(供组件初始化判断) */
export async function fetchAuthSession(): Promise<AuthSession | null> {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as UnifiedSessionResponse;
    activeSession = normalizeSession(body);
    return activeSession;
  } catch {
    return null;
  }
}

export async function performLogout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  } catch {
    // 远端登出失败也继续本地登出
  }
  activeSession = null;
  redirecting = false;
  redirectToUnifiedLogin();
}

function normalizeSession(body: UnifiedSessionResponse): AuthSession | null {
  if (body.user?.id) {
    return {
      id: body.user.id,
      displayName: body.user.username || body.user.id,
      email: null,
      roles: body.user.orgRoles ?? [],
      platformRoles: [],
    };
  }
  if (body.authenticated !== true || !body.subject) return null;
  return {
    id: body.subject,
    displayName: body.displayName?.trim() || body.preferredUsername?.trim() || body.subject,
    email: body.email?.trim() || null,
    roles: body.roles ?? [],
    platformRoles: body.platformRoles ?? [],
  };
}
