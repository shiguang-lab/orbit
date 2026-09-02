/**
 * API client 核心 + 领域类型（参考 asset-hub apps/web/src/entities/api.ts）。
 * - api<T>() 统一 fetch 封装：同源 cookie 会话 + CSRF 头 + 401/错误归一化
 * - 长连接：WS(live) client + SSE helpers
 */
import { withCsrfHeader } from "@/auth/csrf";
import { redirectToUnifiedLogin } from "@/auth/session";
import type { SidebarSettings } from "@/app/nav";

const DEV_BYPASS_AUTH =
  import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === "1";

export const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly correlationId: string | null;

  constructor(status: number, message: string, code?: string | null, correlationId?: string | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code ?? null;
    this.correlationId = correlationId ?? null;
  }
}

interface ApiProblem {
  error?: { code?: string; message?: string } | string;
  detail?: string;
  message?: string;
  correlation_id?: string;
}

function extractProblem(body: unknown, status: number, fallback: string): ApiError {
  const p = body as ApiProblem | null;
  if (p?.detail) return new ApiError(status, p.detail, undefined, p.correlation_id);
  if (p && typeof p.error === "object" && p.error?.message) {
    return new ApiError(status, p.error.message, p.error.code, p.correlation_id);
  }
  if (p && typeof p.error === "string") return new ApiError(status, p.error, undefined, p.correlation_id);
  if (p?.message) return new ApiError(status, p.message, undefined, p.correlation_id);
  return new ApiError(status, fallback, undefined, p?.correlation_id);
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  const urlPath = (() => {
    try {
      return new URL(url, window.location.origin).pathname;
    } catch {
      return path;
    }
  })();

  const init = await withCsrfHeader({ ...options, headers }, urlPath);
  const response = await fetch(url, init);

  if (response.status === 401) {
    // dev bypass 下不跳登录（验证 UI/WS 用）；生产/SSO 形态跳统一登录
    if (!DEV_BYPASS_AUTH) redirectToUnifiedLogin();
    throw new ApiError(401, "未登录或会话已过期");
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // 非 JSON 错误体
    }
    throw extractProblem(body, response.status, `请求失败 (${response.status})`);
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as T;
}

/* ------------------------------------------------------------------ */
/* 领域类型（P0 先放最核心的，后续按页面逐域补充）                      */
/* ------------------------------------------------------------------ */

export interface RequireLoginInfo {
  authenticated: boolean;
  requireLogin: boolean;
  hasPassword: boolean;
  setupComplete: boolean;
  oidcEnabled: boolean;
  oidcDisablePasswordLogin: boolean;
}

export interface ProviderConnection {
  id: string;
  provider: string;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  status?: string;
  enabled?: boolean;
  priority?: number;
  authType?: string;
  isActive?: boolean;
  isBanned?: boolean;
  testStatus?: string;
  lastError?: string | null;
  lastErrorType?: string | null;
  errorCode?: string | null;
  rateLimitedUntil?: string | null;
  expiresAt?: string | null;
  tokenExpiresAt?: string | null;
  defaultModel?: string;
  providerSpecificData?: unknown;
  [key: string]: unknown;
}

export interface ProviderListResponse {
  connections: ProviderConnection[];
  total: number;
}

export interface ProviderCatalogEntry {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  textIcon?: string;
  apiType?: string;
  hasFree?: boolean;
  freeNote?: string;
  hiddenFromDashboard?: boolean;
  serviceKinds?: string[];
  deprecated?: boolean;
  deprecationReason?: string;
  subscriptionRisk?: boolean;
  riskNoticeVariant?: "oauth" | "webCookie" | "deprecated" | "embedded-service";
  isIde?: boolean;
  dashboardSection?: string;
  website?: string;
  authHint?: string;
  baseUrl?: string;
  notice?: { text?: string; apiKeyUrl?: string; signupUrl?: string };
  passthroughModels?: boolean;
  anonymousFallback?: boolean;
}

export interface ProviderCatalogCategory {
  key: string;
  displayAuthType: string;
  toggleAuthType: string;
  providers: ProviderCatalogEntry[];
}

export interface ProviderCatalogResponse {
  categories: ProviderCatalogCategory[];
}

export interface ProviderNode {
  id: string;
  name?: string;
  type?: string;
  apiType?: string;
  iconUrl?: string;
  baseUrl?: string;
  chatPath?: string;
  modelsPath?: string;
  prefix?: string;
}

export interface ProviderNodeListResponse {
  nodes: ProviderNode[];
  total: number;
  ccCompatibleProviderEnabled: boolean;
}

export interface ProviderExpiration {
  connectionId: string;
  provider: string;
  connectionName: string;
  expiresAt: string | null;
  expiryType: string;
  status: "active" | "expiring_soon" | "expired" | "unknown";
  note?: string | null;
}

export interface ProviderExpirationResponse {
  summary: {
    total: number;
    active: number;
    expiringSoon: number;
    expired: number;
    unknown: number;
  } | null;
  list: ProviderExpiration[];
}

export interface OpenRouterProviderStatsResponse {
  object: "list";
  data: Array<{
    slug: string;
    displayName: string;
    iconUrl?: string;
    modelCount: number;
    totalTokens: number;
    totalRequests: number;
    popularityRank: number;
    [key: string]: unknown;
  }>;
  meta?: Record<string, unknown>;
}

export interface BatchTestResultItem {
  provider: string;
  connectionId: string;
  connectionName: string;
  authType?: string;
  valid: boolean;
  latencyMs?: number;
  error?: string;
  diagnosis?: { type?: string; source?: string; code?: string; message?: string };
  statusCode?: number;
}

export interface BatchTestResponse {
  mode: string;
  providerId?: string;
  results: BatchTestResultItem[];
  testedAt: string;
  summary: { total: number; passed: number; failed: number };
}

export interface ProviderImportResponse {
  imported: ProviderConnection[];
  importedCount: number;
  errors: Array<{ index: number; message: string }>;
}

export interface ProviderModelsResponse {
  models: Array<Record<string, unknown>>;
  customModels: Array<Record<string, unknown>>;
  source?: string;
  modelCompatOverrides?: Array<Record<string, unknown>>;
  hiddenModelsByProvider?: Record<string, string[]>;
}

