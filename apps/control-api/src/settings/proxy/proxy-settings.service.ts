import { Injectable } from "@nestjs/common";
import {
  deleteProxyForLevel,
  getProxyConfig,
  getProxyForLevel,
  setProxyConfig,
} from "@shiguang-gateway/core-domain/db/proxy-settings";
import { getProxyAssignments } from "@shiguang-gateway/core-domain/db/proxy-registry";
import { getProxyById } from "@shiguang-gateway/core-domain/db/proxies";
import { resolveProxyForConnection } from "@shiguang-gateway/core-domain/db/settings";
import { updateProxyConfigSchema } from "@shiguang-gateway/core-domain/shared/validation/schemas";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { clearDispatcherCache } from "@shiguang-gateway/open-sse/utils/proxyDispatcher";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
type ProxyConfigInput = { type?: "http" | "https" | "socks5"; host?: string; port?: number; username?: string; password?: string };
type UpdateProxyConfigInput = { proxy?: ProxyConfigInput | null; global?: ProxyConfigInput | null; providers?: Record<string, ProxyConfigInput | null>; combos?: Record<string, ProxyConfigInput | null>; keys?: Record<string, ProxyConfigInput | null>; level?: "global" | "provider" | "combo" | "key"; id?: string };
type ProxyMapInput = Record<string, ProxyConfigInput | null>;
type ApiRouteError = Error & { status?: number; type?: string };
const BASE_SUPPORTED_PROXY_TYPES = new Set(["http", "https"]);
const PROXY_LEVEL_TO_REGISTRY_SCOPE = { global: "global", provider: "provider", combo: "combo", key: "account" } as const;

function isSocks5Enabled() {
  const raw = (process.env.ENABLE_SOCKS5_PROXY ?? "").trim().toLowerCase();
  return !["false", "0", "no", "off"].includes(raw);
}
function supportedTypesMessage() { return isSocks5Enabled() ? "http, https, or socks5" : "http or https"; }
function createInvalidProxyError(message: string): ApiRouteError {
  const error = new Error(message) as ApiRouteError; error.status = 400; error.type = "invalid_request"; return error;
}
function getRegistryScopeForLevel(level: string): "global" | "provider" | "combo" | "account" | undefined {
  return Object.prototype.hasOwnProperty.call(PROXY_LEVEL_TO_REGISTRY_SCOPE, level)
    ? PROXY_LEVEL_TO_REGISTRY_SCOPE[level as keyof typeof PROXY_LEVEL_TO_REGISTRY_SCOPE] : undefined;
}
function toProxyConfig(proxyData: NonNullable<Awaited<ReturnType<typeof getProxyById>>>) {
  return { type: proxyData.type, host: proxyData.host, port: proxyData.port, username: proxyData.username, password: proxyData.password, name: proxyData.name };
}
async function getRegistryProxyForLevel(level: string, id: string | null) {
  const scope = getRegistryScopeForLevel(level); if (!scope || (scope !== "global" && !id)) return null;
  const assignments = await getProxyAssignments({ scope });
  const assignment = scope === "global" ? assignments[0] : assignments.find((entry) => entry.scopeId === id);
  return assignment?.proxyId ? getProxyById(assignment.proxyId, { includeSecrets: true }) : null;
}
function normalizeAndValidateProxy(proxy: ProxyConfigInput | null | undefined, pathLabel: string): ProxyConfigInput | null | undefined {
  if (proxy === null || proxy === undefined) return proxy;
  if (typeof proxy !== "object" || Array.isArray(proxy)) throw createInvalidProxyError(`${pathLabel} must be an object`);
  const type = String(proxy.type || "http").toLowerCase() as NonNullable<ProxyConfigInput["type"]>;
  if (type === "socks5" && !isSocks5Enabled()) throw createInvalidProxyError("SOCKS5 proxy is disabled (remove ENABLE_SOCKS5_PROXY=false to enable — it is ON by default)");
  if (type.startsWith("socks") && type !== "socks5") throw createInvalidProxyError(`${pathLabel}.type must be ${supportedTypesMessage()}`);
  if (!(isSocks5Enabled() ? new Set([...BASE_SUPPORTED_PROXY_TYPES, "socks5"]) : BASE_SUPPORTED_PROXY_TYPES).has(type)) throw createInvalidProxyError(`${pathLabel}.type must be ${supportedTypesMessage()}`);
  return { ...proxy, type } as ProxyConfigInput;
}
function normalizeAndValidateProxyMap(proxyMap: ProxyMapInput | undefined, mapName: string): ProxyMapInput | undefined {
  if (proxyMap === undefined) return undefined;
  if (proxyMap === null || typeof proxyMap !== "object" || Array.isArray(proxyMap)) throw createInvalidProxyError(`${mapName} must be an object`);
  const normalizedMap: ProxyMapInput = { ...proxyMap };
  for (const [id, proxy] of Object.entries(proxyMap) as Array<[string, ProxyConfigInput | null]>) normalizedMap[id] = normalizeAndValidateProxy(proxy, `${mapName}.${id}`) ?? null;
  return normalizedMap;
}
function normalizeProxyPayload(body: UpdateProxyConfigInput): UpdateProxyConfigInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw createInvalidProxyError("Request body must be an object");
  const normalized: UpdateProxyConfigInput = { ...body };
  if (Object.prototype.hasOwnProperty.call(body, "proxy")) normalized.proxy = normalizeAndValidateProxy(body.proxy, "proxy");
  if (Object.prototype.hasOwnProperty.call(body, "global")) normalized.global = normalizeAndValidateProxy(body.global, "global");
  for (const key of ["providers", "combos", "keys"] as const) if (Object.prototype.hasOwnProperty.call(body, key)) normalized[key] = normalizeAndValidateProxyMap(body[key], key);
  return normalized;
}
function errorResponse(status: number, message: string, type?: string, details?: unknown): Response {
  return Response.json({ error: { message, type: type ?? (status === 400 ? "invalid_request" : "server_error"), details } }, { status });
}
function errorFromUnknown(error: unknown, fallback: string): Response {
  const value = error as { message?: unknown; status?: unknown; type?: unknown; details?: unknown };
  return errorResponse(Number(value?.status) || 500, typeof value?.message === "string" ? value.message : fallback, typeof value?.type === "string" ? value.type : undefined, value?.details);
}

