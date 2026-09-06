import { Injectable } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import { issueDashboardCsrfToken } from "@shiguang-gateway/auth";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { getAuditRequestContext, logAuditEvent } from "@shiguang-gateway/core-domain/control/compliance";
import { ensurePersistentManagementPasswordHash, getStoredManagementPassword, verifyManagementPassword } from "@shiguang-gateway/core-domain/control/management-password";
import { getSettings, updateSettings } from "@shiguang-gateway/core-domain/control/settings";
import { isFeatureFlagEnabled } from "@shiguang-gateway/core-domain/control/feature-flags";
import { checkLoginGuard, clearLoginAttempts, recordLoginFailure } from "./login.guard.js";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { z } from "zod";

export type AuthResponse = { status: number; body?: unknown; location?: string; cookies?: string[]; headers?: Record<string, string> };
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const OIDC_STATE_MAX_AGE = 60 * 10;
const AUTHZ_HEADER_TRUSTED_PEER_IP = "x-shiguangGateway-trusted-peer-ip";
const loginSchema = z.object({ password: z.string().min(1, "Password is required").max(200) });
const jwksClientsCache: Record<string, ReturnType<typeof createRemoteJWKSet>> = {};

function readCookie(request: FastifyRequest, name: string): string | null {
  const raw = request.headers.cookie;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function requestOrigin(request: FastifyRequest): string {
  const forwardedProto = String(request.headers["x-forwarded-proto"] ?? "").split(",")[0].trim().toLowerCase();
  const host = String(request.headers.host ?? "control-api");
  return `${forwardedProto === "https" ? "https" : "http"}://${host}`;
}

function toWebRequest(request: FastifyRequest, body?: unknown): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers.set(name, value);
    else if (Array.isArray(value)) headers.set(name, value.filter((v): v is string => typeof v === "string").join(", "));
  }
  const url = `${requestOrigin(request)}${request.url}`;
  if (request.method === "GET" || request.method === "HEAD") return new Request(url, { method: request.method, headers });
  const encoded = body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body);
  if (encoded !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json");
  return new Request(url, { method: request.method, headers, body: encoded });
}

