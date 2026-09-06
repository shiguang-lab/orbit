import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { fetch as undiciFetch } from "undici";
import {
  addProxyToScopePool,
  assignProxyToScope,
  bulkAssignProxyToScope,
  createProxy,
  createProxyAndAssign,
  deleteProxyById,
  getProxyAssignments,
  getProxyHealthStats,
  getScopeProxyPool,
  getScopeRotationStrategy,
  isRelayAuthMissing,
  isRelayProxyType,
  listProxies,
  redactProxySecrets,
  removeProxyFromScopePool,
  relayRepairMode,
  updateProxy,
  updateProxyAndAssign,
  upsertProxy,
  migrateLegacyProxyConfigToRegistry,
} from "@shiguang-gateway/core-domain/db/proxy-registry";
import { getProxyById } from "@shiguang-gateway/core-domain/db/proxies";
import { resolveProxyForConnection } from "@shiguang-gateway/core-domain/db/settings";
import { getRelayProbeStats } from "@shiguang-gateway/core-domain/db/relay-probe-stats";
import { decrypt } from "@shiguang-gateway/core-domain/db/encryption";
import { clearDispatcherCache } from "@shiguang-gateway/open-sse/utils/proxyDispatcher";
import { createProxyDispatcher, proxyConfigToUrl } from "@shiguang-gateway/open-sse/utils/proxyDispatcher";
import {
  bulkImportProxiesSchema,
  bulkProxyAssignmentSchema,
  createProxyRegistrySchema,
  proxyAssignmentSchema,
  proxyPoolMemberSchema,
  proxyRotationStrategySchema,
  updateProxyRegistrySchema,
} from "@shiguang-gateway/core-domain/shared/validation/schemas";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import {
  classifyProbeStatus,
  resolveHealthCheckStatusWrite,
  resolveProbeConcurrency,
  resolveProbeStaggerMs,
  resolveProbeTarget,
  waitForProbeSlot,
  resolveProviderProbeTarget,
} from "@shiguang-gateway/core-domain/shared/proxy-health";
import {
  diagnoseAllEgressIps,
  getRecentEgressSharingSummary,
  validateProxyPool,
} from "@shiguang-gateway/core-domain/shared/proxy-egress";
import { z } from "zod";

type ApiResult = Response;

export interface ProxyOperationResult {
  status: number;
  body: unknown;
}

const TEST_TIMEOUT_MS = 5000;
const TEST_URL = resolveProbeTarget();
const CONCURRENCY = resolveProbeConcurrency();
const STAGGER_MS = resolveProbeStaggerMs();

interface AutoTestResult {
  proxyId: string;
  host: string;
  port: number;
  alive: boolean;
  blockedByTarget?: boolean;
  latencyMs: number | null;
  error?: string;
}