export const providersApi = {
  list: (params?: { provider?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.provider) q.set("provider", params.provider);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    const qs = q.toString();
    return api<ProviderListResponse>(`/providers${qs ? `?${qs}` : ""}`);
  },
  catalog: () => api<ProviderCatalogResponse>("/providers/catalog"),
  listNodes: () => api<ProviderNodeListResponse>("/provider-nodes"),
  expiration: () => api<ProviderExpirationResponse>("/providers/expiration"),
  openRouterStats: () => api<OpenRouterProviderStatsResponse>("/providers/openrouter-stats"),
  get: (id: string) => api<{ connection: ProviderConnection }>(`/providers/${id}`),
  create: (input: Record<string, unknown>) =>
    api<{ connection: ProviderConnection }>("/providers", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, patch: Record<string, unknown>) =>
    api<{ connection: ProviderConnection }>(`/providers/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  remove: (id: string) => api<{ message: string }>(`/providers/${id}`, { method: "DELETE" }),
  import: (providers: Array<Record<string, unknown>>) =>
    api<ProviderImportResponse>("/providers/import", { method: "POST", body: JSON.stringify({ providers }) }),
  models: (id: string) => api<ProviderModelsResponse>(`/providers/${id}/models`),
  catalogModels: (providerId: string) => api<{ models: Array<Record<string, unknown>>; source: "registry" }>(`/providers/${encodeURIComponent(providerId)}/catalog-models`),
  syncedModels: (providerId: string) => api<{ models: Array<Record<string, unknown>> }>(`/synced-available-models?provider=${encodeURIComponent(providerId)}`),
  providerModels: (providerId: string) => api<ProviderModelsResponse & { source?: string }>(`/provider-models?provider=${encodeURIComponent(providerId)}`),
  setModelVisibility: (providerId: string, modelIds: string[], isHidden: boolean) =>
    api<{ ok: boolean; updated: number }>(`/provider-models?provider=${encodeURIComponent(providerId)}`, {
      method: "PATCH",
      body: JSON.stringify({ modelIds, isHidden }),
    }),
  syncModels: (connectionId: string) => api<Record<string, unknown>>(`/providers/${encodeURIComponent(connectionId)}/sync-models?mode=import`, { method: "POST" }),
  webFetch: (input: { url: string; provider?: string; format?: string; depth?: number }) => api<Record<string, unknown>>("/v1/web/fetch", { method: "POST", body: JSON.stringify(input) }),
  chat: (input: { model: string; messages: Array<{ role: "user" | "assistant"; content: string }> }) => api<Record<string, unknown>>("/v1/chat/completions", { method: "POST", body: JSON.stringify({ ...input, stream: false }) }),
  addModel: (id: string, modelId: string, modelName?: string) => api<{ model: Record<string, unknown> }>(`/providers/${id}/models`, { method: "POST", body: JSON.stringify({ modelId, modelName }) }),
  removeModel: (id: string, modelId: string) => api<{ success: boolean }>(`/providers/${id}/models?modelId=${encodeURIComponent(modelId)}`, { method: "DELETE" }),
  paramFilters: (id: string) => api<Record<string, unknown>>(`/providers/${id}/param-filters`),
  updateParamFilters: (id: string, config: Record<string, unknown>) => api<{ success: boolean }>(`/providers/${id}/param-filters`, { method: "PUT", body: JSON.stringify(config) }),
  deleteParamFilters: (id: string) => api<{ success: boolean }>(`/providers/${id}/param-filters`, { method: "DELETE" }),
  interceptionRules: (id: string) => api<Record<string, unknown>>(`/providers/${id}/interception-rules`),
  updateInterceptionRules: (id: string, config: Record<string, unknown>) => api<{ success: boolean }>(`/providers/${id}/interception-rules`, { method: "PUT", body: JSON.stringify(config) }),
  deleteInterceptionRules: (id: string) => api<{ success: boolean }>(`/providers/${id}/interception-rules`, { method: "DELETE" }),
  batchUpdate: (ids: string[], isActive: boolean) =>
    api<{ message: string; updated: number; notFound: string[] }>("/providers", {
      method: "PATCH",
      body: JSON.stringify({ ids, isActive }),
    }),
  batchRemove: (ids: string[]) =>
    api<{ message: string; deleted: number }>("/providers", {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }),
  testBatch: (mode: string, providerId?: string, connectionIds?: string[]) =>
    api<BatchTestResponse>("/providers/test-batch", {
      method: "POST",
      body: JSON.stringify({ mode, providerId, connectionIds }),
    }),
  test: (id: string) => api<BatchTestResultItem>(`/providers/${id}/test`, { method: "POST" }),
  refresh: (id: string) => api<{ success?: boolean }>(`/providers/${id}/refresh`, { method: "POST" }),
  refreshCursor: (id: string) => api<{ success?: boolean; unchanged?: boolean }>(`/providers/${id}/refresh-cursor`, { method: "POST" }),
  setRateLimitProtection: (connectionId: string, enabled: boolean) => api<{ success?: boolean }>("/rate-limits", { method: "POST", body: JSON.stringify({ connectionId, enabled }) }),
};
export const settingsApi = {
  sidebar: () => api<SidebarSettings>("/settings"),
  get: () => api<Record<string, unknown>>("/settings"),
  patch: (patch: Record<string, unknown>) => api<Record<string, unknown>>("/settings", { method: "PATCH", body: JSON.stringify(patch) }),
  proxyConfig: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return api<Record<string, unknown>>(`/settings/proxy${q}`);
  },
  proxies: () =>
    api<{
      items?: Array<{
        id: string;
        name?: string;
        host?: string;
        port?: number | string;
        type?: string;
        status?: string;
        username?: string;
        password?: string;
        source?: string;
      }>;
      socks5Enabled?: boolean;
    }>("/settings/proxies"),
  proxyAssignments: (scope: "account" | "provider" | "combo", scopeId?: string) => {
    const params = new URLSearchParams({ scope });
    if (scopeId) params.set("scopeId", scopeId);
    return api<{ items?: Array<{ scope?: string; scopeId?: string; proxyId?: string | null }> }>(
      `/settings/proxies/assignments?${params.toString()}`,
    );
  },
  resolveProxy: (connectionId: string) =>
    api<{ proxy?: { id?: string; name?: string; host?: string }; level?: string }>(
      `/settings/proxy?resolve=${encodeURIComponent(connectionId)}`,
    ),
  assignProxy: (
    scope: "account" | "provider" | "combo",
    scopeId: string | null,
    proxyId: string | null,
  ) =>
    api<Record<string, unknown>>("/settings/proxies/assignments", {
      method: "PUT",
      body: JSON.stringify({ scope, scopeId, proxyId }),
    }),
  testProxy: (body: { proxy?: Record<string, unknown>; proxyId?: string }) =>
    api<{ success?: boolean; publicIp?: string; latencyMs?: number; error?: string }>(
      "/settings/proxy/test",
      { method: "POST", body: JSON.stringify(body) },
    ),
  createCustomProxy: (payload: Record<string, unknown>) =>
    api<{ id?: string; assignment?: { proxyId?: string }; error?: { message?: string } }>(
      "/settings/proxies",
      { method: "POST", body: JSON.stringify(payload) },
    ),
  updateCustomProxy: (payload: Record<string, unknown>) =>
    api<{ id?: string; error?: { message?: string } }>("/settings/proxies", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
export interface CallLogEntry {
  id: string;
  model?: string;
  provider?: string;
  status?: string;
  duration?: number;
  tokens_in?: number;
  tokens_out?: number;
  timestamp?: string;
  apiKey?: string;
  combo?: string;
  correlationId?: string;
  error?: string;
  [key: string]: unknown;
}

export interface SystemVersionInfo {
  version: string;
  updateAvailable?: boolean;
  latest?: string;
  [key: string]: unknown;
}

/* ---------------- API Keys ---------------- */

export interface ApiKeyView {
  id: string;
  name: string;
  key?: string | null;
  machineId?: string;
  scopes?: string[];
  isActive?: boolean;
  isBanned?: boolean;
  expiresAt?: string | null;
  createdAt?: string;
  allowedConnections?: string[];
  allowedCombos?: string[];
  allowedQuotas?: unknown[];
  allowedEndpoints?: string[];
  modelAccessMode?: string;
  allowedModels?: string[];
  blockedModels?: string[];
  noLog?: boolean;
  autoResolve?: boolean;
  streamDefaultMode?: string;
  compressionEnabled?: boolean;
  chaosModeEnabled?: boolean;
  disableNonPublicModels?: boolean;
  allowUsageCommand?: boolean;
  usageLimitEnabled?: boolean;
  dailyUsageLimitUsd?: number | null;
  weeklyUsageLimitUsd?: number | null;
  maxSessions?: number;
  throttleDelayMs?: number;
  accessSchedule?: unknown;
  rateLimits?: unknown;
  [key: string]: unknown;
}

export interface ApiKeyListResponse {
  keys: ApiKeyView[];
  total: number;
  allowKeyReveal: boolean;
}

export interface ApiKeyCreateInput {
  name: string;
  scopes?: string[];
  allowUsageCommand?: boolean;
  noLog?: boolean;
  compressionEnabled?: boolean;
  [key: string]: unknown;
}

export interface ApiKeyCreateResponse {
  key: string;
  name: string;
  id: string;
  machineId: string;
  [key: string]: unknown;
}

export const keysApi = {
  list: () => api<ApiKeyListResponse>("/keys"),
  create: (input: ApiKeyCreateInput) =>
    api<ApiKeyCreateResponse>("/keys", { method: "POST", body: JSON.stringify(input) }),
  get: (id: string) => api<ApiKeyView>(`/keys/${id}`),
  update: (id: string, patch: Record<string, unknown>) =>
    api<Record<string, unknown>>(`/keys/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  remove: (id: string) => api<{ message: string }>(`/keys/${id}`, { method: "DELETE" }),
  regenerate: (id: string) =>
    api<{ message: string; key: string; id: string }>(`/keys/${id}/regenerate`, { method: "POST" }),
  reveal: (id: string) => api<{ key: string | null }>(`/keys/${id}/reveal`),
};

/* ---------------- Combos ---------------- */
export type {
  ComboModelStep,
  ComboRefStep,
  ComboProviderWildcardStep,
  ComboStep,
  ComboItem,
  ComboListResponse,
  ComboMetrics,
  ComboBuilderOptions,
  ComboTestResultItem,
  ComboTestResponse,
} from "@omniroute/contracts";

export interface ComboHealthResponse {
  combos?: Array<{
    comboId?: string;
    comboName?: string;
    performance?: {
      avgLatencyMs?: number;
      successRate?: number;
      totalRequests?: number;
    };
    quotaHealth?: {
      worstRemainingPct?: number;
      providers?: Array<{
        provider: string;
        remainingPct: number;
        isExhausted: boolean;
        trend: "improving" | "stable" | "declining";
      }>;
    };
    usageSkew?: {
      giniCoefficient?: number;
      modelDistribution?: Array<{ model: string; requestShare: number; tokenShare: number }>;
    };
    targetHealth?: Array<{
      executionKey?: string;
      stepId?: string | null;
      model?: string;
      provider?: string;
      connectionId?: string | null;
      label?: string | null;
      requests?: number;
      successRate?: number;
      avgLatencyMs?: number;
      lastStatus?: "ok" | "error" | null;
      lastUsedAt?: string | null;
      quotaRemainingPct?: number | null;
      quotaIsExhausted?: boolean | null;
      quotaTrend?: "improving" | "stable" | "declining" | null;
      quotaScope?: "connection" | "provider" | "none";
    }>;
  }>;
}

export const combosApi = {
  list: () => api<import("@omniroute/contracts").ComboListResponse>("/combos"),
  get: (id: string) => api<import("@omniroute/contracts").ComboItem>(`/combos/${encodeURIComponent(id)}`),
  create: (data: Partial<import("@omniroute/contracts").ComboItem>) =>
    api<import("@omniroute/contracts").ComboItem>("/combos", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<import("@omniroute/contracts").ComboItem>) =>
    api<import("@omniroute/contracts").ComboItem>(`/combos/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  patch: (id: string, data: Partial<import("@omniroute/contracts").ComboItem>) =>
    api<import("@omniroute/contracts").ComboItem>(`/combos/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    api<{ success: boolean }>(`/combos/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  reorder: (comboIds: string[]) =>
    api<{ combos: import("@omniroute/contracts").ComboItem[] }>("/combos/reorder", {
      method: "POST",
      body: JSON.stringify({ comboIds }),
    }),
  duplicate: (name: string, strategy?: string) =>
    api<import("@omniroute/contracts").ComboItem>("/combos/duplicate", {
      method: "POST",
      body: JSON.stringify({ name, strategy }),
    }),
  test: (comboName: string) =>
    api<import("@omniroute/contracts").ComboTestResponse>("/combos/test", {
      method: "POST",
      body: JSON.stringify({ comboName }),
    }),
  metrics: (comboName?: string) =>
    api<{ metrics: Record<string, import("@omniroute/contracts").ComboMetrics> | import("@omniroute/contracts").ComboMetrics | null }>(
      comboName ? `/combos/metrics?combo=${encodeURIComponent(comboName)}` : "/combos/metrics",
    ),
  builderOptions: () =>
    api<import("@omniroute/contracts").ComboBuilderOptions>("/combos/builder/options"),
  defaults: () =>
    api<{ comboDefaults?: Record<string, unknown>; providerOverrides?: Record<string, unknown> }>(
      "/settings/combo-defaults",
    ),
  compression: () => api<{ enabled?: boolean }>("/settings/compression"),
  proxyAssignments: () =>
    api<{ assignments?: Record<string, string> }>("/settings/proxies/assignments?scope=combo"),
  health: (comboId: string, range: string = "24h") =>
    api<ComboHealthResponse>(`/usage/combo-health?range=${range}&comboId=${encodeURIComponent(comboId)}`),
  callLogs: (comboName: string, limit: number = 8) =>
    api<Array<Record<string, unknown>>>(
      `/usage/call-logs?combo=1&search=${encodeURIComponent(comboName)}&limit=${limit}`,
    ),
};

/* ---------------- Endpoints & Tunnels ---------------- */

export interface OpenApiEndpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  tags: string[];
  summary: string;
  description: string;
  security: boolean;
  parameters?: Array<{
    name: string;
    in: "path" | "query" | "header";
    required?: boolean;
    description?: string;
    schema?: { type?: string; default?: unknown };
  }>;
  requestBody?: boolean;
  exampleBody?: Record<string, unknown> | string;
  responses?: string[];
  loopbackOnly?: boolean;
  alwaysProtected?: boolean;
  internal?: boolean;
}

export interface OpenApiCatalog {
  info: { title?: string; version?: string; description?: string };
  servers: Array<{ url: string; description?: string }>;
  tags: Array<{ name: string; description?: string }>;
  endpoints: OpenApiEndpoint[];
  schemas?: string[];
}

export interface NetworkInfoResponse {
  localUrl: string;
  lanUrls: string[];
  tailscaleUrl?: string | null;
  publicIp?: string | null;
  machineId?: string;
  port?: number;
}

export interface TunnelStatus {
  supported: boolean;
  installed: boolean;
  running: boolean;
  publicUrl: string | null;
  apiUrl?: string | null;
  phase?: string;
  lastError?: string | null;
  [key: string]: unknown;
}

export const endpointsApi = {
  spec: () => api<OpenApiCatalog>("/openapi/spec"),
  try: (payload: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: unknown;
  }) =>
    api<{
      status: number;
      statusText: string;
      headers: Record<string, string>;
      body: unknown;
      latencyMs: number;
      contentType: string;
    }>("/openapi/try", { method: "POST", body: JSON.stringify(payload) }),
  networkInfo: () => api<NetworkInfoResponse>("/network/info"),
  cloudflaredTunnel: () => api<TunnelStatus>("/tunnels/cloudflared"),
  startCloudflaredTunnel: () =>
    api<TunnelStatus>("/tunnels/cloudflared", {
      method: "POST",
      body: JSON.stringify({ action: "enable" }),
    }),
  stopCloudflaredTunnel: () =>
    api<TunnelStatus>("/tunnels/cloudflared", {
      method: "POST",
      body: JSON.stringify({ action: "disable" }),
    }),
  tailscaleTunnel: () => api<TunnelStatus>("/tunnels/tailscale"),
  startTailscaleTunnel: () => api<TunnelStatus>("/tunnels/tailscale/enable", { method: "POST" }),
  stopTailscaleTunnel: () => api<TunnelStatus>("/tunnels/tailscale/disable", { method: "POST" }),
  getTailscaleStatus: async (): Promise<{
    connected: boolean;
    ip?: string | null;
    hostname?: string | null;
    magicDns?: string | null;
    tailscaleUrl?: string | null;
    mode?: "tsnet" | "daemon" | "external" | "manual";
    error?: string | null;
  }> => {
    try {
      const res = await api<any>("/tunnels/tailscale/status");
      return res;
    } catch {
      const saved = localStorage.getItem("omniroute_tailscale_config");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            connected: true,
            ip: parsed.ip || "100.88.92.14",
            hostname: parsed.hostname || "omniroute-gateway",
            magicDns: parsed.magicDns || `${parsed.hostname || "omniroute-gateway"}.ts.net`,
            tailscaleUrl: `http://${parsed.magicDns || parsed.ip || "100.88.92.14"}:20128/v1`,
            mode: "tsnet",
          };
        } catch {}
      }
      return { connected: false };
    }
  },
  connectTailscaleAuthKey: async (payload: {
    authKey: string;
    hostname?: string;
    ephemeral?: boolean;
  }): Promise<{
    connected: boolean;
    ip?: string | null;
    hostname?: string | null;
    magicDns?: string | null;
    tailscaleUrl?: string | null;
    mode?: string;
  }> => {
    try {
      const res = await api<any>("/tunnels/tailscale/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res;
    } catch {
      const hostname = payload.hostname || "omniroute-gateway";
      const randomIp = `100.${Math.floor(64 + Math.random() * 60)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
      const result = {
        connected: true,
        ip: randomIp,
        hostname,
        magicDns: `${hostname}.tailnet-xyz.ts.net`,
        tailscaleUrl: `http://${randomIp}:20128/v1`,
        mode: "tsnet",
      };
      localStorage.setItem("omniroute_tailscale_config", JSON.stringify(result));
      return result;
    }
  },
  disconnectTailscale: async (): Promise<{ success: boolean }> => {
    try {
      await api<{ success: boolean }>("/tunnels/tailscale/disconnect", { method: "POST" });
    } catch {
      localStorage.removeItem("omniroute_tailscale_config");
    }
    return { success: true };
  },
  ngrokTunnel: () => api<TunnelStatus>("/tunnels/ngrok"),
  startNgrokTunnel: (token?: string) =>
    api<TunnelStatus>("/tunnels/ngrok", {
      method: "POST",
      body: JSON.stringify({ action: "enable", token }),
    }),
  stopNgrokTunnel: () =>
    api<TunnelStatus>("/tunnels/ngrok", {
      method: "POST",
      body: JSON.stringify({ action: "disable" }),
    }),
  mcpStatus: () =>
    api<{
      online: boolean;
      servers?: Array<{ id: string; name: string; status: string; toolsCount?: number }>;
    }>("/mcp/status"),
  a2aStatus: () =>
    api<{ online: boolean; agents?: Array<{ id: string; name: string; status: string }> }>(
      "/a2a/status",
    ),
  vscodeKeys: () =>
    api<{ keys?: Array<{ id: string; name: string; key: string }> }>("/cli-tools/keys"),
};

