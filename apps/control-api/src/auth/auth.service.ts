import { Injectable } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { issueDashboardCsrfToken } from "@shiguang-gateway/auth";

import { isDashboardSessionAuthenticated } from "@shiguang-gateway/auth/dashboard-session";

@Injectable()
export class AuthService {
  async csrf(request: FastifyRequest, reply: FastifyReply) {
    reply.header("cache-control", "no-store");
    if (!(await isDashboardSessionAuthenticated(request))) {
      return reply.status(401).send({ error: "Authentication required" });
    }
    const token = await issueDashboardCsrfToken(request);
    if (!token) return reply.status(503).send({ error: "CSRF signing is not configured" });
    return reply.send(token);
  }

  /** Revoke the actual SSO session in auth-service and forward its cookie removal. */
  async logout(request: FastifyRequest, reply: FastifyReply) {
    reply.header("cache-control", "no-store");
    const origin = request.headers.origin;
    const host = request.headers.host;
    if (!origin || !URL.canParse(origin) || new URL(origin).host !== host) {
      return reply.status(403).send({ error: "invalid_origin" });
    }
    const authOrigin = process.env.SG_AUTH_ORIGIN ?? "https://shiguanglab.com";
    try {
      const response = await fetch(new URL("/api/auth/logout", authOrigin), {
        method: "POST",
        redirect: "error",
        headers: { Origin: origin, Cookie: request.headers.cookie ?? "", Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return reply.status(response.status).send({ error: "sso_logout_failed" });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) reply.header("set-cookie", cookies);
      return reply.status(200).send({ success: true });
    } catch {
      return reply.status(503).send({ error: "sso_logout_unavailable" });
    }
  }
}