@Injectable()
export class ProxySettingsService {
  async get(request: Request): Promise<Response> {
    const authError = await requireManagementAuth(request); if (authError) return authError;
    try {
      const { searchParams } = new URL(request.url); const level = searchParams.get("level"); const id = searchParams.get("id"); const resolveId = searchParams.get("resolve");
      if (resolveId) return Response.json(await resolveProxyForConnection(resolveId));
      if (level) {
        const proxyData = await getRegistryProxyForLevel(level, id);
        if (proxyData) return Response.json({ level, id: level === "global" ? null : id, proxy: toProxyConfig(proxyData) });
        return Response.json({ level, id, proxy: await getProxyForLevel(level, id ?? undefined) });
      }
      const config = await getProxyConfig(); const providerAssignments = await getProxyAssignments({ scope: "provider" });
      if (providerAssignments.length) {
        config.providers = { ...(config.providers || {}) };
        for (const assignment of providerAssignments) {
          if (!assignment.scopeId || !assignment.proxyId) continue;
          const proxyData = await getProxyById(assignment.proxyId, { includeSecrets: true });
          if (proxyData) config.providers[assignment.scopeId] = toProxyConfig(proxyData);
        }
      }
      return Response.json(config);
    } catch (error) { return errorFromUnknown(error, "Failed to load proxy config"); }
  }
  async update(request: Request, rawBody: unknown): Promise<Response> {
    const authError = await requireManagementAuth(request); if (authError) return authError;
    const validation = validateBody(updateProxyConfigSchema, rawBody);
    if (isValidationFailure(validation)) return errorResponse(400, validation.error.message, "invalid_request");
    try { const updated = await setProxyConfig(normalizeProxyPayload(validation.data as UpdateProxyConfigInput)); clearDispatcherCache(); return Response.json(updated); }
    catch (error) { const routeError = error as ApiRouteError; return errorResponse(Number(routeError.status) || 500, routeError.message, routeError.type); }
  }
  async delete(request: Request): Promise<Response> {
    const authError = await requireManagementAuth(request); if (authError) return authError;
    try {
      const { searchParams } = new URL(request.url); const level = searchParams.get("level"); const id = searchParams.get("id");
      if (!level) return errorResponse(400, "level is required", "invalid_request");
      const updated = await deleteProxyForLevel(level, id); clearDispatcherCache(); return Response.json(updated);
    } catch (error) { return errorFromUnknown(error, "Failed to delete proxy"); }
  }
}