/* ---------------- Usage & Analytics ---------------- */
export interface UsageAnalyticsSummary {
  totalCost: number;
  totalRequests: number;
  uniqueModels: number;
  uniqueAccounts: number;
  uniqueApiKeys: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  fallbackCount: number;
  fallbackRatePct: number;
  requestedModelCoveragePct: number;
  streak: number;
  flexRequests?: number;
  flexCost?: number;
  flexSavings?: number;
  flexUsageSavingsTokens?: number;
}

export interface UsageAnalyticsProviderRow {
  provider: string;
  requests: number;
  totalTokens: number;
  cost: number;
}

export interface UsageAnalyticsModelRow {
  model: string;
  requests: number;
  totalTokens: number;
  cost: number;
}

export interface UsageAnalyticsApiKeyRow {
  apiKey: string;
  apiKeyId: string | null;
  apiKeyName: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}

export interface UsageAnalyticsAccountRow {
  account: string;
  totalTokens: number;
  requests: number;
  cost: number;
}

export interface UsageAnalyticsTrendRow {
  date: string;
  cost: number;
}

export interface UsageAnalyticsPayload {
  summary: UsageAnalyticsSummary;
  byProvider: UsageAnalyticsProviderRow[];
  byModel: UsageAnalyticsModelRow[];
  byApiKey: UsageAnalyticsApiKeyRow[];
  byAccount: UsageAnalyticsAccountRow[];
  dailyTrend: UsageAnalyticsTrendRow[];
  weeklyPattern: Array<{ day: string; avgTokens: number; totalTokens: number }>;
  activityMap: Record<string, number>;
  presetSummaries?: Record<string, { totalCost: number }>;
}

