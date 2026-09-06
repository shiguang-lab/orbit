import { Injectable } from "@nestjs/common";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { isAuthRequired, isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import { getServiceRow, getSupervisor, registerSupervisor, ServiceSupervisor } from "@shiguang-gateway/core-domain/control/embedded-services-lifecycle";
import { getOrCreateApiKey } from "@shiguang-gateway/core-domain/embedded-services/api-key";
import { decrypt } from "@shiguang-gateway/core-domain/db/encryption";
import { DARIO_DEFAULT_PORT, getDarioHomeDir, resolveSpawnArgs } from "@shiguang-gateway/core-domain/control/dario-installer";
import { getProviderConnections, getProviderConnectionById } from "@shiguang-gateway/core-domain/db/provider-connections";
import { sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";

const deleteSchema = z.object({ alias: z.string().trim().min(1).optional() });
const loginStartSchema = z.object({ alias: z.string().trim().min(1).optional() });
const loginCompleteSchema = z.object({ alias: z.string().min(1).max(200), code: z.string().min(1).max(4000) });
const importSchema = z.object({ connectionId: z.string().trim().min(1).optional(), alias: z.string().trim().min(1).optional() });
const aliasPattern = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const callbackPort = 3456;

function json(body: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(body, { status, headers });
}

@Injectable()
export class DarioAdminService {
  private async auth(request: Request): Promise<Response | null> {
    if (!(await isAuthRequired(request)) || (await isAuthenticated(request))) return null;
    return json({ error: "Unauthorized" }, 401);
  }

  private async token(): Promise<string | null> {
    const row = await getServiceRow("dario");
    if (!row?.apiKey) return null;
    return decrypt(typeof row.apiKey === "string" ? row.apiKey : null) || null;
  }

  private async forward(method: "GET" | "POST" | "DELETE", endpoint: string, body?: unknown): Promise<Response> {
    const token = await this.token();
    if (!token) return json({ error: "Dario admin token unavailable — is Dario installed and started?" }, 409);
    const host = process.env.DARIO_HOST || "127.0.0.1";
    const port = Number.parseInt(process.env.DARIO_PORT || String(DARIO_DEFAULT_PORT), 10);
    const url = `http://${host}:${port}${endpoint}`;
    try {
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15_000) });
      const text = await res.text();
      let payload: unknown;
      try { payload = text ? JSON.parse(text) : {}; } catch { payload = { error: text }; }
      return json(payload, res.status);
    } catch (error) {
      return json({ error: `Could not reach Dario admin API at ${url}: ${sanitizeErrorMessage(error instanceof Error ? error.message : String(error))}` }, 502);
    }
  }

  async accounts(request: Request): Promise<Response> {
    const auth = await this.auth(request); if (auth) return auth;
    return this.forward("GET", "/admin/accounts");
  }

  async deleteAccount(request: Request): Promise<Response> {
    const auth = await this.auth(request); if (auth) return auth;
    const url = new URL(request.url);
    let alias = url.searchParams.get("alias")?.trim() || "";
    if (!alias && request.body !== null) {
      try { const parsed = deleteSchema.safeParse(await request.json()); if (parsed.success && parsed.data.alias) alias = parsed.data.alias; } catch { /* invalid body handled below */ }
    }
    if (!alias) return json({ error: "alias required (?alias= or JSON body)" }, 400);
    return this.forward("DELETE", `/admin/accounts/${encodeURIComponent(alias)}`);
  }

  async loginStart(request: Request): Promise<Response> {
    const auth = await this.auth(request); if (auth) return auth;
    let body: z.infer<typeof loginStartSchema> = {};
    try { if (request.body !== null) { const parsed = loginStartSchema.safeParse(await request.json()); if (parsed.success) body = parsed.data; } }
    catch { return json({ error: "Invalid JSON body" }, 400); }
    return this.forward("POST", "/admin/login/start", body.alias ? { alias: body.alias } : {});
  }

  async loginComplete(request: Request): Promise<Response> {
    const auth = await this.auth(request); if (auth) return auth;
    let body: unknown; try { body = await request.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
    const parsed = loginCompleteSchema.safeParse(body);
    if (!parsed.success) return json({ error: parsed.error.message }, 400);
    return this.forward("POST", "/admin/login/complete", parsed.data);
  }

  async importCandidates(request: Request): Promise<Response> {
    const auth = await this.auth(request); if (auth) return auth;
    try {
      const connections = await getProviderConnections({ provider: "claude" });
      const eligible = (connections as Array<Record<string, unknown>>).filter((c) => c.authType === "oauth" && c.accessToken && c.refreshToken && c.isActive !== false).map((c) => {
        const psd = (c.providerSpecificData as Record<string, unknown>) || {};
        return { id: c.id, name: c.name || c.email || c.id, email: c.email || null, organizationType: psd.organizationType || null, organizationRateLimitTier: psd.organizationRateLimitTier || null };
      });
      return json({ connections: eligible });
    } catch (error) { return json({ error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }, 500); }
  }

  async importConnection(request: Request): Promise<Response> {
    const auth = await this.auth(request); if (auth) return auth;
    let raw: unknown; try { raw = await request.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
    const parsed = importSchema.safeParse(raw ?? {}); const input = parsed.success ? parsed.data : {};
    if (!input.connectionId) return json({ error: "connectionId is required" }, 400);
    const conn = await getProviderConnectionById(input.connectionId) as Record<string, unknown> | null;
    if (!conn) return json({ error: "Connection not found" }, 404);
    if (conn.provider !== "claude" || conn.authType !== "oauth") return json({ error: "Only OAuth 'claude' provider connections can be imported into Dario" }, 400);
    if (!conn.accessToken || !conn.refreshToken) return json({ error: "Connection is missing an access or refresh token" }, 400);
    const source = String(conn.email || input.connectionId).toLowerCase();
    const safe = source.replace(/[^a-z0-9_.-]/g, "-").replace(/^[^a-z0-9]+/, "") || "gateway";
    let alias = input.alias || `shiguangGateway-${safe}`.slice(0, 64); if (!aliasPattern.test(alias)) alias = `shiguangGateway-${safe}`.slice(0, 64);
    const expiresRaw = conn.expiresAt as string | number | undefined; const expires = expiresRaw ? new Date(expiresRaw).getTime() : NaN;
    const psd = (conn.providerSpecificData as Record<string, unknown>) || {};
    const creds = { alias, accessToken: conn.accessToken, refreshToken: conn.refreshToken, expiresAt: Number.isFinite(expires) ? expires : Date.now() + 3600_000, scopes: typeof conn.scope === "string" ? conn.scope.trim().split(/\s+/).filter(Boolean) : [], deviceId: typeof psd.deviceId === "string" && psd.deviceId ? psd.deviceId : crypto.randomUUID(), accountUuid: typeof psd.accountUUID === "string" && psd.accountUUID ? psd.accountUUID : crypto.randomUUID() };
    try {
      const accountsDir = path.join(getDarioHomeDir(), ".dario", "accounts"); fs.mkdirSync(accountsDir, { recursive: true, mode: 0o700 }); fs.writeFileSync(path.join(accountsDir, `${alias}.json`), JSON.stringify(creds, null, 2), { encoding: "utf8", mode: 0o600 });
      const supervisor = await this.supervisor(); try { await supervisor.stop(); } catch {} await supervisor.start();
      return json({ alias, imported: true, sourceConnectionId: input.connectionId, sourceEmail: (conn.email as string | null) || null });
    } catch (error) { return json({ error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }, 500); }
  }

  private async supervisor(): Promise<ServiceSupervisor> {
    const existing = getSupervisor("dario"); if (existing) return existing as ServiceSupervisor;
    const apiKey = await getOrCreateApiKey("dario"); const port = Number.parseInt(process.env.DARIO_PORT || String(callbackPort), 10);
    const supervisor = new ServiceSupervisor({ tool: "dario", port, spawnArgs: () => resolveSpawnArgs(apiKey, port), healthUrl: () => `http://127.0.0.1:${port}/health`, healthIntervalMs: 5000, stopTimeoutMs: 15000, logsBufferBytes: 5242880, probeBeforeSpawn: true });
    registerSupervisor(supervisor); return supervisor;
  }
}