function cookie(name: string, value: string, options: { maxAge: number; secure: boolean }): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${options.maxAge}`];
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

function secureCookie(request: FastifyRequest): boolean {
  return process.env.AUTH_COOKIE_SECURE === "true" || requestOrigin(request).startsWith("https://");
}

function jwtSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET?.trim();
  return secret ? new TextEncoder().encode(secret) : null;
}

function sourceScope(addr: string | null | undefined): "loopback" | "private" | "public" | "unknown" {
  const value = String(addr ?? "").trim().toLowerCase();
  if (!value || value === "unknown") return "unknown";
  if (value === "::1" || value.startsWith("127.")) return "loopback";
  if (value.startsWith("10.") || value.startsWith("192.168.") || value.startsWith("169.254.") || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb")) return "private";
  if (value.startsWith("172.")) { const octet = Number.parseInt(value.split(".")[1] ?? "", 10); if (octet >= 16 && octet <= 31) return "private"; }
  return "public";
}

function timingSafeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function getJwksClient(uri: string) { return (jwksClientsCache[uri] ??= createRemoteJWKSet(new URL(uri))); }

@Injectable()
export class AuthService {
  async verifyAuthToken(token?: string | null): Promise<boolean> {
    const secret = jwtSecret();
    if (!token || !secret) return false;
    try { await jwtVerify(token, secret); return true; } catch { return false; }
  }

  async csrf(request: FastifyRequest): Promise<AuthResponse> {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (authError) return { status: authError.status, body: await authError.json() };
    return { status: 200, body: (await issueDashboardCsrfToken(request)) ?? { token: null, expiresAt: null }, headers: { "cache-control": "no-store" } };
  }

  async login(request: FastifyRequest, body: unknown): Promise<AuthResponse> {
    const auditContext = getAuditRequestContext(toWebRequest(request, body));
    const secret = jwtSecret();
    if (!secret) {
      logAuditEvent({ action: "auth.login.misconfigured", actor: "system", target: "dashboard-auth", resourceType: "auth_session", status: "failed", ipAddress: auditContext.ipAddress || undefined, requestId: auditContext.requestId, metadata: { reason: "missing_jwt_secret" } });
      return { status: 500, body: { error: "Server misconfigured: JWT_SECRET not set. Contact administrator." } };
    }
    const validation = validateBody(loginSchema, body);
    if (isValidationFailure(validation)) return { status: 400, body: { error: validation.error } };
    const password = typeof validation.data.password === "string" ? validation.data.password : "";
    if (!password) return { status: 400, body: { error: "Invalid password payload" } };
    try {
      const settings = await getSettings();
      const trustedPeerIp = process.env.SHIGUANG_GATEWAY_PEER_STAMP_TOKEN ? request.headers[AUTHZ_HEADER_TRUSTED_PEER_IP] : null;
      const clientIp = (Array.isArray(trustedPeerIp) ? trustedPeerIp[0] : trustedPeerIp) || auditContext.ipAddress || null;
      const oidcDisabledPassword = settings.oidcEnabled === true && (settings.oidcDisablePasswordLogin === true || isFeatureFlagEnabled("SHIGUANG_GATEWAY_OIDC_DISABLE_PASSWORD_LOGIN") || process.env.SHIGUANG_GATEWAY_OIDC_DISABLE_PASSWORD_LOGIN === "true" || process.env.OIDC_DISABLE_PASSWORD_LOGIN === "true");
      if (oidcDisabledPassword) {
        logAuditEvent({ action: "auth.login.password_disabled_by_oidc", actor: "anonymous", target: "dashboard-auth", resourceType: "auth_session", status: "failed", ipAddress: clientIp || undefined, requestId: auditContext.requestId, metadata: { reason: "password_login_disabled_when_oidc_active" } });
        return { status: 403, body: { error: "Password login is disabled when OIDC is active. Please sign in with OIDC." } };
      }
      const bruteForceEnabled = settings.bruteForceProtection !== false;
      const guardCheck = checkLoginGuard(clientIp, { enabled: bruteForceEnabled });
      if (!guardCheck.allowed) {
        logAuditEvent({ action: "auth.login.locked", actor: "anonymous", target: "dashboard-auth", resourceType: "auth_session", status: "failed", ipAddress: clientIp || undefined, requestId: auditContext.requestId, metadata: { retryAfterSeconds: guardCheck.retryAfterSeconds || 0 } });
        return { status: 429, body: { error: "Too many failed attempts. Try again later." }, headers: { "retry-after": String(guardCheck.retryAfterSeconds || 60) } };
      }
      const state = await ensurePersistentManagementPasswordHash({ settings, source: "auth.login" });
      const storedHash = getStoredManagementPassword(state.settings);
      if (!storedHash) {
        logAuditEvent({ action: "auth.login.setup_required", actor: "anonymous", target: "dashboard-auth", resourceType: "auth_session", status: "failed", ipAddress: auditContext.ipAddress || undefined, requestId: auditContext.requestId, metadata: { reason: "missing_persisted_password" } });
        return { status: 403, body: { error: "No password configured. Complete onboarding first.", needsSetup: true } };
      }
      if (await verifyManagementPassword(password, storedHash)) {
        const token = await new SignJWT({ authenticated: true }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30d").sign(secret);
        const secure = secureCookie(request);
        logAuditEvent({ action: "auth.login.success", actor: "admin", target: "dashboard-auth", resourceType: "auth_session", status: "success", ipAddress: auditContext.ipAddress || undefined, requestId: auditContext.requestId, metadata: { hasStoredPassword: Boolean(storedHash), passwordMigrated: state.migrated, secureCookie: secure } });
        clearLoginAttempts(clientIp);
        return { status: 200, body: { success: true }, cookies: [cookie("auth_token", token, { maxAge: AUTH_COOKIE_MAX_AGE, secure })] };
      }
      const failureDecision = recordLoginFailure(clientIp, { enabled: bruteForceEnabled });
      const scope = sourceScope(auditContext.ipAddress);
      logAuditEvent({ action: "auth.login.failed", actor: "anonymous", target: "dashboard-auth", resourceType: "auth_session", status: "failed", ipAddress: auditContext.ipAddress || undefined, requestId: auditContext.requestId, metadata: { reason: "invalid_password", sourceScope: scope, internalOrigin: scope === "loopback" || scope === "private" } });
      if (!failureDecision.allowed) return { status: 429, body: { error: "Too many failed attempts. Try again later." }, headers: { "retry-after": String(failureDecision.retryAfterSeconds || 60) } };
      return { status: 401, body: { error: "Invalid password" } };
    } catch (error) {
      console.error("[AUTH] Login failed:", error);
      logAuditEvent({ action: "auth.login.error", actor: "system", target: "dashboard-auth", resourceType: "auth_session", status: "failed", ipAddress: auditContext.ipAddress || undefined, requestId: auditContext.requestId, metadata: { message: error instanceof Error ? error.message : "unknown_error" } });
      return { status: 500, body: { error: "Internal server error" } };
    }
  }

  async logout(request: FastifyRequest): Promise<AuthResponse> {
    const auditContext = getAuditRequestContext(toWebRequest(request));
    logAuditEvent({ action: "auth.logout.success", actor: "admin", target: "dashboard-auth", resourceType: "auth_session", status: "success", ipAddress: auditContext.ipAddress || undefined, requestId: auditContext.requestId });
    return { status: 200, body: { success: true }, cookies: [cookie("auth_token", "", { maxAge: 0, secure: secureCookie(request) })] };
  }

  async oidcLogin(request: FastifyRequest): Promise<AuthResponse> {
    const settings = await getSettings();
    const issuer = typeof settings.oidcIssuer === "string" ? settings.oidcIssuer.trim().replace(/\/$/, "") : "";
    const clientId = typeof settings.oidcClientId === "string" ? settings.oidcClientId.trim() : "";
    const clientSecret = typeof settings.oidcClientSecret === "string" ? settings.oidcClientSecret.trim() : "";
    const scopes = Array.isArray(settings.oidcScopes) && settings.oidcScopes.length ? settings.oidcScopes.filter((s): s is string => typeof s === "string") : ["openid", "profile", "email"];
    const redirectPath = typeof settings.oidcRedirectPath === "string" && settings.oidcRedirectPath ? settings.oidcRedirectPath : "/api/auth/oidc/callback";
    if (settings.oidcEnabled !== true || !issuer || !clientId || !clientSecret) return { status: 400, body: { error: "OIDC is not configured. Use password login or configure OIDC in settings." } };
    let endpoint = `${issuer}/authorize`;
    try { const response = await fetch(`${issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(5000) }); if (response.ok) { const data = await response.json() as Record<string, unknown>; if (typeof data.authorization_endpoint === "string" && data.authorization_endpoint) endpoint = data.authorization_endpoint; } } catch { /* convention fallback */ }
    const state = crypto.randomUUID();
    const redirectUri = `${requestOrigin(request)}${redirectPath}`;
    const url = new URL(endpoint);
    url.searchParams.set("response_type", "code"); url.searchParams.set("client_id", clientId); url.searchParams.set("redirect_uri", redirectUri); url.searchParams.set("scope", scopes.join(" ")); url.searchParams.set("state", state);
    return { status: 302, location: url.toString(), cookies: [cookie("oidc_state", state, { maxAge: OIDC_STATE_MAX_AGE, secure: secureCookie(request) })] };
  }

  async oidcCallback(request: FastifyRequest): Promise<AuthResponse> {
    const origin = requestOrigin(request); const url = new URL(`${origin}${request.url}`);
    const errorRedirect = (reason: string): AuthResponse => ({ status: 302, location: `${origin}/login?oidc_error=${reason}` });
    const code = url.searchParams.get("code"); const returnedState = url.searchParams.get("state");
    if (!code || !returnedState) return errorRedirect("missing_code");
    const storedState = readCookie(request, "oidc_state");
    if (!storedState || !timingSafeCompare(storedState, returnedState)) return errorRedirect("invalid_state");
    const clearState = cookie("oidc_state", "", { maxAge: 0, secure: secureCookie(request) });
    const settings = await getSettings();
    const issuer = typeof settings.oidcIssuer === "string" ? settings.oidcIssuer.trim().replace(/\/$/, "") : "";
    const clientId = typeof settings.oidcClientId === "string" ? settings.oidcClientId.trim() : "";
    const clientSecret = typeof settings.oidcClientSecret === "string" ? settings.oidcClientSecret.trim() : "";
    const redirectPath = typeof settings.oidcRedirectPath === "string" && settings.oidcRedirectPath ? settings.oidcRedirectPath : "/api/auth/oidc/callback";
    if (settings.oidcEnabled !== true || !issuer || !clientId || !clientSecret) return { ...errorRedirect("not_configured"), cookies: [clearState] };
    const redirectUri = `${origin}${redirectPath}`; let tokenEndpoint = `${issuer}/token`; let jwksUri = `${issuer}/jwks`;
    try { const response = await fetch(`${issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(5000) }); if (response.ok) { const data = await response.json() as Record<string, unknown>; if (typeof data.token_endpoint === "string") tokenEndpoint = data.token_endpoint; if (typeof data.jwks_uri === "string") jwksUri = data.jwks_uri; } } catch { /* convention fallback */ }
    let tokenResponse: Response;
    try { tokenResponse = await fetch(tokenEndpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret }).toString(), signal: AbortSignal.timeout(10000) }); } catch { return { ...errorRedirect("token_exchange"), cookies: [clearState] }; }
    if (!tokenResponse.ok) return { ...errorRedirect("token_exchange"), cookies: [clearState] };
    let tokenData: unknown; try { tokenData = await tokenResponse.json(); } catch { return { ...errorRedirect("token_response"), cookies: [clearState] }; }
    const idToken = tokenData && typeof tokenData === "object" && typeof (tokenData as Record<string, unknown>).id_token === "string" ? String((tokenData as Record<string, unknown>).id_token) : "";
    if (!idToken) return { ...errorRedirect("no_id_token"), cookies: [clearState] };
    try {
      const { payload } = await jwtVerify(idToken, getJwksClient(jwksUri), { issuer, audience: clientId });
      const allowed = Array.isArray(settings.oidcAllowedSubjects) ? settings.oidcAllowedSubjects : [];
      if (allowed.length) { const sub = typeof payload.sub === "string" ? payload.sub : ""; const rec = payload as Record<string, unknown>; const email = rec.email_verified === true && typeof rec.email === "string" ? rec.email.toLowerCase() : ""; if (!allowed.some((value) => typeof value === "string" && (value === sub || (email && value.toLowerCase() === email)))) return { ...errorRedirect("subject_not_allowed"), cookies: [clearState] }; }
    } catch { return { ...errorRedirect("id_token_invalid"), cookies: [clearState] }; }
    try { await updateSettings({ setupComplete: true }); } catch { /* login remains valid */ }
    const secret = jwtSecret(); if (!secret) return { ...errorRedirect("server_misconfigured"), cookies: [clearState] };
    const token = await new SignJWT({ authenticated: true }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30d").sign(secret);
    return { status: 302, location: `${origin}/dashboard`, cookies: [clearState, cookie("auth_token", token, { maxAge: AUTH_COOKIE_MAX_AGE, secure: secureCookie(request) })] };
  }
}