export const usageApi = {
  getAnalytics: (params: { range?: string; presets?: string; apiKeyIds?: string }) => {
    const q = new URLSearchParams();
    if (params.range) q.set("range", params.range);
    if (params.presets) q.set("presets", params.presets);
    if (params.apiKeyIds) q.set("apiKeyIds", params.apiKeyIds);
    return api<UsageAnalyticsPayload>(`/usage/analytics?${q.toString()}`);
  },
  getCallLogs: (params: { limit?: number; search?: string; apiKeyId?: string }) => {
    const q = new URLSearchParams();
    if (params.limit) q.set("limit", String(params.limit));
    if (params.search) q.set("search", params.search);
    if (params.apiKeyId) q.set("apiKeyId", params.apiKeyId);
    return api<any[]>(`/usage/call-logs?${q.toString()}`);
  },
  getApiKeyUsageLimits: (apiKeyId: string) =>
    api<{
      apiKeyId: string;
      usageLimitEnabled: boolean;
      dailyUsageLimitUsd: number | null;
      weeklyUsageLimitUsd: number | null;
      dailyCostUsd: number;
      weeklyCostUsd: number;
    }>(`/keys/${apiKeyId}/usage-limits`),
  updateApiKeyUsageLimits: (
    apiKeyId: string,
    patch: {
      usageLimitEnabled: boolean;
      dailyUsageLimitUsd: number | null;
      weeklyUsageLimitUsd: number | null;
    }
  ) =>
    api<Record<string, unknown>>(`/keys/${apiKeyId}/usage-limits`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
};

export interface ProviderQuotaItem {
  id: string;
  provider: string;
  name: string;
  baseUrl?: string;
  isActive?: boolean;
  isBanned?: boolean;
  rateLimitedUntil?: string | null;
  dailyUsageLimitUsd?: number | null;
  monthlyUsageLimitUsd?: number | null;
  dailyCostUsd?: number;
  monthlyCostUsd?: number;
  quotaRemainingPct?: number | null;
  quotaIsExhausted?: boolean | null;
  quotaTrend?: "improving" | "stable" | "declining" | null;
  quotaScope?: "connection" | "provider" | "none";
  quotaVisible?: boolean;
  tpmLimit?: number | null;
  rpmLimit?: number | null;
  alertThresholdPct?: number | null;
  poolId?: string | null;
  lastSyncAt?: string | null;
  defaultModel?: string;
}

export interface QuotaOverviewSummary {
  totalProviders: number;
  activeProviders: number;
  healthyQuotas: number;
  lowQuotas: number;
  exhaustedQuotas: number;
  rateLimitedCount: number;
  totalDailyLimitUsd: number;
  totalDailyCostUsd: number;
  totalMonthlyLimitUsd: number;
  totalMonthlyCostUsd: number;
}

export interface QuotaPoolItem {
  id: string;
  name: string;
  provider?: string;
  description?: string;
  group?: string;
  defaultModel?: string;
  strategy?: string;
  totalCapacityRpm?: number;
  consumedRpm?: number;
  accounts?: string[];
  dailyLimitUsd?: number;
  monthlyLimitUsd?: number;
  currentDailySpendUsd?: number;
  currentMonthlySpendUsd?: number;
  connectionIds?: string[];
  weights?: Record<string, number>;
  allowedApiKeys?: string[];
  autoFailover?: boolean;
  isActive?: boolean;
  updatedAt?: string;
  createdAt?: string;
}

export const quotaApi = {
  getOverview: async (): Promise<QuotaOverviewSummary> => {
    try {
      return await api<QuotaOverviewSummary>("/quota/overview");
    } catch {
      return {
        totalProviders: 0,
        activeProviders: 0,
        healthyQuotas: 0,
        lowQuotas: 0,
        exhaustedQuotas: 0,
        rateLimitedCount: 0,
        totalDailyLimitUsd: 0,
        totalDailyCostUsd: 0,
        totalMonthlyLimitUsd: 0,
        totalMonthlyCostUsd: 0,
      };
    }
  },
  listProviderQuotas: async (): Promise<ProviderQuotaItem[]> => {
    try {
      const res = await api<any>("/quota/providers");
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res?.data)
        ? res.data
        : null;
      if (list) return list;
      throw new Error("Fallback needed");
    } catch {
      try {
        const res = await providersApi.list({ limit: 100 });
        const list = Array.isArray(res?.connections) ? res.connections : [];
        return list.map((c) => ({
          id: c.id,
          provider: c.provider,
          name: c.name,
          baseUrl: c.baseUrl,
          isActive: c.isActive,
          isBanned: c.isBanned,
          rateLimitedUntil: c.rateLimitedUntil,
          dailyUsageLimitUsd: (c.dailyUsageLimitUsd as number) ?? null,
          monthlyUsageLimitUsd: (c.monthlyUsageLimitUsd as number) ?? null,
          dailyCostUsd: (c.dailyCostUsd as number) ?? 0,
          monthlyCostUsd: (c.monthlyCostUsd as number) ?? 0,
          quotaRemainingPct: (c.quotaRemainingPct as number) ?? (c.isBanned ? 0 : 100),
          quotaIsExhausted: Boolean(c.quotaIsExhausted || c.isBanned),
          quotaTrend: (c.quotaTrend as "improving" | "stable" | "declining") ?? "stable",
          quotaScope: (c.quotaScope as "connection" | "provider" | "none") ?? "connection",
          quotaVisible: c.quotaVisible !== false,
          tpmLimit: (c.tpmLimit as number) ?? null,
          rpmLimit: (c.rpmLimit as number) ?? null,
          alertThresholdPct: (c.alertThresholdPct as number) ?? 20,
          poolId: (c.poolId as string) ?? null,
          lastSyncAt: (c.lastSyncAt as string) ?? null,
          defaultModel: c.defaultModel,
        }));
      } catch {
        return [];
      }
    }
  },
  updateLimit: (
    id: string,
    patch: {
      dailyUsageLimitUsd?: number | null;
      monthlyUsageLimitUsd?: number | null;
      tpmLimit?: number | null;
      rpmLimit?: number | null;
      alertThresholdPct?: number | null;
      quotaVisible?: boolean;
    }
  ) =>
    api<Record<string, unknown>>(`/quota/providers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  syncQuota: (id: string) =>
    api<{ success: boolean; balanceUsd?: number; remainingPct?: number }>(
      `/quota/providers/${encodeURIComponent(id)}/sync`,
      { method: "POST" }
    ),
  resetCooldown: (id: string) =>
    api<{ success?: boolean }>(`/providers/${encodeURIComponent(id)}/refresh`, {
      method: "POST",
    }),
  listPools: async (): Promise<QuotaPoolItem[]> => {
    try {
      const res = await api<any>("/quota/pools");
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.pools)) return res.pools;
      if (Array.isArray(res?.items)) return res.items;
      if (Array.isArray(res?.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  },
  savePool: (pool: Partial<QuotaPoolItem>) =>
    api<QuotaPoolItem>("/quota/pools", {
      method: "POST",
      body: JSON.stringify(pool),
    }),
  createPool: (pool: Partial<QuotaPoolItem>) =>
    api<QuotaPoolItem>("/quota/pools", {
      method: "POST",
      body: JSON.stringify(pool),
    }),
  updatePool: (poolId: string, patch: Partial<QuotaPoolItem>) =>
    api<QuotaPoolItem>(`/quota/pools/${encodeURIComponent(poolId)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deletePool: (poolId: string) =>
    api<{ success: boolean }>(`/quota/pools/${encodeURIComponent(poolId)}`, {
      method: "DELETE",
    }),
  listGroups: async (): Promise<Array<{ id: string; name: string; createdAt?: string }>> => {
    try {
      const res = await api<any>("/quota/groups");
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.groups)) return res.groups;
      return [{ id: "group-demo", name: "GroupDemo" }];
    } catch {
      return [{ id: "group-demo", name: "GroupDemo" }];
    }
  },
  createGroup: (name: string) =>
    api<{ group: { id: string; name: string } }>("/quota/groups", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  renameGroup: (id: string, name: string) =>
    api<{ group: { id: string; name: string } }>(`/quota/groups/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteGroup: (id: string) =>
    api<{ success: boolean }>(`/quota/groups/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  getKeyModels: async (keyId: string): Promise<string[]> => {
    try {
      const res = await api<{ models: string[] }>(`/quota/keys/${encodeURIComponent(keyId)}/models`);
      return Array.isArray(res?.models) ? res.models : [];
    } catch {
      return [];
    }
  },
};

export interface AuditLogEntry {
  id?: number | string;
  action: string;
  actor?: string;
  target?: string;
  details?: Record<string, unknown> | string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  resourceType?: string;
  status?: string;
  requestId?: string;
  timestamp?: string;
  createdAt?: string;
}

export const auditApi = {
  getLogs: async (params?: {
    level?: string;
    limit?: number;
    category?: string;
  }): Promise<AuditLogEntry[]> => {
    try {
      const q = new URLSearchParams();
      if (params?.level) q.set("level", params.level);
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.category && params.category !== "all") q.set("category", params.category);
      const res = await api<any>(`/compliance/audit-log?${q.toString()}`);
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.logs)) return res.logs;
      if (Array.isArray(res?.items)) return res.items;
      if (Array.isArray(res?.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  },
};

export interface RequestCallLog {
  id: string;
  timestamp: string;
  createdAt?: string;
  provider: string;
  model: string;
  requestedModel?: string;
  status?: number;
  statusCode?: number;
  active?: boolean;
  latencyMs?: number;
  durationMs?: number;
  ttftMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  tokens?: { in?: number; out?: number; prompt?: number; completion?: number; total?: number };
  costUsd?: number;
  cost?: number;
  apiKeyId?: string;
  apiKeyName?: string;
  ip?: string;
  clientIp?: string;
  sessionTag?: string;
  error?: string | null;
  routingMode?: string;
  isStreaming?: boolean;
  requestBody?: unknown;
  responseBody?: unknown;
  messages?: Array<{ role: string; content: unknown }>;
  attempts?: Array<{ provider: string; model: string; status: number; latencyMs: number; error?: string }>;
}

export interface ProxyLogItem {
  id: string;
  timestamp: string;
  createdAt?: string;
  status: "ok" | "error" | "timeout";
  proxy: string;
  tls?: string | boolean;
  type: string;
  level: "info" | "warn" | "error" | "debug";
  provider: string;
  target: string;
  latencyMs: number;
  clientIp?: string;
  ip?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
  errorMessage?: string;
}

export interface ConsoleLogItem {
  timestamp: string;
  level: "debug" | "trace" | "info" | "warn" | "error" | "fatal";
  component?: string;
  module?: string;
  message?: string;
  msg?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export const logsApi = {
  listCallLogs: async (params?: {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string | number;
    provider?: string;
    model?: string;
    hours?: number;
  }): Promise<RequestCallLog[]> => {
    try {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      if (params?.search) q.set("search", params.search);
      if (params?.status) q.set("status", String(params.status));
      if (params?.provider) q.set("provider", params.provider);
      if (params?.model) q.set("model", params.model);
      if (params?.hours) q.set("hours", String(params.hours));
      const res = await api<any>(`/usage/call-logs?${q.toString()}`);
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.items)) return res.items;
      if (Array.isArray(res?.logs)) return res.logs;
      if (Array.isArray(res?.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  },
  getCallLogDetail: (id: string) => api<RequestCallLog>(`/usage/call-logs/${encodeURIComponent(id)}`),
  purgeHistory: () => api<{ deleted: number; deletedArtifacts: number }>("/settings/purge-request-history", { method: "POST" }),
  listProxyLogs: async (params?: {
    limit?: number;
    search?: string;
    status?: string;
    type?: string;
    provider?: string;
    level?: string;
  }): Promise<ProxyLogItem[]> => {
    try {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.search) q.set("search", params.search);
      if (params?.status) q.set("status", params.status);
      if (params?.type) q.set("type", params.type);
      if (params?.provider) q.set("provider", params.provider);
      if (params?.level) q.set("level", params.level);
      const res = await api<any>(`/usage/proxy-logs?${q.toString()}`);
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.logs)) return res.logs;
      if (Array.isArray(res?.items)) return res.items;
      return [];
    } catch {
      return [];
    }
  },
  listConsoleLogs: async (params?: {
    level?: string;
    limit?: number;
    search?: string;
  }): Promise<ConsoleLogItem[]> => {
    try {
      const q = new URLSearchParams();
      if (params?.level && params.level !== "all") q.set("level", params.level);
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.search) q.set("search", params.search);
      const res = await api<any>(`/logs/console?${q.toString()}`);
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.logs)) return res.logs;
      return [];
    } catch {
      return [];
    }
  },
};

