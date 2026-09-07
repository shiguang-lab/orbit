/** Dashboard sign-in is owned by the unified SSO service. */
const DEFAULT_LOGIN_ORIGIN = "https://shiguanglab.com";
const LOGIN_ATTEMPT_KEY = "orbit:sso-redirect";

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

export function currentReturnTo(location: BrowserLocation): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

export function unifiedLoginUrl(location: BrowserLocation = window.location): string {
  const loginOrigin = (import.meta.env?.VITE_UNIFIED_LOGIN_ORIGIN ?? DEFAULT_LOGIN_ORIGIN).replace(/\/$/, "");
  const returnTo = location.pathname === "/login" ? `${location.origin}/dashboard` : location.href;
  return `${loginOrigin}/login?return_to=${encodeURIComponent(returnTo)}`;
}

export const DEV_DEFAULT_SESSION: AuthSession = {
  id: "local-dev-admin",
  displayName: "本地开发者 (Dev Admin)",
  email: "dev@orbit.local",
  roles: ["system:admin", "orbit:admin"],
  platformRoles: ["system:admin", "orbit:admin"],
};

export function redirectToUnifiedLogin(location: BrowserLocation = window.location): void {
  if (import.meta.env?.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === "1") return;
  if (redirecting) return;
  if (sessionStorage.getItem(LOGIN_ATTEMPT_KEY)) throw new SessionVerificationError();
  sessionStorage.setItem(LOGIN_ATTEMPT_KEY, "1");
  redirecting = true;
  window.location.replace(unifiedLoginUrl(location));
}

export function getAuthSession(): AuthSession | null {
  return activeSession;
}

export function setAuthSession(session: AuthSession | null): void {
  activeSession = session;
}

export class SessionVerificationError extends Error {
  readonly status?: number;
  constructor(status?: number) {
    super("SSO session verification failed");
    this.status = status;
    this.name = "SessionVerificationError";
  }
}

export function retryUnifiedLogin(): void {
  sessionStorage.removeItem(LOGIN_ATTEMPT_KEY);
  redirecting = false;
  redirectToUnifiedLogin();
}

/** Only an unauthenticated response starts SSO; outages and denial stay visible. */
export async function requireAuthSession(): Promise<AuthSession | null> {
  const isDev = Boolean(import.meta.env?.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === "1");
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (response.status === 401) {
      if (isDev) {
        activeSession = DEV_DEFAULT_SESSION;
        sessionStorage.removeItem(LOGIN_ATTEMPT_KEY);
        return activeSession;
      }
      activeSession = null;
      redirectToUnifiedLogin();
      return null;
    }
    if (!response.ok) {
      if (isDev) {
        activeSession = DEV_DEFAULT_SESSION;
        sessionStorage.removeItem(LOGIN_ATTEMPT_KEY);
        return activeSession;
      }
      throw new SessionVerificationError(response.status);
    }
    const body = (await response.json()) as UnifiedSessionResponse;
    activeSession = normalizeSession(body);
    if (!activeSession) {
      if (isDev) {
        activeSession = DEV_DEFAULT_SESSION;
        sessionStorage.removeItem(LOGIN_ATTEMPT_KEY);
        return activeSession;
      }
      if (body.authenticated === false) {
        redirectToUnifiedLogin();
        return null;
      }
      throw new SessionVerificationError();
    }
    sessionStorage.removeItem(LOGIN_ATTEMPT_KEY);
    return activeSession;
  } catch (err) {
    if (isDev) {
      activeSession = DEV_DEFAULT_SESSION;
      sessionStorage.removeItem(LOGIN_ATTEMPT_KEY);
      return activeSession;
    }
    throw err;
  }
}

let pendingRevalidation: Promise<AuthSession | null> | null = null;

/** Concurrent API failures share one fresh SSO check; only SSO rejection redirects. */
export function revalidateAuthSession(): Promise<AuthSession | null> {
  if (!pendingRevalidation) {
    pendingRevalidation = requireAuthSession().finally(() => { pendingRevalidation = null; });
  }
  return pendingRevalidation;
}

/** 轻量探测：不跳转，仅返回是否已登录(供组件初始化判断) */
export async function fetchAuthSession(): Promise<AuthSession | null> {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return import.meta.env?.DEV ? DEV_DEFAULT_SESSION : null;
    }
    const body = (await response.json()) as UnifiedSessionResponse;
    activeSession = normalizeSession(body);
    return activeSession ?? (import.meta.env?.DEV ? DEV_DEFAULT_SESSION : null);
  } catch {
    return import.meta.env?.DEV ? DEV_DEFAULT_SESSION : null;
  }
}

export async function performLogout(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new SessionVerificationError(response.status);
  activeSession = null;
  retryUnifiedLogin();
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
