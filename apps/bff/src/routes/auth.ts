/**
 * 认证路由：迁移自 src/app/api/auth/{login,logout,status,csrf,oidc}。
 * 密码校验/暴力破解守卫通过引擎适配器注入(指向 vendor/orbit)。
 * 会话默认使用 Orbit 原生 auth_token；仅在显式 SSO 模式下由 shiguang 身份终结。
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { SignJWT } from "jose";
import { issueDashboardCsrfToken } from "../middleware/csrf.js";
import type { EngineAuthAdapter } from "../middleware/authz.js";
import { handleSession } from "../lib/session.js";
import type { LocalAuthBroker } from "../lib/broker.js";

export interface AuthEngine {
  verifyPassword(password: string): Promise<{ ok: boolean; needsSetup?: boolean }>;
  isLoginLocked(ip: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }>;
  isOidcActive(): Promise<boolean>;
  getRequireLogin(): Promise<{ authenticated: boolean; requireLogin: boolean; hasPassword: boolean; setupComplete: boolean; oidcEnabled: boolean; oidcDisablePasswordLogin: boolean }>;
}

export function authRoutes(
  app: FastifyInstance,
  opts: {
    engine?: AuthEngine & Partial<EngineAuthAdapter>;
    devBypass?: boolean;
    broker?: LocalAuthBroker;
    officialAuth?: boolean;
  } = {},
): void {
  const engine = opts.engine;
  const devBypass = opts.devBypass ?? false;
  const broker = opts.broker;
  const officialAuth = opts.officialAuth ?? false;

  /** GET /api/auth/session —— native Orbit session or opt-in shiguang session */
  app.get("/auth/session", async (request, reply) => {
    return handleSession(request, reply, devBypass, broker, officialAuth);
  });

  /** POST /api/auth/login —— Orbit's official password login */
  app.post("/auth/login", async (request, reply) => {
    const body = (request.body ?? {}) as { password?: unknown };
    const password = body.password;

    if (typeof password !== "string" || password.length === 0) {
      return reply.status(400).send({ error: "Invalid password payload" });
    }

    if (engine && (await engine.isOidcActive())) {
      return reply.status(403).send({
        error: "Password login is disabled when OIDC is active. Please sign in with OIDC.",
      });
    }

    if (engine) {
      const guard = await engine.isLoginLocked(request.ip);
      if (!guard.allowed) {
        return reply
          .status(429)
          .header("Retry-After", String(guard.retryAfterSeconds ?? 60))
          .send({ error: "Too many failed attempts. Try again later." });
      }
    }

    if (!engine) {
      // 无引擎时(骨架)：直接失败，避免假成功
      return reply.status(500).send({ error: "Engine not configured" });
    }

    const result = await engine.verifyPassword(password);
    if (!result.ok) {
      if (result.needsSetup) {
        return reply.status(403).send({ error: "No password configured. Complete onboarding first.", needsSetup: true });
      }
      return reply.status(401).send({ error: "Invalid password" });
    }

    // 签发 30 天 JWT cookie(与原逻辑一致)
    const forceSecureCookie = process.env.AUTH_COOKIE_SECURE === "true";
    const forwardedProto = String(request.headers["x-forwarded-proto"] ?? "").split(",")[0].trim().toLowerCase();
    const useSecureCookie = forceSecureCookie || forwardedProto === "https";

    const token = await new SignJWT({ authenticated: true })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));

    reply.header(
      "set-cookie",
      `auth_token=${token}; HttpOnly; ${useSecureCookie ? "Secure; " : ""}SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`,
    );
    return reply.status(200).send({ success: true });
  });

  /** POST /api/auth/logout */
  app.post("/auth/logout", async (_request, reply) => {
    reply.header("set-cookie", "auth_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
    return reply.status(200).send({ success: true });
  });

  /** GET /api/auth/status */
  app.get("/auth/status", async (_request, reply) => {
    // 鉴权插件已确认 JWT 有效才能到达这里(管理端点)；公开路由放行时返回未认证
    return reply.status(200).send({ authenticated: true });
  });

  /** GET /api/auth/csrf */
  app.get("/auth/csrf", async (request, reply) => {
    const token = await issueDashboardCsrfToken(request);
    if (!token) {
      return reply.status(401).send({ error: { type: "invalid_request", message: "Not authenticated" } });
    }
    return reply.status(200).send(token);
  });

  /** GET /api/settings/require-login */
  app.get("/settings/require-login", async (_request, reply) => {
    if (!engine) {
      return reply.status(200).send({
        authenticated: false,
        requireLogin: true,
        hasPassword: false,
        setupComplete: false,
        oidcEnabled: false,
        oidcDisablePasswordLogin: false,
      });
    }
    return reply.status(200).send(await engine.getRequireLogin());
  });
}