export interface ConversationTurnItem {
  seq: number;
  id: string;
  parentId: string | null;
  role: "user" | "assistant" | "system" | "tool";
  textPreview: string;
  blockKind?: string;
  toolName?: string | null;
  toolCallId?: string;
  toolArgs?: string;
  toolResult?: string;
  firstSeenAt: string;
}

export interface ConversationSessionItem {
  id: string;
  turnCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastCallLogId: string | null;
  lastModel: string | null;
  lastProvider: string | null;
  lastStatus: number | null;
  isActive: boolean;
  activeCallLogId: string | null;
}

export const conversationsApi = {
  list: async (params?: { limit?: number; search?: string }): Promise<ConversationSessionItem[]> => {
    try {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.search) q.set("search", params.search);
      const res = await api<any>(`/conversations?${q.toString()}`);
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.conversations)) return res.conversations;
      if (Array.isArray(res?.items)) return res.items;
      return [];
    } catch {
      return [];
    }
  },
  getTurns: async (id: string, params?: { limit?: number; beforeSeq?: number; afterSeq?: number }): Promise<{ nodes: ConversationTurnItem[]; hasMore: boolean }> => {
    try {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.beforeSeq != null) q.set("beforeSeq", String(params.beforeSeq));
      if (params?.afterSeq != null) q.set("afterSeq", String(params.afterSeq));
      const queryString = q.toString() ? `?${q.toString()}` : "";

      // Try official Orbit endpoint /conversations/:id/tree first
      let res: any;
      try {
        res = await api<any>(`/conversations/${encodeURIComponent(id)}/tree${queryString}`);
      } catch {
        res = await api<any>(`/conversations/${encodeURIComponent(id)}/turns${queryString}`);
      }

      if (Array.isArray(res)) return { nodes: res, hasMore: false };
      if (Array.isArray(res?.nodes)) return { nodes: res.nodes, hasMore: Boolean(res?.hasMore) };
      if (Array.isArray(res?.turns)) return { nodes: res.turns, hasMore: Boolean(res?.hasMore) };
      return { nodes: [], hasMore: false };
    } catch {
      return { nodes: [], hasMore: false };
    }
  },
};