async function testSingleProxy(proxy: {
  id: string;
  type: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  family?: string;
}): Promise<AutoTestResult> {
  let proxyUrl: string | null;
  try {
    proxyUrl = proxyConfigToUrl(proxy);
  } catch {
    proxyUrl = null;
  }
  if (!proxyUrl) {
    return {
      proxyId: proxy.id,
      host: proxy.host,
      port: proxy.port,
      alive: false,
      latencyMs: null,
      error: "Invalid proxy config (check type, host, port)",
    };
  }

  const start = Date.now();
  const providerTarget = await resolveProviderProbeTarget(proxy.id);
  const target = providerTarget ?? TEST_URL;
  const method = providerTarget ? "GET" : "HEAD";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
  try {
    const dispatcher = createProxyDispatcher(proxyUrl);
    const response = await undiciFetch(target, {
      method,
      signal: controller.signal,
      dispatcher,
      headers: { "User-Agent": "ShiguangGateway/1.0" },
    });
    const latencyMs = Date.now() - start;
    const outcome = classifyProbeStatus(response.status);
    const alive = outcome === "ok" || outcome === "blocked";
    const statusWrite = resolveHealthCheckStatusWrite(alive);
    if (statusWrite) await updateProxy(proxy.id, { status: statusWrite }).catch(() => {});
    return {
      proxyId: proxy.id,
      host: proxy.host,
      port: proxy.port,
      alive,
      ...(outcome === "blocked" ? { blockedByTarget: true } : {}),
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - start;
    const statusWrite = resolveHealthCheckStatusWrite(false);
    if (statusWrite) await updateProxy(proxy.id, { status: statusWrite }).catch(() => {});
    return {
      proxyId: proxy.id,
      host: proxy.host,
      port: proxy.port,
      alive: false,
      latencyMs,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function errorResponse(status: number, message: string, type?: string, details?: unknown): Response {
  return Response.json(
    {
      error: { message, type: type ?? (status === 404 ? "not_found" : status === 409 ? "conflict" : status >= 500 ? "server_error" : "invalid_request"), details },
      requestId: randomUUID(),
    },
    { status },
  );
}

function errorFromUnknown(error: unknown, fallback: string): Response {
  const value = error as { message?: unknown; status?: unknown; type?: unknown; details?: unknown };
  return errorResponse(
    Number(value?.status) || 500,
    typeof value?.message === "string" ? value.message : fallback,
    typeof value?.type === "string" ? value.type : undefined,
    value?.details,
  );
}

async function readJson(request: Request): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false, response: errorResponse(400, "Invalid JSON body") };
  }
}

/** Use cases for the operator-managed proxy registry and assignment pools. */
@Injectable()
export class ProxiesService {
  private async authorize(request: Request): Promise<Response | null> {
    return requireManagementAuth(request);
  }

  /** Legacy v1 management surface retained as an explicit control-api contract. */
  async managementList(request: Request): Promise<ApiResult> {
    const authError = await this.authorize(request);
    if (authError) return authError;
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");
      if (id && searchParams.get("where_used") === "1") {
        const assignments = await getProxyAssignments({ proxyId: id });
        return Response.json({ count: assignments.length, assignments });
      }
      if (id) {
        const proxy = await getProxyById(id, { includeSecrets: false });
        return proxy ? Response.json(proxy) : errorResponse(404, "Proxy not found", "not_found");
      }
      const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit") || 50)));
      const offset = Math.max(0, Number(searchParams.get("offset") || 0));
      const result = await listProxies({ includeSecrets: false, limit, offset });
      return Response.json({ items: result.items, page: { limit, offset, total: result.total } });
    } catch (error) {
      return errorFromUnknown(error, "Failed to load proxies");
    }
  }

  managementCreate(request: Request): Promise<ApiResult> {
    return this.create(request);
  }

  managementUpdate(request: Request): Promise<ApiResult> {
    return this.update(request);
  }

  managementRemove(request: Request): Promise<ApiResult> {
    return this.remove(request);
  }

  async managementAssignments(request: Request): Promise<ApiResult> {
    const authError = await this.authorize(request);
    if (authError) return authError;
    try {
      const params = new URL(request.url).searchParams;
      const resolveConnectionId = params.get("resolve_connection_id");
      if (resolveConnectionId) return Response.json(await resolveProxyForConnection(resolveConnectionId));
      const entries = await getProxyAssignments({
        proxyId: params.get("proxy_id") || undefined,
        scope: params.get("scope") || undefined,
      });
      const scopeId = params.get("scope_id");
      const filtered = scopeId ? entries.filter((entry) => entry.scopeId === scopeId) : entries;
      const limit = Math.max(1, Math.min(200, Number(params.get("limit") || 100)));
      const offset = Math.max(0, Number(params.get("offset") || 0));
      return Response.json({ items: filtered.slice(offset, offset + limit), page: { limit, offset, total: filtered.length } });
    } catch (error) {
      return errorFromUnknown(error, "Failed to load proxy assignments");
    }
  }

  managementUpdateAssignment(request: Request): Promise<ApiResult> {
    return this.updateAssignment(request);
  }

  managementBulkAssign(request: Request): Promise<ApiResult> {
    return this.bulkAssign(request);
  }

  async list(request: Request): Promise<ApiResult> {
    const authError = await this.authorize(request);
    if (authError) return authError;
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");
      const whereUsed = searchParams.get("whereUsed") === "1";
      if (id && whereUsed) {
        const assignments = await getProxyAssignments({ proxyId: id });
        return Response.json({ count: assignments.length, assignments });
      }
      if (id) {
        const proxy = await getProxyById(id, { includeSecrets: false });
        return proxy ? Response.json(proxy) : errorResponse(404, "Proxy not found", "not_found");
      }

      const raw = await listProxies({ includeSecrets: true });
      const items = raw.items.map((proxy) => ({
        ...redactProxySecrets(proxy),
        relayInfo: {
          isRelay: isRelayProxyType(proxy.type),
          authMissing: isRelayAuthMissing(proxy.notes, proxy.type),
          repairMode: relayRepairMode(proxy.notes, proxy.type),
        },
      }));
      return Response.json({
        items,
        total: raw.total,
        relayProbeStats: getRelayProbeStats(),
        socks5Enabled: !["false", "0", "no", "off"].includes((process.env.ENABLE_SOCKS5_PROXY ?? "").trim().toLowerCase()),
      });
    } catch (error) {
      return errorFromUnknown(error, "Failed to load proxies");
    }
  }

  async create(request: Request): Promise<ApiResult> {
    const authError = await this.authorize(request);
    if (authError) return authError;
    const parsed = await readJson(request);
    if (!parsed.ok) return parsed.response;
    try {
      const validation = validateBody(createProxyRegistrySchema, parsed.body);
      if (isValidationFailure(validation)) return errorResponse(400, validation.error.message, "invalid_request");
      const { assignment, ...proxyFields } = validation.data;
      if (assignment) {
        const result = await createProxyAndAssign(proxyFields, assignment);
        clearDispatcherCache();
        return Response.json({ ...result.proxy, assignment: result.assignment }, { status: 201 });
      }
      const created = await createProxy(proxyFields);
      return Response.json(created, { status: 201 });
    } catch (error) {
      return errorFromUnknown(error, "Failed to create proxy");
    }
  }

  async update(request: Request): Promise<ApiResult> {
    const authError = await this.authorize(request);
    if (authError) return authError;
    const parsed = await readJson(request);
    if (!parsed.ok) return parsed.response;
    try {
      const validation = validateBody(updateProxyRegistrySchema, parsed.body);
      if (isValidationFailure(validation)) return errorResponse(400, validation.error.message, "invalid_request");
      const { id, assignment, ...rawChanges } = validation.data;
      const changes = Object.fromEntries(Object.entries(rawChanges).filter(([, value]) => value !== undefined));
      if (assignment) {
        const result = await updateProxyAndAssign(id, changes, assignment);
        if (!result?.proxy) return errorResponse(404, "Proxy not found", "not_found");
        clearDispatcherCache();
        return Response.json({ ...result.proxy, assignment: result.assignment });
      }
      const updated = await updateProxy(id, changes);
      return updated ? Response.json(updated) : errorResponse(404, "Proxy not found", "not_found");
    } catch (error) {
      return errorFromUnknown(error, "Failed to update proxy");
    }
  }

  async remove(request: Request): Promise<ApiResult> {
    const authError = await this.authorize(request);
    if (authError) return authError;
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");
      if (!id) return errorResponse(400, "id is required");
      const deleted = await deleteProxyById(id, { force: searchParams.get("force") === "1" });
      return deleted ? Response.json({ success: true }) : errorResponse(404, "Proxy not found", "not_found");
    } catch (error) {
      return errorFromUnknown(error, "Failed to delete proxy");
    }
  }

  async assignments(request: Request): Promise<ApiResult> {
    const authError = await this.authorize(request);
    if (authError) return authError;
    try {
      const { searchParams } = new URL(request.url);
      const resolveConnectionId = searchParams.get("resolveConnectionId");
      if (resolveConnectionId) {
        // The connection resolver remains part of the shared DB capability;
        // assignment management itself is owned by control-api.
        const resolved = await resolveProxyForConnection(resolveConnectionId);
        return Response.json(resolved);
      }
      const entries = await getProxyAssignments({
        proxyId: searchParams.get("proxyId") || undefined,
        scope: searchParams.get("scope") || undefined,
      });
      const scopeId = searchParams.get("scopeId");
      const filtered = scopeId ? entries.filter((entry) => entry.scopeId === scopeId) : entries;
      return Response.json({ items: filtered, total: filtered.length });
    } catch (error) {
      return errorFromUnknown(error, "Failed to load proxy assignments");
    }
  }

  async updateAssignment(request: Request): Promise<ApiResult> {
    const authError = await this.authorize(request);
    if (authError) return authError;
    const parsed = await readJson(request);
    if (!parsed.ok) return parsed.response;
    try {
      const validation = validateBody(proxyAssignmentSchema, parsed.body);
      if (isValidationFailure(validation)) return errorResponse(400, validation.error.message, "invalid_request");
      const { scope, scopeId, proxyId } = validation.data;
      const assignment = await assignProxyToScope(scope, scopeId || null, proxyId || null);
      clearDispatcherCache();
      return Response.json({ success: true, assignment });
    } catch (error) {
      return errorFromUnknown(error, "Failed to update assignment");
    }
  }

  async health(request: Request): Promise<ApiResult> {
    const authError = await this.authorize(request);
    if (authError) return authError;
    try {
      const hours = Number(new URL(request.url).searchParams.get("hours") || 24);
      const items = await getProxyHealthStats({ hours });
      return Response.json({ items, total: items.length, windowHours: hours });
    } catch (error) {
      return errorFromUnknown(error, "Failed to load proxy health stats");
    }
  }

  private normalizeScope(scope: string): string {
    return scope === "key" ? "account" : scope;
  }

  async pool(request: Request): Promise<ApiResult> {
    const authError = await this.authorize(request);
    if (authError) return authError;
    try {
      const params = new URL(request.url).searchParams;
      const rawScope = params.get("scope");
      if (!rawScope) return errorResponse(400, "scope is required");
      const scope = this.normalizeScope(rawScope);
      const scopeId = params.get("scopeId");
      if (scope !== "global" && !scopeId?.trim()) return errorResponse(400, "scopeId is required for provider/account/combo/key scope");
      const normalizedScopeId = scope === "global" ? null : scopeId;
      const [members, strategy] = await Promise.all([getScopeProxyPool(scope, normalizedScopeId), getScopeRotationStrategy(scope, normalizedScopeId)]);
      return Response.json({ members, strategy, total: members.length });
    } catch (error) {
      return errorFromUnknown(error, "Failed to load proxy pool");
    }
  }

  private async poolMutation(request: Request, operation: "add" | "remove" | "strategy"): Promise<ApiResult> {
    const authError = await this.authorize(request);
    if (authError) return authError;
    const parsed = await readJson(request);
    if (!parsed.ok) return parsed.response;
    try {
      const schema = operation === "strategy" ? proxyRotationStrategySchema : proxyPoolMemberSchema;
      const validation = validateBody(schema, parsed.body);
      if (isValidationFailure(validation)) return errorResponse(400, validation.error.message, "invalid_request");
      const data = validation.data as Record<string, unknown>;
      const scope = this.normalizeScope(String(data.scope));
      const scopeId = (data.scopeId as string | null | undefined) || null;
      if (operation === "add") {
        const member = await addProxyToScopePool(scope, scopeId, String(data.proxyId));
        clearDispatcherCache();
        return Response.json({ success: true, member });
      }
      if (operation === "remove") {
        const removed = await removeProxyFromScopePool(scope, scopeId, String(data.proxyId));
        clearDispatcherCache();
        return Response.json({ success: true, removed });
      }
      const strategy = String(data.strategy);
      const applied = await import("@shiguang-gateway/core-domain/db/proxy-registry").then(({ setScopeRotationStrategy }) => setScopeRotationStrategy(scope, scopeId, strategy, { stickyWindowMinutes: data.stickyWindowMinutes as number | undefined }));
      clearDispatcherCache();
      return Response.json({ success: true, strategy: applied });
    } catch (error) {
      return errorFromUnknown(error, operation === "add" ? "Failed to add proxy to pool" : operation === "remove" ? "Failed to remove proxy from pool" : "Failed to set rotation strategy");
    }
  }

  addPoolMember(request: Request) { return this.poolMutation(request, "add"); }
  removePoolMember(request: Request) { return this.poolMutation(request, "remove"); }
  setPoolStrategy(request: Request) { return this.poolMutation(request, "strategy"); }

  async bulkAssign(request: Request): Promise<ApiResult> {
    const authError = await this.authorize(request);
    if (authError) return authError;
    const parsed = await readJson(request);
    if (!parsed.ok) return parsed.response;
    try {
      const validation = validateBody(bulkProxyAssignmentSchema, parsed.body);
      if (isValidationFailure(validation)) return errorResponse(400, validation.error.message, "invalid_request");
      const { scope, scopeIds, proxyId } = validation.data;
      const normalizedScope = this.normalizeScope(scope);
      const result = await bulkAssignProxyToScope(normalizedScope, scopeIds || [], proxyId || null);
      clearDispatcherCache();
      return Response.json({ success: true, scope: normalizedScope, requested: normalizedScope === "global" ? 1 : (scopeIds || []).length, updated: result.updated, failed: result.failed });
    } catch (error) {
      return errorFromUnknown(error, "Failed to run bulk assignment");
    }
  }

  async bulkImport(request: Request): Promise<ApiResult> {
    const authError = await this.authorize(request);
    if (authError) return authError;
    const parsed = await readJson(request);
    if (!parsed.ok) return parsed.response;
    try {
      const validation = validateBody(bulkImportProxiesSchema, parsed.body);
      if (isValidationFailure(validation)) return errorResponse(400, validation.error.message, "invalid_request");
      let created = 0; let updated = 0; let failed = 0;
      const results: Array<{ name: string; success: boolean; action?: "created" | "updated"; id?: string; error?: string }> = [];
      for (const item of validation.data.items) {
        try {
          const result = await upsertProxy(item);
          if (result.proxy) {
            if (result.action === "created") created++; else updated++;
            results.push({ name: item.name, success: true, action: result.action, id: result.proxy.id });
          } else { failed++; results.push({ name: item.name, success: false, error: "Unknown error" }); }
        } catch (error) {
          failed++; results.push({ name: item.name, success: false, error: error instanceof Error ? error.message : "Unknown error" });
        }
      }
      return Response.json({ created, updated, failed, results });
    } catch (error) {
      return errorFromUnknown(error, "Failed to bulk import proxies");
    }
  }

  async batchActivate(request: Request): Promise<ApiResult> {
    return this.batchUpdate(request, "activate");
  }

  async batchDelete(request: Request): Promise<ApiResult> {
    return this.batchUpdate(request, "delete");
  }

  private async batchUpdate(request: Request, operation: "activate" | "delete"): Promise<ApiResult> {
    const authError = await this.authorize(request);
    if (authError) return authError;
    const parsed = await readJson(request);
    if (!parsed.ok) return parsed.response;
    const schema = operation === "activate" ? z.object({ ids: z.array(z.string()).min(1).max(500), status: z.enum(["active", "inactive"]).optional().default("active") }) : z.object({ ids: z.array(z.string()).min(1).max(100), force: z.boolean().optional().default(false) });
    const validation = validateBody(schema, parsed.body);
    if (isValidationFailure(validation)) return errorResponse(400, validation.error.message, "invalid_request");
    try {
      const { ids } = validation.data;
      const results: Array<{ id: string; success: boolean; error?: string }> = [];
      let changed = 0;
      for (const id of ids) {
        try {
          const success = operation === "activate" ? Boolean(await updateProxy(id, { status: (validation.data as { status: string }).status })) : await deleteProxyById(id, { force: (validation.data as { force: boolean }).force });
          if (success) { changed++; results.push({ id, success: true }); } else results.push({ id, success: false, error: "Proxy not found" });
        } catch (error) { results.push({ id, success: false, error: error instanceof Error ? error.message : "Unknown error" }); }
      }
      if (changed > 0) clearDispatcherCache();
      return operation === "activate"
        ? Response.json({ success: changed > 0, status: (validation.data as { status: string }).status, updated: changed, failed: ids.length - changed, results })
        : Response.json({ success: changed > 0, deleted: changed, failed: ids.length - changed, results });
    } catch (error) {
      return errorFromUnknown(error, operation === "activate" ? "Failed to batch update proxy status" : "Failed to batch delete proxies");
    }
  }

  /** Operator-triggered reachability probe for the entire proxy registry. */
  async autoTest(body: unknown): Promise<ProxyOperationResult> {
    const validation = validateBody(
      z.object({ ids: z.array(z.string()).optional(), autoRemove: z.boolean().optional().default(false) }),
      body,
    );
    if (isValidationFailure(validation)) {
      return { status: 400, body: { error: validation.error.message, type: "invalid_request" } };
    }

    try {
      const { ids: specificIds, autoRemove } = validation.data;
      const allProxies = (await listProxies({ includeSecrets: true })).items;
      const proxiesToTest = specificIds ? allProxies.filter((proxy) => specificIds.includes(proxy.id)) : allProxies;
      if (proxiesToTest.length === 0) return { status: 200, body: { results: [], removed: [] } };

      const results: AutoTestResult[] = [];
      for (let i = 0; i < proxiesToTest.length; i += CONCURRENCY) {
        const batch = proxiesToTest.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.allSettled(
          batch.map(async (proxy, indexInBatch) => {
            await waitForProbeSlot(indexInBatch, STAGGER_MS);
            return testSingleProxy(proxy);
          }),
        );
        for (const result of batchResults) {
          if (result.status === "fulfilled") results.push(result.value as AutoTestResult);
        }
      }

      const removed: string[] = [];
      if (autoRemove) {
        for (const result of results) {
          if (result.alive) continue;
          try {
            if (await deleteProxyById(result.proxyId, { force: true })) removed.push(result.proxyId);
          } catch {
            // A failed cleanup must not hide the probe result.
          }
        }
      }

      return {
        status: 200,
        body: {
          tested: results.length,
          alive: results.filter((result) => result.alive).length,
          dead: results.filter((result) => !result.alive).length,
          removed: removed.length,
          results,
        },
      };
    } catch (error) {
      return errorFromUnknownResult(error, "Failed to auto-test proxies");
    }
  }

  async diagnoseEgress(): Promise<ProxyOperationResult> {
    try {
      const [diagnostic, { summary }] = await Promise.all([
        diagnoseAllEgressIps(),
        getRecentEgressSharingSummary(),
      ]);
      return { status: 200, body: { ...diagnostic, summary } };
    } catch (error) {
      return errorFromUnknownResult(error, "Failed to diagnose egress IPs");
    }
  }

  async validateEgress(): Promise<ProxyOperationResult> {
    try {
      const report = await validateProxyPool();
      const dead = report.filter((result: { alive: boolean }) => !result.alive);
      return {
        status: 200,
        body: { validated: report.length, alive: report.length - dead.length, dead: dead.length, report },
      };
    } catch (error) {
      return errorFromUnknownResult(error, "Failed to validate proxy pool");
    }
  }

  async migrateLegacy(body: unknown): Promise<ProxyOperationResult> {
    const validation = validateBody(z.object({ force: z.boolean().optional() }), body);
    if (isValidationFailure(validation)) {
      return {
        status: 400,
        body: {
          error: {
            message: validation.error.message,
            details: (validation.error as { details?: unknown }).details,
            type: "invalid_request",
          },
        },
      };
    }
    try {
      return { status: 200, body: await migrateLegacyProxyConfigToRegistry({ force: validation.data.force === true }) };
    } catch (error) {
      return errorFromUnknownResult(error, "Failed to migrate legacy proxy config");
    }
  }

  async repairRelay(id: string): Promise<ProxyOperationResult> {
    if (!id.trim()) return { status: 400, body: { error: "Invalid proxy id", type: "invalid_request" } };
    try {
      const proxy = await getProxyById(id, { includeSecrets: true });
      if (!proxy) return { status: 404, body: { error: "Proxy not found", type: "not_found" } };
      if (!isRelayProxyType(proxy.type)) {
        return {
          status: 400,
          body: {
            error: "Repair is only available for relay proxies (vercel/deno/cloudflare)",
            type: "invalid_request",
          },
        };
      }

      const mode = relayRepairMode(proxy.notes, proxy.type);
      if (mode === "noop") return { status: 200, body: { repaired: false, mode } };
      if (mode === "redeploy") {
        return {
          status: 409,
          body: {
            error:
              "Relay auth is unrecoverable (no stored token, encrypted blob absent or undecryptable — likely a STORAGE_ENCRYPTION_KEY rotation). Redeploy the relay to write a fresh relayAuth.",
            type: "conflict",
          },
        };
      }

      let encrypted: string | undefined;
      let existingNotes: Record<string, unknown> = {};
      try {
        existingNotes = JSON.parse(proxy.notes ?? "{}") as Record<string, unknown>;
        if (typeof existingNotes.relayAuthEnc === "string") encrypted = existingNotes.relayAuthEnc;
      } catch {
        encrypted = undefined;
      }
      const decrypted = typeof encrypted === "string" ? decrypt(encrypted) : undefined;
      if (!decrypted) {
        return {
          status: 409,
          body: {
            error:
              "Relay auth is unrecoverable (encrypted blob could not be decrypted — likely a STORAGE_ENCRYPTION_KEY rotation). Redeploy the relay to write a fresh relayAuth.",
            type: "conflict",
          },
        };
      }

      const { relayAuthEnc: _dropped, ...rest } = existingNotes;
      await updateProxy(id, { notes: JSON.stringify({ ...rest, relayAuth: decrypted }) });
      return { status: 200, body: { repaired: true, mode: "recovered" } };
    } catch (error) {
      return errorFromUnknownResult(error, "Failed to repair relay");
    }
  }
}

function errorFromUnknownResult(error: unknown, fallback: string): ProxyOperationResult {
  const value = error as { message?: unknown; status?: unknown; type?: unknown; details?: unknown };
  const status = Number(value?.status) || 500;
  return {
    status,
    body: {
      error: {
        message: typeof value?.message === "string" ? value.message : fallback,
        type:
          typeof value?.type === "string"
            ? value.type
            : status === 404
              ? "not_found"
              : status === 409
                ? "conflict"
                : status >= 500
                  ? "server_error"
                  : "invalid_request",
        details: value?.details,
      },
      requestId: randomUUID(),
    },
  };
}
