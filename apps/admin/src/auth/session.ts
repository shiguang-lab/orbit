/**
 * 认证/SSO 层：纯 shiguang 统一登录(完全仿 asset-hub apps/web/src/auth/session.ts)。
 *
 * 流程：
 *  1. requireAuthSession() 调 /api/auth/session(带 cookie，由 BFF/网关注入身份)
 *  2. 未登录 → 整页跳转 shiguanglab.com/login?return_to=<当前URL>(登录页属于 shiguang website)
 *  3. 登录成功后父域 cookie(__Secure-sg_session) 对子域生效，回跳后 session 可用
 *
 * 登录页由 shiguang website 提供，本应用不渲染任何登录表单。
 */
const DEFAULT_LOGIN_ORIGIN = "https://shiguanglab.com";

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

/** 统一登录页地址：本机回环走同源 /login(vite proxy 转发到 shiguang)，线上跳 shiguanglab.com */
export function unifiedLoginUrl(location: BrowserLocation = window.location): string {
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
 *  - 未登录(401/非200) → 整页跳转 shiguang 统一登录页，返回 null
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
