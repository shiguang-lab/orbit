import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { request as undiciRequest } from "undici";
import {
  clearFreeProxiesBySource,
  countFreeProxies,
  deleteFreeProxy,
  getAllProviders,
  getFreeProxyById,
  getFreeProxyStats,
  getFreeProxySyncErrors,
  getFreeProxyAutoSyncIntervalMs,
  isFreeProxyAutoSyncEnabled,
  getProvider,
  listFreeProxies,
  promoteFreeProxyToPool,
  runFreeProxySyncCycle,
} from "@orbit/core/shared/free-proxies";
import type {
  FreeProxyProvider,
  FreeProxySourceId,
} from "@orbit/core/shared/free-proxies";
import {
  createProxyDispatcher,
  proxyConfigToUrl,
} from "@orbit/inference/utils/proxyDispatcher";
import { probeEchoTargets } from "@orbit/core/shared/proxy-echo-target";
import {
  isValidationFailure,
  validateBody,
} from "@orbit/core/shared/validation/helpers";
import {
  freeProxyBulkAddSchema,
  freeProxyListSchema,
  freeProxySourceSchema,
  freeProxySyncSchema,
} from "../free-proxy-schemas.js";

export interface FreeProxiesOperationResult {
  status: number;
  body: unknown;
}

type ConnectivityResult = {
  success: boolean;
  latencyMs: number;
  publicIp?: string;
};
type ConnectivityTester = (host: string, port: number, type: string) => Promise<ConnectivityResult>;
type QuickTester = (host: string, port: number, type: string) => Promise<{ ok: boolean; latencyMs: number }>;

function errorResult(status: number, message: string, type?: string, details?: unknown): FreeProxiesOperationResult {
  return {
    status,
    body: {
      error: { message, type: type ?? (status === 404 ? "not_found" : status >= 500 ? "server_error" : "invalid_request"), details },
      requestId: randomUUID(),
    },
  };
}

function errorFromUnknown(error: unknown, fallback: string): FreeProxiesOperationResult {
  const value = error as { message?: unknown; status?: unknown; type?: unknown; details?: unknown };
  return errorResult(
    Number(value?.status) || 500,
    typeof value?.message === "string" ? value.message : fallback,
    typeof value?.type === "string" ? value.type : undefined,
    value?.details,
  );
}

async function testProxyConnectivity(
  host: string,
  port: number,
  type: string,
): Promise<ConnectivityResult> {
  const proxyUrl = proxyConfigToUrl({ type, host, port });
  if (!proxyUrl) return { success: false, latencyMs: 0 };
  const dispatcher = createProxyDispatcher(proxyUrl);
  const start = Date.now();
  try {
    const { result } = await probeEchoTargets(async (url, timeoutMs) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await undiciRequest(url, {
          method: "GET",
          dispatcher,
          signal: controller.signal,
          headersTimeout: timeoutMs,
          bodyTimeout: timeoutMs,
        });
        return { statusCode: response.statusCode, text: await response.body.text() };
      } finally {
        clearTimeout(timeout);
      }
    }, 5000);
    let parsed: { ip?: string } = {};
    try { parsed = JSON.parse(result.text) as { ip?: string }; } catch { /* non-JSON echo response */ }
    return {
      success: result.statusCode === 200,
      latencyMs: Date.now() - start,
      publicIp: parsed.ip,
    };
  } catch {
    return { success: false, latencyMs: Date.now() - start };
  }
}