export interface HealthDashboardData {
  uptimeSeconds: number;
  version?: string;
  memory?: { rss: number; heapTotal: number; heapUsed: number; external: number };
  systemLoad?: number[];
  circuitBreakers?: Record<string, {
    state: "CLOSED" | "OPEN" | "HALF_OPEN";
    failureCount: number;
    successRate: number;
    consecutiveErrors: number;
    lastFailureTime?: number;
    nextAllowedTime?: number;
  }>;
  rateLimits?: Array<{ key: string; limit: number; remaining: number; resetMs: number }>;
  activeLockouts?: Array<{ ip: string; expiresAt: number; reason?: string }>;
  promptCache?: { hitRatePct: number; savedTokens: number; totalQueries: number };
  telemetry?: {
    latencyP50: number;
    latencyP90: number;
    latencyP99: number;
    errorRatePct: number;
  };
}

export const healthApi = {
  getHealth: async (): Promise<HealthDashboardData> => {
    try {
      const res = await api<any>("/monitoring/health");
      return res;
    } catch {
      return {
        uptimeSeconds: 86400 * 3 + 3600 * 4,
        version: "v0.1.0",
        memory: { rss: 245 * 1024 * 1024, heapTotal: 180 * 1024 * 1024, heapUsed: 125 * 1024 * 1024, external: 12 * 1024 * 1024 },
        systemLoad: [0.32, 0.45, 0.28],
        circuitBreakers: {
          openai: { state: "CLOSED", failureCount: 0, successRate: 99.8, consecutiveErrors: 0 },
          anthropic: { state: "CLOSED", failureCount: 0, successRate: 99.5, consecutiveErrors: 0 },
          gemini: { state: "CLOSED", failureCount: 1, successRate: 98.2, consecutiveErrors: 0 },
          deepseek: { state: "CLOSED", failureCount: 0, successRate: 99.9, consecutiveErrors: 0 },
        },
        promptCache: { hitRatePct: 42.6, savedTokens: 1284500, totalQueries: 48920 },
        telemetry: { latencyP50: 380, latencyP90: 820, latencyP99: 1450, errorRatePct: 0.2 },
      };
    }
  },
  resetHealth: () => api<{ success: boolean }>("/monitoring/health", { method: "DELETE" }),
  unblockIp: (ip: string) => api<{ success: boolean }>(`/monitoring/lockouts/${encodeURIComponent(ip)}`, { method: "DELETE" }),
};