async function testProxyQuick(host: string, port: number, type: string): Promise<{ ok: boolean; latencyMs: number }> {
  const proxyUrl = proxyConfigToUrl({ type, host, port });
  if (!proxyUrl) return { ok: false, latencyMs: 0 };
  const dispatcher = createProxyDispatcher(proxyUrl);
  const start = Date.now();
  try {
    const { result } = await probeEchoTargets(async (url, timeoutMs) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await undiciRequest(url, {
          method: "GET",
          dispatcher,
          signal: controller.signal,
          headersTimeout: timeoutMs,
          bodyTimeout: timeoutMs,
        });
        await response.body.dump();
        return response.statusCode;
      } finally {
        clearTimeout(timeout);
      }
    }, 5000);
    return { ok: result === 200, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

let connectivityTester: ConnectivityTester = testProxyConnectivity;
let quickTester: QuickTester = testProxyQuick;
let providersOverride: FreeProxyProvider[] | null = null;

/** Test seam retained for the control-domain unit tests. */
export function _setConnectivityTesterForTests(fn: ConnectivityTester): void { connectivityTester = fn; }
export function _resetConnectivityTesterForTests(): void { connectivityTester = testProxyConnectivity; }
export function _setQuickTesterForTests(fn: QuickTester): void { quickTester = fn; }
export function _resetQuickTesterForTests(): void { quickTester = testProxyQuick; }
export function _setProvidersForTests(providers: FreeProxyProvider[] | null): void { providersOverride = providers; }

/** Use cases for the operator-managed free-proxy catalog. */
@Injectable()
export class FreeProxiesService {
  async list(request: Request): Promise<FreeProxiesOperationResult> {
    try {
      const { searchParams } = new URL(request.url);
      const raw = {
        sources: searchParams.get("sources") || undefined,
        protocol: searchParams.get("protocol") || undefined,
        country: searchParams.get("country") || undefined,
        minQuality: searchParams.get("minQuality") || undefined,
        search: searchParams.get("search") || undefined,
        sortBy: searchParams.get("sortBy") || undefined,
        limit: searchParams.get("limit") || undefined,
        offset: searchParams.get("offset") || undefined,
        onlyNotInPool: searchParams.get("onlyNotInPool") || undefined,
      };
      const validation = validateBody(freeProxyListSchema, raw);
      if (isValidationFailure(validation)) return errorResult(400, validation.error.message, "invalid_request");
      const options = {
        sources: validation.data.sources as FreeProxySourceId[] | undefined,
        protocol: validation.data.protocol,
        country: validation.data.country,
        minQuality: validation.data.minQuality,
        search: validation.data.search,
        sortBy: validation.data.sortBy,
        limit: validation.data.limit,
        offset: validation.data.offset,
        onlyNotInPool: validation.data.onlyNotInPool || undefined,
      };
      const [items, total, stats, syncErrors] = await Promise.all([
        listFreeProxies(options),
        countFreeProxies({
          sources: options.sources,
          protocol: options.protocol,
          country: options.country,
          minQuality: options.minQuality,
          search: options.search,
          onlyNotInPool: options.onlyNotInPool,
        }),
        getFreeProxyStats(),
        getFreeProxySyncErrors(),
      ]);
      const limit = validation.data.limit ?? 50;
      return {
        status: 200,
        body: {
          success: true,
          data: {
            proxies: items,
            total,
            hasMore: items.length >= limit && total > items.length + (validation.data.offset ?? 0),
            stats,
            syncErrors,
          },
        },
      };
    } catch (error) {
      return errorFromUnknown(error, "Failed to list free proxies");
    }
  }

  async remove(request: Request): Promise<FreeProxiesOperationResult> {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");
      const source = searchParams.get("source");
      if (source) {
        const parsed = freeProxySourceSchema.safeParse(source);
        if (!parsed.success) return errorResult(400, "Invalid source", "invalid_request");
        return { status: 200, body: { success: true, deleted: await clearFreeProxiesBySource(parsed.data) } };
      }
      if (!id) return errorResult(400, "id or source required", "invalid_request");
      if (!(await deleteFreeProxy(id))) return errorResult(404, "Proxy not found", "not_found");
      return { status: 200, body: { success: true } };
    } catch (error) {
      return errorFromUnknown(error, "Failed to delete free proxy");
    }
  }

  async stats(): Promise<FreeProxiesOperationResult> {
    try {
      const [stats, providers] = await Promise.all([
        getFreeProxyStats(),
        Promise.resolve(getAllProviders().map((provider) => ({ id: provider.id, name: provider.name, enabled: provider.isEnabled() }))),
      ]);
      return {
        status: 200,
        body: {
          stats,
          providers,
          autoSync: { enabled: isFreeProxyAutoSyncEnabled(), intervalMs: getFreeProxyAutoSyncIntervalMs() },
        },
      };
    } catch (error) {
      return errorFromUnknown(error, "Failed to get free proxy stats");
    }
  }

  async sync(request: Request, body: unknown): Promise<FreeProxiesOperationResult> {
    let rawBody: unknown = {};
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) rawBody = body ?? {};
    const validation = validateBody(freeProxySyncSchema, rawBody);
    if (isValidationFailure(validation)) return errorResult(400, validation.error.message, "invalid_request");
    try {
      const providers = providersOverride ?? (validation.data.sources?.length
        ? validation.data.sources
            .map((id: FreeProxySourceId) => getProvider(id))
            .filter((provider: FreeProxyProvider | undefined): provider is FreeProxyProvider => provider != null)
        : undefined);
      const result = await runFreeProxySyncCycle(providers);
      return { status: 200, body: { success: true, ...result } };
    } catch (error) {
      return errorFromUnknown(error, "Failed to sync free proxies");
    }
  }

  async bulkAddToPool(body: unknown): Promise<FreeProxiesOperationResult> {
    const validation = validateBody(freeProxyBulkAddSchema, body);
    if (isValidationFailure(validation)) return errorResult(400, validation.error.message, "invalid_request");
    try {
      const results: Array<{ id: string; success: boolean; poolProxyId?: string; error?: string }> = [];
      for (const id of validation.data.ids) {
        const freeProxy = await getFreeProxyById(id);
        if (!freeProxy) { results.push({ id, success: false, error: "Not found" }); continue; }
        if (freeProxy.inPool) { results.push({ id, success: true, poolProxyId: freeProxy.poolProxyId ?? undefined }); continue; }
        const test = await quickTester(freeProxy.host, freeProxy.port, freeProxy.type);
        if (!test.ok) { results.push({ id, success: false, error: "Test failed" }); continue; }
        const poolProxyId = await promoteFreeProxyToPool(id, {
          name: `[${freeProxy.source}] ${freeProxy.host}:${freeProxy.port}`,
          type: freeProxy.type,
          host: freeProxy.host,
          port: freeProxy.port,
          source: freeProxy.source,
        });
        if (!poolProxyId) { results.push({ id, success: false, error: "Failed to create registry entry" }); continue; }
        results.push({ id, success: true, poolProxyId });
      }
      const succeeded = results.filter((result) => result.success).length;
      return { status: 200, body: { succeeded, failed: results.length - succeeded, results } };
    } catch (error) {
      return errorFromUnknown(error, "Bulk add failed");
    }
  }

  async addToPool(id: string): Promise<FreeProxiesOperationResult> {
    const freeProxy = await getFreeProxyById(id);
    if (!freeProxy) return errorResult(404, "Free proxy not found", "not_found");
    if (freeProxy.inPool) return { status: 200, body: { success: true, alreadyInPool: true, poolProxyId: freeProxy.poolProxyId } };
    try {
      const testResult = await connectivityTester(freeProxy.host, freeProxy.port, freeProxy.type);
      if (!testResult.success) return { status: 422, body: { success: false, error: "Proxy test failed", latencyMs: testResult.latencyMs } };
      const poolProxyId = await promoteFreeProxyToPool(id, {
        name: `[${freeProxy.source}] ${freeProxy.host}:${freeProxy.port}`,
        type: freeProxy.type,
        host: freeProxy.host,
        port: freeProxy.port,
        source: freeProxy.source,
      });
      if (!poolProxyId) return errorResult(500, "Failed to create proxy in registry", "server_error");
      return { status: 200, body: { success: true, poolProxyId, latencyMs: testResult.latencyMs } };
    } catch (error) {
      return errorFromUnknown(error, "Failed to add proxy to pool");
    }
  }
}