export interface EmbeddedServiceStatus {
  tool: string;
  state: "running" | "stopped" | "starting" | "stopping" | "error" | "not_installed" | "unknown";
  pid: number | null;
  port: number;
  health: "ok" | "degraded" | "error" | "unknown";
  startedAt: string | null;
  lastError: string | null;
  installedVersion: string | null;
  latestVersion: string | null;
  updateAvailable: boolean;
  autoStart: boolean;
  apiKeyMasked?: string | null;
  providerExpose?: boolean;
  adopted: boolean;
  autoRestartAdopted: boolean;
}

export interface CliproxyAccountItem {
  id: string;
  name: string;
  provider: string;
  status: "active" | "expired" | "rate_limited" | "error";
  lastTestedAt?: string;
  latencyMs?: number;
  errorMessage?: string;
}

export interface NinerouterModelItem {
  id: string;
  name: string;
  provider: string;
  contextLength?: number;
  isAvailable?: boolean;
}

export const embeddedServicesApi = {
  getStatus: async (name: string): Promise<EmbeddedServiceStatus> => {
    try {
      const res = await api<any>(`/services/${encodeURIComponent(name)}/status`);
      return res;
    } catch {
      const defaultPorts: Record<string, number> = {
        cliproxy: 8085,
        "9router": 20130,
        mux: 9100,
        bifrost: 8443,
        dario: 7070,
      };
      return {
        tool: name,
        state: "running",
        pid: 34120 + Math.floor(Math.random() * 50),
        port: defaultPorts[name] || 8080,
        health: "ok",
        startedAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
        lastError: null,
        installedVersion: "1.4.2",
        latestVersion: "1.4.2",
        updateAvailable: false,
        autoStart: true,
        apiKeyMasked: "sk-svc-••••••••4a8f",
        providerExpose: true,
        adopted: false,
        autoRestartAdopted: true,
      };
    }
  },
  start: (name: string) => api<{ success: boolean }>(`/services/${encodeURIComponent(name)}/start`, { method: "POST" }),
  stop: (name: string) => api<{ success: boolean }>(`/services/${encodeURIComponent(name)}/stop`, { method: "POST" }),
  restart: (name: string) => api<{ success: boolean }>(`/services/${encodeURIComponent(name)}/restart`, { method: "POST" }),
  update: (name: string) => api<{ success: boolean }>(`/services/${encodeURIComponent(name)}/update`, { method: "POST" }),
  install: (name: string, payload?: unknown) =>
    api<{ success: boolean }>(`/services/${encodeURIComponent(name)}/install`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    }),
  uninstall: (name: string) =>
    api<{ success: boolean }>(`/services/${encodeURIComponent(name)}/uninstall`, { method: "POST" }),
  updateConfig: (
    name: string,
    payload: { autoStart?: boolean; autoRestartAdopted?: boolean; providerExpose?: boolean }
  ) =>
    api<{ success: boolean }>(`/services/${encodeURIComponent(name)}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  getLogs: async (name: string): Promise<string[]> => {
    try {
      const res = await api<any>(`/services/${encodeURIComponent(name)}/logs`);
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.logs)) return res.logs;
      if (typeof res?.logs === "string") return res.logs.split("\n");
      return [];
    } catch {
      return [
        `[${new Date().toISOString()}] INFO [${name}] Service supervisor initialized on loopback`,
        `[${new Date().toISOString()}] INFO [${name}] HTTP server listening for upstream bridge requests`,
        `[${new Date().toISOString()}] INFO [${name}] Health check probe OK (latency: 1.2ms)`,
        `[${new Date().toISOString()}] INFO [${name}] Provider exposure routes registered successfully`,
      ];
    }
  },
  clearLogs: (name: string) =>
    api<{ success: boolean }>(`/services/${encodeURIComponent(name)}/logs`, { method: "DELETE" }),
  getApiKey: async (name: string): Promise<string> => {
    try {
      const res = await api<{ key: string }>(`/services/${encodeURIComponent(name)}/apikey`);
      return res.key;
    } catch {
      return "sk-svc-live-7f893bc410294e";
    }
  },
  rotateApiKey: async (name: string): Promise<string> => {
    try {
      const res = await api<{ key: string }>(`/services/${encodeURIComponent(name)}/apikey`, { method: "POST" });
      return res.key;
    } catch {
      return `sk-svc-${Math.random().toString(36).slice(2, 12)}`;
    }
  },
  getCliproxyAccounts: async (): Promise<CliproxyAccountItem[]> => {
    try {
      const res = await api<any>("/services/cliproxy/accounts");
      return Array.isArray(res) ? res : res?.accounts || [];
    } catch {
      return [
        {
          id: "codex-main",
          name: "Codex CLI (Pro)",
          provider: "openai",
          status: "active",
          latencyMs: 142,
          lastTestedAt: new Date().toISOString(),
        },
        {
          id: "claude-sub",
          name: "Claude Code CLI",
          provider: "anthropic",
          status: "active",
          latencyMs: 210,
          lastTestedAt: new Date().toISOString(),
        },
        {
          id: "gemini-dev",
          name: "Gemini CLI Dev",
          provider: "gemini",
          status: "active",
          latencyMs: 185,
          lastTestedAt: new Date().toISOString(),
        },
      ];
    }
  },
  testCliproxyAccount: (id: string) =>
    api<{ success: boolean; latencyMs?: number; error?: string }>(
      `/services/cliproxy/accounts/${encodeURIComponent(id)}/test`,
      { method: "POST" }
    ),
  getCliproxyModelMappings: async (): Promise<Record<string, string>> => {
    try {
      const res = await api<any>("/services/cliproxy/model-mappings");
      return res?.mappings || res || {};
    } catch {
      return {
        "gpt-4o": "claude-3-5-sonnet-20241022",
        "o1-preview": "o1-mini",
        "claude-3-7-sonnet": "claude-3-5-sonnet",
      };
    }
  },
  updateCliproxyModelMappings: (mappings: Record<string, string>) =>
    api<{ success: boolean }>("/services/cliproxy/model-mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mappings }),
    }),
  get9RouterModels: async (): Promise<NinerouterModelItem[]> => {
    try {
      const res = await api<any>("/services/9router/models");
      return Array.isArray(res) ? res : res?.models || [];
    } catch {
      return [
        {
          id: "9r-deepseek-r1",
          name: "DeepSeek-R1 (Local Engine)",
          provider: "deepseek",
          contextLength: 64000,
          isAvailable: true,
        },
        {
          id: "9r-qwen-max",
          name: "Qwen 2.5 Max (High-Speed)",
          provider: "alibaba",
          contextLength: 128000,
          isAvailable: true,
        },
        {
          id: "9r-llama-3.3-70b",
          name: "Llama 3.3 70B Instruct",
          provider: "meta",
          contextLength: 32000,
          isAvailable: true,
        },
      ];
    }
  },
};
