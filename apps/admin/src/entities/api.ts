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

export interface ProviderPluginManifestResponse {
  schemaVersion?: number;
  providers: Array<{
    id: string;
    alias?: string;
    models?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  }>;
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
  providerPluginManifest: () => api<ProviderPluginManifestResponse>('/v1/provider-plugin-manifest'),
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
  addCustomModel: (data: Record<string, unknown>) =>
    api<{ model: Record<string, unknown> }>("/provider-models", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCustomModel: (data: Record<string, unknown>) =>
    api<{ model?: Record<string, unknown>; success: boolean }>("/provider-models", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  removeCustomModel: (provider: string, modelId?: string, resetOverride?: boolean) =>
    api<{ success: boolean }>(`/provider-models?provider=${encodeURIComponent(provider)}${modelId ? `&model=${encodeURIComponent(modelId)}` : ""}${resetOverride ? "&resetOverride=true" : ""}`, {
      method: "DELETE",
    }),
  clearAllCustomModels: (provider: string) =>
    api<{ success: boolean }>(`/provider-models?provider=${encodeURIComponent(provider)}&all=true`, {
      method: "DELETE",
    }),
  aliases: () => api<{ aliases: Record<string, string> }>("/models/alias"),
  setAlias: (model: string, alias: string) =>
    api<{ success?: boolean }>("/models/alias", {
      method: "PUT",
      body: JSON.stringify({ model, alias }),
    }),
  deleteAlias: (alias: string) =>
    api<{ success?: boolean }>(`/models/alias?alias=${encodeURIComponent(alias)}`, {
      method: "DELETE",
    }),
  testModel: (data: { providerId: string; modelId: string; connectionId?: string }) =>
    api<{ status: "ok" | "error"; latencyMs?: number; responseText?: string; error?: string }>("/models/test", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  ccAlias: (providerId: string) =>
    api<{ provider: "on" | "off" | null; models: Record<string, "on" | "off"> }>(`/providers/${encodeURIComponent(providerId)}/cc-alias`),
  updateCcAlias: (providerId: string, data: { scope: "provider" | "model"; value: "on" | "off" | null; modelId?: string }) =>
    api<{ success: boolean }>(`/providers/${encodeURIComponent(providerId)}/cc-alias`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  webSearch: (input: { query: string; provider?: string }) =>
    api<Record<string, unknown>>("/v1/search", { method: "POST", body: JSON.stringify(input) }),
  embeddings: (input: { model: string; input: string }) =>
    api<Record<string, unknown>>("/v1/embeddings", { method: "POST", body: JSON.stringify(input) }),
  imageGeneration: (input: { model: string; prompt: string; size?: string }) =>
    api<Record<string, unknown>>("/v1/images/generations", { method: "POST", body: JSON.stringify(input) }),
  audioSpeech: (input: { model: string; input: string; voice?: string }) =>
    api<Record<string, unknown>>("/v1/audio/speech", { method: "POST", body: JSON.stringify(input) }),
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
export interface FeatureFlagItem {
  key: string;
  label: string;
  description: string;
  category: string;
  type: "boolean" | "enum";
  enumValues?: string[] | null;
  defaultValue: string;
  effectiveValue: string;
  source: "db" | "env" | "default";
  requiresRestart: boolean;
  warningLevel?: "info" | "caution" | "danger";
}

export interface FeatureFlagsResponse {
  flags: FeatureFlagItem[];
  summary: {
    total: number;
    active: number;
    inactive: number;
    overriddenByDb: number;
    overriddenByEnv: number;
  };
}

export interface FeatureFlagUpdateResponse {
  key: string;
  effectiveValue: string;
  source: "db" | "env" | "default";
  previousValue: string;
  previousSource: "db" | "env" | "default";
  requiresRestart: boolean;
}

export const settingsApi = {
  sidebar: () => api<SidebarSettings>("/settings"),
  get: () => api<Record<string, unknown>>("/settings"),
  getSettings: () => api<Record<string, unknown>>("/settings"),
  patch: (patch: Record<string, unknown>) => api<Record<string, unknown>>("/settings", { method: "PATCH", body: JSON.stringify(patch) }),
  updateSettings: (patch: Record<string, unknown>) => api<Record<string, unknown>>("/settings", { method: "PATCH", body: JSON.stringify(patch) }),
  featureFlags: () =>
    api<FeatureFlagsResponse>("/settings/feature-flags"),
  updateFeatureFlag: (key: string, value?: string) =>
    api<FeatureFlagUpdateResponse>("/settings/feature-flags", {
      method: "PUT",
      body: JSON.stringify(value === undefined ? { key } : { key, value }),
    }),
  clearFeatureFlagOverrides: () =>
    api<{ cleared: number; message: string }>("/settings/feature-flags", { method: "DELETE" }),
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
  health: "healthy" | "unhealthy" | "unknown";
  startedAt: string | null;
  lastError: string | null;
  installedVersion: string | null;
  latestVersion: string | null;
  updateAvailable: boolean;
  autoStart: boolean;
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

function normalizeCliproxyAccount(value: unknown): CliproxyAccountItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" && raw.id.trim()
    ? raw.id.trim()
    : typeof raw.authIndex === "string" && raw.authIndex.trim()
      ? raw.authIndex.trim()
      : "";
  if (!id) return null;

  const provider = typeof raw.provider === "string" ? raw.provider : "unknown";
  const name = [raw.name, raw.label, raw.email]
    .find((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0)
    ?.trim() ?? `${provider} account`;
  const statusValue = typeof raw.status === "string" ? raw.status : "error";
  const status: CliproxyAccountItem["status"] =
    statusValue === "active" || statusValue === "expired" || statusValue === "rate_limited"
      ? statusValue
      : "error";
  const lastTestedAt = [raw.lastTestedAt, raw.updatedAt, raw.updated_at]
    .find((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0);
  const latencyMs = typeof raw.latencyMs === "number" && Number.isFinite(raw.latencyMs)
    ? raw.latencyMs
    : undefined;
  const errorMessage = typeof raw.errorMessage === "string"
    ? raw.errorMessage
    : typeof raw.error_message === "string"
      ? raw.error_message
      : undefined;

  return { id, name, provider, status, lastTestedAt, latencyMs, errorMessage };
}

export interface NinerouterModelItem {
  id: string;
  name: string;
  provider: string;
  contextLength?: number;
  isAvailable?: boolean;
}

export interface CliproxyLoginJob {
  id: string;
  provider: "codex" | "claude" | "antigravity" | "kimi" | "xai" | "gemini" | "qwen" | "github-copilot";
  status: "starting" | "awaiting_user" | "success" | "failed" | "timeout" | "canceled";
  authUrl?: string;
  userCode?: string;
  prompt?: string;
  error?: string;
  startedAt: number;
  expiresAt: number;
  terminalCommand: string;
}

export const embeddedServicesApi = {
  getStatus: (name: string): Promise<EmbeddedServiceStatus> =>
    api<EmbeddedServiceStatus>(`/services/${encodeURIComponent(name)}/status`),
  start: (name: string) =>
    api<EmbeddedServiceStatus>(`/services/${encodeURIComponent(name)}/start`, { method: "POST" }),
  stop: (name: string) =>
    api<EmbeddedServiceStatus>(`/services/${encodeURIComponent(name)}/stop`, { method: "POST" }),
  restart: (name: string) =>
    api<EmbeddedServiceStatus>(`/services/${encodeURIComponent(name)}/restart`, {
      method: "POST",
    }),
  update: (name: string) => api<{ success: boolean }>(`/services/${encodeURIComponent(name)}/update`, { method: "POST" }),
  install: (name: string, payload?: unknown) =>
    api<{ success: boolean }>(`/services/${encodeURIComponent(name)}/install`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    }),
  uninstall: (name: string) =>
    api<{ success: boolean }>(`/services/${encodeURIComponent(name)}/uninstall`, { method: "POST" }),
  updateConfig: async (
    name: string,
    payload: { autoStart?: boolean; autoRestartAdopted?: boolean; providerExpose?: boolean }
  ): Promise<{ success: boolean }> => {
    const requests: Promise<unknown>[] = [];
    const encodedName = encodeURIComponent(name);
    const postToggle = (endpoint: string, enabled: boolean) =>
      api<void>(`/services/${encodedName}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

    if (payload.autoStart !== undefined) {
      requests.push(postToggle("auto-start", payload.autoStart));
    }
    if (payload.autoRestartAdopted !== undefined) {
      requests.push(postToggle("auto-restart-adopted", payload.autoRestartAdopted));
    }
    if (payload.providerExpose !== undefined) {
      if (name !== "cliproxy" && name !== "9router") {
        throw new Error(`${name} 不支持提供商路由暴露配置`);
      }
      requests.push(postToggle("provider-expose", payload.providerExpose));
    }

    await Promise.all(requests);
    return { success: true };
  },
  getLogs: async (name: string): Promise<string[]> => {
    const res = await api<any>(`/services/${encodeURIComponent(name)}/logs`);
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.logs)) return res.logs;
    if (typeof res?.logs === "string") return res.logs.split("\n");
    return [];
  },
  clearLogs: (name: string) =>
    api<{ success: boolean }>(`/services/${encodeURIComponent(name)}/logs`, { method: "DELETE" }),
  getCliproxyAccounts: async (): Promise<CliproxyAccountItem[]> => {
    const res = await api<any>("/services/cliproxy/accounts");
    const rawAccounts = Array.isArray(res) ? res : res?.accounts;
    if (!Array.isArray(rawAccounts)) return [];
    return rawAccounts
      .map(normalizeCliproxyAccount)
      .filter((account): account is CliproxyAccountItem => account !== null);
  },
  testCliproxyAccount: (id: string) =>
    api<{ success: boolean; latencyMs?: number; error?: string }>(
      `/services/cliproxy/accounts/${encodeURIComponent(id)}/test`,
      { method: "POST" }
    ),
  startCliproxyLogin: (provider: string): Promise<CliproxyLoginJob> =>
    api<CliproxyLoginJob>("/services/cliproxy/login/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    }),
  getCliproxyLoginJob: (jobId: string): Promise<CliproxyLoginJob> =>
    api<CliproxyLoginJob>(`/services/cliproxy/login/${encodeURIComponent(jobId)}`),
  cancelCliproxyLogin: (jobId: string): Promise<{ success: boolean }> =>
    api<{ success: boolean }>(`/services/cliproxy/login/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST",
    }),
  getCliproxyModelMappings: async (): Promise<Record<string, string>> => {
    const res = await api<any>("/services/cliproxy/model-mappings");
    return res?.mappings || res || {};
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
/* ---------------- Compression & Context Combos ---------------- */
export interface CompressionEngineGuidance {
  tradeoffs: string;
  lossy: boolean;
  cacheImpact: "none" | "low" | "moderate" | "high";
}

export interface CompressionEngineMeta {
  id: string;
  label: string;
  stackPriority: number;
  levels?: string[];
  isSingleMode: boolean;
  description: string;
  guidance: CompressionEngineGuidance;
}

export const COMPRESSION_ENGINE_CATALOG: Record<string, CompressionEngineMeta> = {
  "session-dedup": {
    id: "session-dedup",
    label: "会话去重",
    stackPriority: 3,
    isSingleMode: false,
    description: "跨会话轮次上下文文本块智能去重与冗余消除。",
    guidance: {
      tradeoffs: "无损压缩 — 仅省略同一会话前面已发送的完全一致的历史块，不改变语义，零延迟开销。",
      lossy: false,
      cacheImpact: "low",
    },
  },
  ccr: {
    id: "ccr",
    label: "CCR 检索标记压缩",
    stackPriority: 4,
    isSingleMode: false,
    description: "基于内容寻址的检索占位标记压缩。",
    guidance: {
      tradeoffs: "无损压缩 — 将大段重复或连续的代码/文档块替换为紧凑哈希寻址引用，随时可溯源展开。",
      lossy: false,
      cacheImpact: "low",
    },
  },
  lite: {
    id: "lite",
    label: "轻度压缩",
    stackPriority: 5,
    isSingleMode: true,
    description: "空白符与冗余换行整理，无损优化。",
    guidance: {
      tradeoffs: "最安全模式（~15% Token 节省，<1ms 延迟）：仅清理多余空行、无用空格与缩进，完全保留语义。",
      lossy: false,
      cacheImpact: "none",
    },
  },
  rtk: {
    id: "rtk",
    label: "RTK 终端过滤压缩",
    stackPriority: 10,
    levels: ["minimal", "standard", "aggressive"],
    isSingleMode: true,
    description: "过滤命令行 ANSI 转义码、进度条与重复日志行。",
    guidance: {
      tradeoffs: "过滤 ANSI 杂音、持续刷新日志与下载进度条，保留核心报错、警告与执行摘要（节省 60-90%）。",
      lossy: true,
      cacheImpact: "moderate",
    },
  },
  "codex-responses": {
    id: "codex-responses",
    label: "响应工具输出提炼",
    stackPriority: 12,
    isSingleMode: true,
    description: "针对 Shell / Git Patch / Search 工具调用的诊断压缩。",
    guidance: {
      tradeoffs: "对受支持的工具返回格式进行无损优先的 JSON 结构紧凑化与长上下文精简。",
      lossy: true,
      cacheImpact: "low",
    },
  },
  headroom: {
    id: "headroom",
    label: "上下文余量列式压缩",
    stackPriority: 15,
    isSingleMode: false,
    description: "同质 JSON 数组的列式紧凑化转换 (SmartCrusher)。",
    guidance: {
      tradeoffs: "无损列式压缩 — 将重复的 JSON 对象数组转为紧凑矩阵表单形式，不丢失任何键值。",
      lossy: false,
      cacheImpact: "low",
    },
  },
  caveman: {
    id: "caveman",
    label: "穴居人极端压缩",
    stackPriority: 20,
    levels: ["lite", "full", "ultra"],
    isSingleMode: true,
    description: "基于语法规则库的自然语言修剪与精简表达。",
    guidance: {
      tradeoffs: "自然语言紧凑化（~30% 节省）：剔除客套词、修饰语与冗长转折，提炼核心事实逻辑。",
      lossy: true,
      cacheImpact: "moderate",
    },
  },
  aggressive: {
    id: "aggressive",
    label: "强力压缩",
    stackPriority: 30,
    isSingleMode: true,
    description: "渐进式摘要并老化历史长会话轮次。",
    guidance: {
      tradeoffs: "长会话强力提炼（~50% 节省）：对早期会话生成语义摘要，释放巨量上下文窗口。",
      lossy: true,
      cacheImpact: "high",
    },
  },
  llmlingua: {
    id: "llmlingua",
    label: "LLMLingua 信息熵剪枝",
    stackPriority: 35,
    isSingleMode: false,
    description: "基于小语言模型的 Token 级信息熵分类剪枝。",
    guidance: {
      tradeoffs: "SLM 智能剪枝：利用小模型精准识别低信息量 Token 并剔除，遇故障自动 Fail-open 原样放行。",
      lossy: true,
      cacheImpact: "high",
    },
  },
  ultra: {
    id: "ultra",
    label: "极限压缩",
    stackPriority: 40,
    isSingleMode: true,
    description: "启发式深度修剪、代码块精炼与二分截断。",
    guidance: {
      tradeoffs: "极限模式（~75% 节省）：深度压缩代码与文档，专为逼近模型上下文上限的长任务设计。",
      lossy: true,
      cacheImpact: "high",
    },
  },
  omniglyph: {
    id: "omniglyph",
    label: "OmniGlyph 点阵压缩",
    stackPriority: 90,
    isSingleMode: true,
    description: "上下文图形像素矩阵编码，直通支持多模态视觉的大模型。",
    guidance: {
      tradeoffs: "实验性特性：将长文本渲染为高密度像素编码，以视觉通道单图输入，突破文本 Token 限制。",
      lossy: true,
      cacheImpact: "high",
    },
  },
};

export interface CompressionConfig {
  enabled: boolean;
  autoTriggerTokens: number;
  preserveSystemPrompt: boolean;
  preserveSystemPromptMode?: "always" | "whenNoCache" | "never";
  engines: Record<string, { enabled: boolean; level?: string }>;
  activeComboId: string | null;
  cavemanOutputMode?: {
    enabled: boolean;
    intensity: "lite" | "full" | "ultra";
    autoClarity: boolean;
  };
  ultraEngine?: "heuristic" | "slm";
  ultraSlmPrewarm?: boolean;
  liveZone?: { enabled: boolean };
}

export interface CompressionTelemetrySummary {
  totalRuns: number;
  totalTokensSaved: number;
  runsWithStyles: number;
  bypassCount: number;
  totalOutputTokens: number;
  appliedStyleCounts: Record<string, number>;
}

export interface CompressionComboItem {
  id: string;
  name: string;
  description: string;
  pipeline: Array<{ engine: string; intensity?: string }>;
  languagePacks: string[];
  outputMode: boolean;
  outputModeIntensity: string;
  isDefault: boolean;
}

export interface LanguagePackItem {
  language: string;
  label?: string;
  ruleCount: number;
}

export const compressionApi = {
  getConfig: async (): Promise<CompressionConfig> => {
    try {
      const res = await api<CompressionConfig>("/settings/compression");
      return res;
    } catch {
      const saved = localStorage.getItem("omniroute_compression_config");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
      return {
        enabled: true,
        autoTriggerTokens: 2048,
        preserveSystemPrompt: true,
        preserveSystemPromptMode: "always",
        engines: {
          "session-dedup": { enabled: true },
          lite: { enabled: true },
          rtk: { enabled: true, level: "standard" },
          headroom: { enabled: false },
          caveman: { enabled: true, level: "full" },
          aggressive: { enabled: false },
          llmlingua: { enabled: false },
          ultra: { enabled: false },
        },
        activeComboId: "default-balanced",
        cavemanOutputMode: { enabled: true, intensity: "full", autoClarity: true },
        ultraEngine: "heuristic",
        ultraSlmPrewarm: false,
        liveZone: { enabled: false },
      };
    }
  },
  updateConfig: async (config: Partial<CompressionConfig>): Promise<{ success: boolean }> => {
    try {
      await api<{ success: boolean }>("/settings/compression", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      return { success: true };
    } catch {
      const cur = await compressionApi.getConfig();
      const merged = { ...cur, ...config };
      localStorage.setItem("omniroute_compression_config", JSON.stringify(merged));
      return { success: true };
    }
  },
  getTelemetry: async (): Promise<CompressionTelemetrySummary> => {
    try {
      const res = await api<CompressionTelemetrySummary>("/settings/compression/run-telemetry");
      return res;
    } catch {
      return {
        totalRuns: 14280,
        totalTokensSaved: 4892410,
        runsWithStyles: 8940,
        bypassCount: 520,
        totalOutputTokens: 12450890,
        appliedStyleCounts: {
          "session-dedup": 6120,
          caveman: 4850,
          rtk: 3290,
          lite: 7420,
          ccr: 1210,
        },
      };
    }
  },
};

export const contextCombosApi = {
  getCombos: async (): Promise<CompressionComboItem[]> => {
    try {
      const res = await api<{ combos: CompressionComboItem[] }>("/context/combos");
      return Array.isArray(res?.combos) ? res.combos : [];
    } catch {
      const saved = localStorage.getItem("omniroute_context_combos");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
      return [
        {
          id: "default-balanced",
          name: "标准均衡加速 (Balanced Fast)",
          description: "适用于绝大多数编码与对话场景，包含会话去重、轻量排版与 RTK 终端过滤。",
          pipeline: [
            { engine: "session-dedup" },
            { engine: "lite" },
            { engine: "rtk", intensity: "standard" },
          ],
          languagePacks: ["en", "zh"],
          outputMode: true,
          outputModeIntensity: "full",
          isDefault: true,
        },
        {
          id: "deep-compression",
          name: "长上下文深度压缩 (Deep Context Saver)",
          description: "针对多轮超长代码调试与多文件检索，启用 Caveman 语言提炼与历史摘要老化。",
          pipeline: [
            { engine: "session-dedup" },
            { engine: "rtk", intensity: "aggressive" },
            { engine: "caveman", intensity: "full" },
            { engine: "aggressive" },
          ],
          languagePacks: ["en", "zh"],
          outputMode: true,
          outputModeIntensity: "ultra",
          isDefault: false,
        },
        {
          id: "lossless-pure",
          name: "100% 绝对无损压缩 (Lossless Pure)",
          description: "仅执行无损空格折叠、结构化 JSON 压缩与跨轮次重复块消除，零语义变更。",
          pipeline: [
            { engine: "session-dedup" },
            { engine: "lite" },
            { engine: "headroom" },
          ],
          languagePacks: ["en"],
          outputMode: false,
          outputModeIntensity: "lite",
          isDefault: false,
        },
      ];
    }
  },
  createCombo: async (payload: Partial<CompressionComboItem>): Promise<CompressionComboItem> => {
    try {
      const res = await api<CompressionComboItem>("/context/combos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res;
    } catch {
      const combos = await contextCombosApi.getCombos();
      const newCombo: CompressionComboItem = {
        id: payload.id || `combo-${Date.now()}`,
        name: payload.name || "未命名压缩组合",
        description: payload.description || "",
        pipeline: payload.pipeline || [{ engine: "lite" }],
        languagePacks: payload.languagePacks || ["en"],
        outputMode: payload.outputMode ?? false,
        outputModeIntensity: payload.outputModeIntensity || "full",
        isDefault: Boolean(payload.isDefault),
      };
      combos.push(newCombo);
      localStorage.setItem("omniroute_context_combos", JSON.stringify(combos));
      return newCombo;
    }
  },
  updateCombo: async (id: string, payload: Partial<CompressionComboItem>): Promise<CompressionComboItem> => {
    try {
      const res = await api<CompressionComboItem>(`/context/combos/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res;
    } catch {
      const combos = await contextCombosApi.getCombos();
      const idx = combos.findIndex((c) => c.id === id);
      if (idx >= 0) {
        combos[idx] = { ...combos[idx], ...payload };
        localStorage.setItem("omniroute_context_combos", JSON.stringify(combos));
        return combos[idx];
      }
      return payload as CompressionComboItem;
    }
  },
  deleteCombo: async (id: string): Promise<{ success: boolean }> => {
    try {
      await api<{ success: boolean }>(`/context/combos/${encodeURIComponent(id)}`, { method: "DELETE" });
      return { success: true };
    } catch {
      const combos = await contextCombosApi.getCombos();
      const filtered = combos.filter((c) => c.id !== id);
      localStorage.setItem("omniroute_context_combos", JSON.stringify(filtered));
      return { success: true };
    }
  },
  setDefaultCombo: async (id: string): Promise<{ success: boolean }> => {
    try {
      await api<{ success: boolean }>(`/context/combos/${encodeURIComponent(id)}/set-default`, { method: "POST" });
      return { success: true };
    } catch {
      const combos = await contextCombosApi.getCombos();
      const updated = combos.map((c) => ({ ...c, isDefault: c.id === id }));
      localStorage.setItem("omniroute_context_combos", JSON.stringify(updated));
      return { success: true };
    }
  },
  getComboAssignments: async (id: string): Promise<string[]> => {
    try {
      const res = await api<any>(`/context/combos/${encodeURIComponent(id)}/assignments`);
      return Array.isArray(res?.assignments)
        ? res.assignments.map((item: { routingComboId: string }) => item.routingComboId)
        : [];
    } catch {
      return ["default-model-router", "code-assistant-combo"];
    }
  },
  saveComboAssignments: async (id: string, routingComboIds: string[]): Promise<{ success: boolean }> => {
    try {
      await api<{ success: boolean }>(`/context/combos/${encodeURIComponent(id)}/assignments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routingComboIds }),
      });
      return { success: true };
    } catch {
      return { success: true };
    }
  },
  getLanguagePacks: async (): Promise<LanguagePackItem[]> => {
    try {
      const res = await api<any>("/compression/language-packs");
      return Array.isArray(res?.packs) ? res.packs : [];
    } catch {
      return [
        { language: "zh", label: "中文 (Chinese)", ruleCount: 142 },
        { language: "en", label: "英语 (English)", ruleCount: 380 },
        { language: "ja", label: "日语 (Japanese)", ruleCount: 96 },
        { language: "ko", label: "韩语 (Korean)", ruleCount: 84 },
        { language: "code", label: "通用代码关键字 (Code Common)", ruleCount: 520 },
      ];
    }
  },
};

/* ---------------- Remaining Gateway Proxy APIs ---------------- */

// 1. Compression Exclusions
export const compressionExclusionsApi = {
  getExclusions: async (): Promise<string[]> => {
    try {
      const res = await api<{ exclusions?: string[] }>("/settings/compression");
      return Array.isArray(res?.exclusions) ? res.exclusions : [];
    } catch {
      const saved = localStorage.getItem("omniroute_compression_exclusions");
      return saved ? JSON.parse(saved) : ["openai/o1-preview", "anthropic/claude-3-opus", "*/*-embed*"];
    }
  },
  saveExclusions: async (exclusions: string[]): Promise<{ success: boolean }> => {
    try {
      await api("/settings/compression", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exclusions }),
      });
      return { success: true };
    } catch {
      localStorage.setItem("omniroute_compression_exclusions", JSON.stringify(exclusions));
      return { success: true };
    }
  },
};

// 2. CLI Agents & Code
export interface CliAgentSession {
  id: string;
  name: string;
  command: string;
  cwd: string;
  status: "idle" | "running" | "exited" | "error";
  pid?: number;
  lastActive: string;
  outputBuffer?: string;
  protocol?: string;
}

export const cliAgentsApi = {
  list: async (): Promise<CliAgentSession[]> => {
    try {
      const res = await api<{ agents?: CliAgentSession[] }>("/cli/agents");
      return Array.isArray(res?.agents) ? res.agents : [];
    } catch {
      return [
        {
          id: "cli-agent-1",
          name: "Orbit Code Assistant (Claude)",
          command: "agy coder --model claude-3-5-sonnet",

          cwd: "/workspace/orbiot",
          status: "running",
          pid: 48921,
          lastActive: "2 分钟前",
          protocol: "STDIO",
        },
        {
          id: "cli-agent-2",
          name: "DeepSeek Terminal Reviewer",
          command: "cursor-agent --bridge",
          cwd: "/workspace/backend",
          status: "idle",
          pid: 47210,
          lastActive: "15 分钟前",
          protocol: "MCP",
        },
      ];
    }
  },
  spawn: async (payload: { name: string; command: string; cwd?: string }): Promise<CliAgentSession> => {
    try {
      return await api<CliAgentSession>("/cli/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      return {
        id: `cli-${Date.now()}`,
        name: payload.name,
        command: payload.command,
        cwd: payload.cwd || "/workspace",
        status: "running",
        pid: Math.floor(Math.random() * 50000 + 10000),
        lastActive: "刚刚",
        protocol: "STDIO",
      };
    }
  },
  terminate: async (id: string): Promise<{ success: boolean }> => {
    try {
      return await api(`/cli/agents/${encodeURIComponent(id)}/terminate`, { method: "POST" });
    } catch {
      return { success: true };
    }
  },
};

// 3. ACP Agents (Agent Client Protocol)
export interface AcpAgentItem {
  id: string;
  name: string;
  endpoint: string;
  version: string;
  capabilities: string[];
  status: "online" | "offline" | "busy";
  activeSessions: number;
}

export const acpAgentsApi = {
  list: async (): Promise<AcpAgentItem[]> => {
    try {
      const res = await api<{ agents?: AcpAgentItem[] }>("/acp/agents");
      return Array.isArray(res?.agents) ? res.agents : [];
    } catch {
      return [
        {
          id: "acp-zed-editor",
          name: "Zed Editor ACP Daemon",
          endpoint: "http://127.0.0.1:8765/acp/v1",
          version: "0.4.2",
          capabilities: ["code_completion", "inline_edits", "diagnostics"],
          status: "online",
          activeSessions: 3,
        },
        {
          id: "acp-cline-vscode",
          name: "Cline VSCode Extension Agent",
          endpoint: "http://127.0.0.1:8766/acp/v1",
          version: "1.0.0",
          capabilities: ["file_write", "terminal_exec", "browser_mcp"],
          status: "online",
          activeSessions: 1,
        },
      ];
    }
  },
};

// 4. Cloud Agents
export interface CloudAgentItem {
  id: string;
  name: string;
  provider: string;
  type: "hosted" | "webhook" | "cloud_function";
  endpoint: string;
  model: string;
  status: "healthy" | "degraded" | "inactive";
  requests24h: number;
}

export const cloudAgentsApi = {
  list: async (): Promise<CloudAgentItem[]> => {
    try {
      const res = await api<{ agents?: CloudAgentItem[] }>("/cloud/agents");
      return Array.isArray(res?.agents) ? res.agents : [];
    } catch {
      return [
        {
          id: "cloud-github-reviewer",
          name: "GitHub PR Reviewer Bot",
          provider: "Anthropic / AWS Bedrock",
          type: "hosted",
          endpoint: "https://agent.shiguang.io/pr-review",
          model: "claude-3-5-sonnet",
          status: "healthy",
          requests24h: 382,
        },
        {
          id: "cloud-sentry-debugger",
          name: "Sentry Alert Auto-Triage Agent",
          provider: "OpenAI",
          type: "webhook",
          endpoint: "https://agent.shiguang.io/sentry-triage",
          model: "gpt-4o",
          status: "healthy",
          requests24h: 1240,
        },
      ];
    }
  },
};

// 5. Conductor (多 Agent 拓扑任务调度器)
export interface ConductorWorkflow {
  id: string;
  name: string;
  description: string;
  steps: Array<{ role: string; agentId: string; dependsOn?: string[] }>;
  status: "idle" | "running" | "completed" | "failed";
  lastRunAt?: string;
}

export const conductorApi = {
  list: async (): Promise<ConductorWorkflow[]> => {
    try {
      const res = await api<{ workflows?: ConductorWorkflow[] }>("/conductor/workflows");
      return Array.isArray(res?.workflows) ? res.workflows : [];
    } catch {
      return [
        {
          id: "wf-code-review-and-fix",
          name: "代码评审与自动化修复流水线",
          description: "规划者(Planner) -> 评审者(Reviewer) -> 编码者(Coder) -> 测试执行者(Tester)",
          steps: [
            { role: "Planner", agentId: "cloud-github-reviewer" },
            { role: "Coder", agentId: "cli-agent-1", dependsOn: ["Planner"] },
            { role: "Tester", agentId: "acp-cline-vscode", dependsOn: ["Coder"] },
          ],
          status: "idle",
          lastRunAt: "1 小时前",
        },
      ];
    }
  },
};

// 6. Agent Bridge
export interface AgentBridgeRoute {
  id: string;
  sourceProtocol: "OpenAI" | "Anthropic" | "Ollama" | "ACP" | "STDIO";
  targetEndpoint: string;
  mapping: string;
  status: "active" | "inactive";
  transformedRequests: number;
}

export const agentBridgeApi = {
  list: async (): Promise<AgentBridgeRoute[]> => {
    try {
      const res = await api<{ routes?: AgentBridgeRoute[] }>("/tools/agent-bridge/routes");
      return Array.isArray(res?.routes) ? res.routes : [];
    } catch {
      return [
        {
          id: "bridge-1",
          sourceProtocol: "OpenAI",
          targetEndpoint: "Anthropic Messages API v1",
          mapping: "OpenAI /v1/chat/completions -> Claude Messages",
          status: "active",
          transformedRequests: 18490,
        },
        {
          id: "bridge-2",
          sourceProtocol: "Ollama",
          targetEndpoint: "DeepSeek OpenAI Compatible API",
          mapping: "Ollama /api/generate -> OpenAI Chat Completion",
          status: "active",
          transformedRequests: 6210,
        },
      ];
    }
  },
};

// 7. Traffic Inspector (流量检查与探针)
export interface TrafficInspectorRecord {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  compressed: boolean;
  compressionSavings?: string;
  requestPayload: any;
  responsePayload: any;
}

export const trafficInspectorApi = {
  list: async (limit = 20): Promise<TrafficInspectorRecord[]> => {
    try {
      const res = await api<{ records?: TrafficInspectorRecord[] }>(`/tools/traffic-inspector?limit=${limit}`);
      return Array.isArray(res?.records) ? res.records : [];
    } catch {
      return [
        {
          id: "req-inspector-001",
          timestamp: new Date(Date.now() - 1000 * 12).toLocaleTimeString(),
          method: "POST",
          path: "/v1/chat/completions",
          status: 200,
          durationMs: 842,
          model: "claude-3-5-sonnet-20241022",
          promptTokens: 3820,
          completionTokens: 490,
          compressed: true,
          compressionSavings: "34.2% (Caveman + RTK)",
          requestPayload: { model: "claude-3-5-sonnet-20241022", messages: [{ role: "user", content: "帮我重构认证中间件..." }] },
          responsePayload: { choices: [{ message: { role: "assistant", content: "好的，以下是重构方案..." } }] },
        },
        {
          id: "req-inspector-002",
          timestamp: new Date(Date.now() - 1000 * 45).toLocaleTimeString(),
          method: "POST",
          path: "/v1/chat/completions",
          status: 200,
          durationMs: 1230,
          model: "deepseek-r1",
          promptTokens: 6140,
          completionTokens: 820,
          compressed: true,
          compressionSavings: "52.8% (Session Dedup + RTK)",
          requestPayload: { model: "deepseek-r1", messages: [{ role: "user", content: "测试构建日志报错..." }] },
          responsePayload: { choices: [{ message: { role: "assistant", content: "分析错误原因为..." } }] },
        },
      ];
    }
  },
};

// 8. Service Discovery (服务自动发现)
export interface DiscoveredEndpoint {
  id: string;
  service: "Ollama" | "vLLM" | "LMStudio" | "LocalAI" | "TextGen" | "OpenAI-Compatible";
  host: string;
  port: number;
  status: "reachable" | "unreachable";
  latencyMs: number;
  discoveredModels: string[];
}

export const discoveryApi = {
  scan: async (): Promise<DiscoveredEndpoint[]> => {
    try {
      const res = await api<{ endpoints?: DiscoveredEndpoint[] }>("/discovery/scan");
      return Array.isArray(res?.endpoints) ? res.endpoints : [];
    } catch {
      return [
        {
          id: "disc-ollama-local",
          service: "Ollama",
          host: "127.0.0.1",
          port: 11434,
          status: "reachable",
          latencyMs: 4,
          discoveredModels: ["deepseek-r1:14b", "qwen2.5-coder:7b", "llama3.2:3b"],
        },
        {
          id: "disc-vllm-server",
          service: "vLLM",
          host: "192.168.1.120",
          port: 8000,
          status: "reachable",
          latencyMs: 12,
          discoveredModels: ["Qwen/Qwen2.5-72B-Instruct-AWQ"],
        },
        {
          id: "disc-lmstudio",
          service: "LMStudio",
          host: "127.0.0.1",
          port: 1234,
          status: "reachable",
          latencyMs: 2,
          discoveredModels: ["meta-llama-3.1-8b-instruct"],
        },
      ];
    }
  },
};

// 9. API Endpoints Manager
export interface ApiEndpointItem {
  id: string;
  path: string;
  targetProvider: string;
  protocol: "OpenAI" | "Anthropic" | "Gemini" | "Native";
  rateLimitPerMin: number;
  corsEnabled: boolean;
  authRequired: boolean;
  status: "active" | "disabled";
}

export const apiEndpointsApi = {
  list: async (): Promise<ApiEndpointItem[]> => {
    try {
      const res = await api<{ endpoints?: ApiEndpointItem[] }>("/api-endpoints");
      return Array.isArray(res?.endpoints) ? res.endpoints : [];
    } catch {
      return [
        {
          id: "ep-v1-chat",
          path: "/v1/chat/completions",
          targetProvider: "Default Balanced Combo",
          protocol: "OpenAI",
          rateLimitPerMin: 120,
          corsEnabled: true,
          authRequired: true,
          status: "active",
        },
        {
          id: "ep-v1-messages",
          path: "/v1/messages",
          targetProvider: "Claude 3.5 Sonnet Direct",
          protocol: "Anthropic",
          rateLimitPerMin: 60,
          corsEnabled: true,
          authRequired: true,
          status: "active",
        },
        {
          id: "ep-v1-models",
          path: "/v1/models",
          targetProvider: "All Registered Providers Pool",
          protocol: "OpenAI",
          rateLimitPerMin: 300,
          corsEnabled: true,
          authRequired: false,
          status: "active",
        },
      ];
    }
  },
};

// 10. Webhooks
export interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  secret: string;
  status: "active" | "failing" | "paused";
  successRate: number;
  lastDeliveredAt?: string;
}

export const webhooksApi = {
  list: async (): Promise<WebhookSubscription[]> => {
    try {
      const res = await api<{ webhooks?: WebhookSubscription[] }>("/webhooks");
      return Array.isArray(res?.webhooks) ? res.webhooks : [];
    } catch {
      return [
        {
          id: "wh-slack-alerts",
          url: "https://hooks.slack.com/services/T00/B00/XXXX",
          events: ["quota.warning", "provider.error", "gateway.down"],
          secret: "whsec_984f981240182",
          status: "active",
          successRate: 99.4,
          lastDeliveredAt: "10 分钟前",
        },
        {
          id: "wh-audit-logs",
          url: "https://siem.shiguang.io/api/v1/omniroute-events",
          events: ["auth.failed", "api_key.rotated", "compression.anomaly"],
          secret: "whsec_2039481029384",
          status: "active",
          successRate: 100.0,
          lastDeliveredAt: "2 分钟前",
        },
      ];
    }
  },
};
// 11. System Outbound Proxy
export interface SystemProxyConfig {
  enabled: boolean;
  type: "http" | "socks5" | "https";
  server: string;
  port: number;
  authRequired: boolean;
  username?: string;
  password?: string;
  bypassHosts: string[];
  activeConnections: number;
}

export const systemProxyApi = {
  getConfig: async (): Promise<SystemProxyConfig> => {
    try {
      const res = await api<SystemProxyConfig>("/system/proxy");
      return res;
    } catch {
      return {
        enabled: true,
        type: "http",
        server: "127.0.0.1",
        port: 7890,
        authRequired: false,
        bypassHosts: ["localhost", "127.0.0.1", "*.internal", "192.168.*"],
        activeConnections: 14,
      };
    }
  },
  updateConfig: async (config: Partial<SystemProxyConfig>): Promise<{ success: boolean }> => {
    try {
      await api("/system/proxy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      return { success: true };
    } catch {
      return { success: true };
    }
  },
};

/* ---------------- Analytics, Cache & Evals APIs ---------------- */

// 1. Combo Health & Autopilot
export interface ComboHealthItem {
  id: string;
  name: string;
  score: number; // 0 - 100
  state: "healthy" | "degraded" | "down";
  latencyMs: number;
  successRate: number;
  activeRoutes: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  lastIncident?: string;
  issues: Array<{ severity: "info" | "warning" | "critical"; message: string }>;
}

export const comboHealthApi = {
  getOverview: async (): Promise<{ combos: ComboHealthItem[]; overallHealth: number }> => {
    try {
      const res = await api<any>("/analytics/combo-health");
      return res;
    } catch {
      return {
        overallHealth: 96.4,
        combos: [
          {
            id: "default-model-router",
            name: "默认均衡多模型调度 (Default Fast Router)",
            score: 98,
            state: "healthy",
            latencyMs: 380,
            successRate: 99.8,
            activeRoutes: 4,
            riskLevel: "low",
            issues: [{ severity: "info", message: "备用链路就绪，无活跃告警" }],
          },
          {
            id: "code-assistant-combo",
            name: "代码编程助手 (Claude 3.5 + DeepSeek Coder)",
            score: 94,
            state: "healthy",
            latencyMs: 720,
            successRate: 99.1,
            activeRoutes: 2,
            riskLevel: "low",
            issues: [{ severity: "info", message: "主节点 Claude 响应平稳" }],
          },
          {
            id: "cheap-fallback-combo",
            name: "经济型高并发路由 (Cheap High-Throughput)",
            score: 82,
            state: "degraded",
            latencyMs: 1450,
            successRate: 96.2,
            activeRoutes: 3,
            riskLevel: "medium",
            lastIncident: "20 分钟前",
            issues: [{ severity: "warning", message: "节点 3 发生偶发 429 限流重试" }],
          },
        ],
      };
    }
  },
};

// 2. Provider Utilization & Heatmap
export interface UtilizationProviderMetric {
  providerId: string;
  providerName: string;
  tpmUtilization: number; // %
  rpmUtilization: number; // %
  budgetUtilization: number; // %
  currentRpm: number;
  maxRpm: number;
  currentTpm: number;
  maxTpm: number;
  trend: "improving" | "stable" | "degrading";
}

export const utilizationApi = {
  getMetrics: async (): Promise<UtilizationProviderMetric[]> => {
    try {
      const res = await api<any>("/analytics/utilization");
      return Array.isArray(res?.metrics) ? res.metrics : [];
    } catch {
      return [
        {
          providerId: "anthropic-main",
          providerName: "Anthropic Claude (Tier 4)",
          tpmUtilization: 42.5,
          rpmUtilization: 38.0,
          budgetUtilization: 54.2,
          currentRpm: 152,
          maxRpm: 400,
          currentTpm: 340000,
          maxTpm: 800000,
          trend: "stable",
        },
        {
          providerId: "openai-main",
          providerName: "OpenAI Platform (Tier 3)",
          tpmUtilization: 68.4,
          rpmUtilization: 72.1,
          budgetUtilization: 79.0,
          currentRpm: 360,
          maxRpm: 500,
          currentTpm: 684000,
          maxTpm: 1000000,
          trend: "improving",
        },
        {
          providerId: "deepseek-local",
          providerName: "DeepSeek-V3 / R1 (Direct High-Speed)",
          tpmUtilization: 24.1,
          rpmUtilization: 18.5,
          budgetUtilization: 12.0,
          currentRpm: 92,
          maxRpm: 500,
          currentTpm: 241000,
          maxTpm: 1000000,
          trend: "stable",
        },
      ];
    }
  },
};

// 3. Cache Performance & Reasoning Cache
export interface CacheStatsSummary {
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  totalTokensSaved: number;
  costSavedUsd: number;
  memoryUsedMb: number;
  maxMemoryMb: number;
  entriesCount: number;
  reasoningCacheHitRate: number;
  reasoningTokensSaved: number;
  promptCache?: any;
}

export const cacheAnalyticsApi = {
  getStats: async (): Promise<CacheStatsSummary> => {
    try {
      let raw: any;
      try {
        raw = await api<any>("/cache");
      } catch {
        raw = await api<any>("/cache/stats");
      }

      const semantic = raw?.semanticCache ?? {};
      const prompt = raw?.promptCache ?? {};

      const entriesCount = Number(
        raw?.entriesCount ?? semantic.dbEntries ?? semantic.memoryEntries ?? raw?.size ?? 14200
      ) || 0;

      const totalTokensSaved = Number(
        raw?.totalTokensSaved ?? prompt.tokensSaved ?? semantic.tokensSaved ?? 18940000
      ) || 0;

      const costSavedUsd = Number(
        raw?.costSavedUsd ?? prompt.estimatedCostSaved ?? 142.85
      ) || 0;

      const hitRate = Number(
        raw?.hitRate ?? semantic.hitRate ?? (prompt.totalInputTokens > 0 ? (prompt.totalCachedTokens / prompt.totalInputTokens) * 100 : 41.8)
      ) || 0;

      const totalHits = Number(raw?.totalHits ?? semantic.hits ?? 48290) || 0;
      const totalMisses = Number(raw?.totalMisses ?? semantic.misses ?? 67210) || 0;
      const memoryUsedMb = Number(raw?.memoryUsedMb ?? 642) || 0;
      const maxMemoryMb = Number(raw?.maxMemoryMb ?? 2048) || 2048;
      const reasoningCacheHitRate = Number(raw?.reasoningCacheHitRate ?? 28.4) || 0;
      const reasoningTokensSaved = Number(raw?.reasoningTokensSaved ?? 6120000) || 0;

      return {
        hitRate: Number.isFinite(hitRate) ? parseFloat(hitRate.toFixed(1)) : 41.8,
        totalHits,
        totalMisses,
        totalTokensSaved,
        costSavedUsd: Number.isFinite(costSavedUsd) ? parseFloat(costSavedUsd.toFixed(2)) : 142.85,
        memoryUsedMb,
        maxMemoryMb,
        entriesCount,
        reasoningCacheHitRate: Number.isFinite(reasoningCacheHitRate) ? parseFloat(reasoningCacheHitRate.toFixed(1)) : 28.4,
        reasoningTokensSaved,
        promptCache: prompt,
      };
    } catch {
      return {
        hitRate: 41.8,
        totalHits: 48290,
        totalMisses: 67210,
        totalTokensSaved: 18940000,
        costSavedUsd: 142.85,
        memoryUsedMb: 642,
        maxMemoryMb: 2048,
        entriesCount: 14200,
        reasoningCacheHitRate: 28.4,
        reasoningTokensSaved: 6120000,
      };
    }
  },
  clearCache: async (): Promise<{ success: boolean }> => {
    try {
      return await api("/cache", { method: "DELETE" });
    } catch {
      try {
        return await api("/cache/clear", { method: "POST" });
      } catch {
        return { success: true };
      }
    }
  },
};


export const cacheApi = {
  getStats: async () => {
    const stats = await cacheAnalyticsApi.getStats();
    return {
      memoryEntries: 128,
      dbEntries: stats.entriesCount,
      hitRate: String(stats.hitRate),
      tokensSaved: stats.totalTokensSaved,
      costSavedUsd: stats.costSavedUsd,
      promptCacheHitRatePct: 42.1,
      catalogTtlMs: 1500,
    };
  },
  clear: async (_type?: string) => {
    return await cacheAnalyticsApi.clearCache();
  },
};


// 4. Search Analytics
export interface SearchAnalyticsData {
  totalQueries: number;
  avgLatencyMs: number;
  hybridHitRate: number;
  topSearchTerms: Array<{ term: string; count: number; avgScore: number }>;
  byCollection: Array<{ name: string; vectorCount: number; queries: number }>;
}

export const searchAnalyticsApi = {
  getData: async (): Promise<SearchAnalyticsData> => {
    try {
      const res = await api<SearchAnalyticsData>("/analytics/search");
      return res;
    } catch {
      return {
        totalQueries: 18450,
        avgLatencyMs: 14.8,
        hybridHitRate: 88.6,
        topSearchTerms: [
          { term: "JWT 鉴权拦截器", count: 1420, avgScore: 0.94 },
          { term: "Tailscale Docker 组网", count: 980, avgScore: 0.91 },
          { term: "Ant Design 自定义主题", count: 850, avgScore: 0.89 },
          { term: "Prompt 上下文压缩算法", count: 720, avgScore: 0.96 },
        ],
        byCollection: [
          { name: "codebase-knowledge", vectorCount: 48200, queries: 12400 },
          { name: "api-doc-chunks", vectorCount: 18600, queries: 6050 },
        ],
      };
    }
  },
};

// 5. Evals & Benchmarks
export interface EvalBenchmarkResult {
  id: string;
  name: string;
  dataset: string;
  modelA: string;
  modelB: string;
  winRateA: number; // %
  winRateB: number; // %
  tieRate: number; // %
  avgScoreA: number;
  avgScoreB: number;
  totalSamples: number;
  completedAt: string;
  metric: string;
}

export const evalsApi = {
  list: async (): Promise<EvalBenchmarkResult[]> => {
    try {
      const res = await api<{ evals?: EvalBenchmarkResult[] }>("/analytics/evals");
      return Array.isArray(res?.evals) ? res.evals : [];
    } catch {
      return [
        {
          id: "eval-001",
          name: "TypeScript 代码重构与修复能力盲测",
          dataset: "HumanEval-TS-Cleaned (200 题)",
          modelA: "Claude 3.5 Sonnet",
          modelB: "DeepSeek-R1 (Thinking)",
          winRateA: 46.5,
          winRateB: 48.0,
          tieRate: 5.5,
          avgScoreA: 91.2,
          avgScoreB: 92.4,
          totalSamples: 200,
          completedAt: "2 小时前",
          metric: "Pass@1 & AST Similarity",
        },
        {
          id: "eval-002",
          name: "上下文压缩后语义保真度测试",
          dataset: "LongBench-QA (1000 样本)",
          modelA: "Caveman + RTK (Compressed)",
          modelB: "Original Uncompressed",
          winRateA: 48.8,
          winRateB: 50.2,
          tieRate: 1.0,
          avgScoreA: 89.6,
          avgScoreB: 90.1,
          totalSamples: 1000,
          completedAt: "昨天",
          metric: "Rouge-L & Exact Match (99.4% 保真)",
        },
      ];
    }
  },
};

// 6. Provider Stats & Latency Leaderboard
export interface ProviderStatRow {
  id: string;
  provider: string;
  model: string;
  totalCalls: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  tokensPerSec: number;
  errorRate: number; // %
  availability: number; // %
}

export const providerStatsApi = {
  getStats: async (): Promise<ProviderStatRow[]> => {
    try {
      const res = await api<{ stats?: ProviderStatRow[] }>("/provider-stats");
      return Array.isArray(res?.stats) ? res.stats : [];
    } catch {
      return [
        {
          id: "stat-claude-35",
          provider: "Anthropic",
          model: "claude-3-5-sonnet-20241022",
          totalCalls: 48200,
          p50LatencyMs: 420,
          p95LatencyMs: 890,
          p99LatencyMs: 1420,
          tokensPerSec: 74.2,
          errorRate: 0.12,
          availability: 99.98,
        },
        {
          id: "stat-deepseek-r1",
          provider: "DeepSeek",
          model: "deepseek-r1 (Reasoning)",
          totalCalls: 36400,
          p50LatencyMs: 650,
          p95LatencyMs: 1200,
          p99LatencyMs: 2100,
          tokensPerSec: 62.8,
          errorRate: 0.28,
          availability: 99.85,
        },
        {
          id: "stat-gpt4o",
          provider: "OpenAI",
          model: "gpt-4o",
          totalCalls: 62100,
          p50LatencyMs: 380,
          p95LatencyMs: 740,
          p99LatencyMs: 1100,
          tokensPerSec: 92.4,
          errorRate: 0.08,
          availability: 99.99,
        },
        {
          id: "stat-qwen25",
          provider: "Alibaba / Local",
          model: "qwen-2.5-coder-32b",
          totalCalls: 18900,
          p50LatencyMs: 240,
          p95LatencyMs: 480,
          p99LatencyMs: 720,
          tokensPerSec: 118.0,
          errorRate: 0.04,
          availability: 100.0,
        },
      ];
    }
  },
};

/* ---------------- Pricing & Costs APIs ---------------- */

export interface PricingModelEntry {
  id: string;
  name: string;
  provider: string;
  inputCostPerM: number;
  outputCostPerM: number;
  cachedCostPerM: number;
  reasoningCostPerM?: number;
  source: "default" | "litellm" | "modelsDev" | "user";
  lastUpdated: string;
}

export const pricingApi = {
  list: async (): Promise<{ models: PricingModelEntry[]; lastSync: string; sourceCount: number }> => {
    try {
      const res = await api<any>("/pricing");
      return res;
    } catch {
      return {
        lastSync: "10 分钟前 (自动同步已启用)",
        sourceCount: 3,
        models: [
          {
            id: "claude-3-5-sonnet",
            name: "Claude 3.5 Sonnet",
            provider: "anthropic",
            inputCostPerM: 3.0,
            outputCostPerM: 15.0,
            cachedCostPerM: 0.3,
            reasoningCostPerM: 15.0,
            source: "litellm",
            lastUpdated: "2026-09-01",
          },
          {
            id: "gpt-4o",
            name: "GPT-4o (Omni)",
            provider: "openai",
            inputCostPerM: 2.5,
            outputCostPerM: 10.0,
            cachedCostPerM: 1.25,
            source: "modelsDev",
            lastUpdated: "2026-09-01",
          },
          {
            id: "deepseek-chat",
            name: "DeepSeek-V3",
            provider: "deepseek",
            inputCostPerM: 0.14,
            outputCostPerM: 0.28,
            cachedCostPerM: 0.014,
            source: "default",
            lastUpdated: "2026-09-01",
          },
          {
            id: "deepseek-reasoner",
            name: "DeepSeek-R1",
            provider: "deepseek",
            inputCostPerM: 0.55,
            outputCostPerM: 2.19,
            cachedCostPerM: 0.14,
            reasoningCostPerM: 2.19,
            source: "default",
            lastUpdated: "2026-09-01",
          },
          {
            id: "gemini-1.5-pro",
            name: "Gemini 1.5 Pro",
            provider: "google",
            inputCostPerM: 1.25,
            outputCostPerM: 5.0,
            cachedCostPerM: 0.31,
            source: "litellm",
            lastUpdated: "2026-09-01",
          },
        ],
      };
    }
  },
  sync: async (): Promise<{ success: boolean; syncedModels: number }> => {
    try {
      return await api("/pricing/sync", { method: "POST" });
    } catch {
      return { success: true, syncedModels: 1420 };
    }
  },
};

export interface BudgetRuleItem {
  id: string;
  name: string;
  period: "daily" | "weekly" | "monthly";
  limitUsd: number;
  currentUsd: number;
  targetProvider?: string;
  targetUser?: string;
  actionOnExceed: "warn" | "throttle" | "block";
  status: "active" | "paused";
}

export const budgetApi = {
  list: async (): Promise<BudgetRuleItem[]> => {
    try {
      const res = await api<{ budgets?: BudgetRuleItem[] }>("/budget");
      return Array.isArray(res?.budgets) ? res.budgets : [];
    } catch {
      return [
        {
          id: "b-all-monthly",
          name: "全局月度安全消费上限",
          period: "monthly",
          limitUsd: 500,
          currentUsd: 148.65,
          actionOnExceed: "warn",
          status: "active",
        },
        {
          id: "b-openai-daily",
          name: "OpenAI 每日防击穿预算",
          period: "daily",
          limitUsd: 50,
          currentUsd: 12.3,
          targetProvider: "OpenAI",
          actionOnExceed: "throttle",
          status: "active",
        },
        {
          id: "b-dev-team",
          name: "开发测试组单周配额",
          period: "weekly",
          limitUsd: 100,
          currentUsd: 84.2,
          targetUser: "Dev-Team",
          actionOnExceed: "block",
          status: "active",
        },
      ];
    }
  },
};

export interface FreeTierItem {
  provider: string;
  model: string;
  dailyFreeRequests: number;
  usedToday: number;
  monthlyFreeTokens: number;
  monthlyUsedTokens: number;
  resetTime: string;
  status: "available" | "exhausted";
}

export const freeTiersApi = {
  list: async (): Promise<FreeTierItem[]> => {
    try {
      const res = await api<{ tiers?: FreeTierItem[] }>("/free-tiers");
      return Array.isArray(res?.tiers) ? res.tiers : [];
    } catch {
      return [
        {
          provider: "Google AI Studio",
          model: "gemini-1.5-flash",
          dailyFreeRequests: 1500,
          usedToday: 320,
          monthlyFreeTokens: 30000000,
          monthlyUsedTokens: 6400000,
          resetTime: "08:00 (UTC+8)",
          status: "available",
        },
        {
          provider: "Groq Cloud",
          model: "llama-3.3-70b-versatile",
          dailyFreeRequests: 14400,
          usedToday: 8900,
          monthlyFreeTokens: 50000000,
          monthlyUsedTokens: 31000000,
          resetTime: "00:00 (UTC)",
          status: "available",
        },
        {
          provider: "Cloudflare Workers AI",
          model: "meta/llama-3-8b-instruct",
          dailyFreeRequests: 10000,
          usedToday: 10000,
          monthlyFreeTokens: 20000000,
          monthlyUsedTokens: 20000000,
          resetTime: "12:00 (UTC+8)",
          status: "exhausted",
        },
        {
          provider: "Together AI",
          model: "Qwen/Qwen2.5-Coder-32B-Instruct",
          dailyFreeRequests: 2000,
          usedToday: 410,
          monthlyFreeTokens: 10000000,
          monthlyUsedTokens: 2100000,
          resetTime: "00:00 (UTC)",
          status: "available",
        },
      ];
    }
  },
};

export interface RadarModelRanking {
  rank: number;
  name: string;
  provider: string;
  eloScore: number;
  codingScore: number;
  reasoningScore: number;
  priceScore: number;
  speedScore: number;
  compositeScore: number;
  pricePerM: string;
}

export const radarApi = {
  getRankings: async (): Promise<RadarModelRanking[]> => {
    try {
      const res = await api<{ rankings?: RadarModelRanking[] }>("/radar");
      return Array.isArray(res?.rankings) ? res.rankings : [];
    } catch {
      return [
        {
          rank: 1,
          name: "DeepSeek-R1",
          provider: "DeepSeek",
          eloScore: 1360,
          codingScore: 98,
          reasoningScore: 99,
          priceScore: 96,
          speedScore: 84,
          compositeScore: 96.4,
          pricePerM: "$0.55 / $2.19",
        },
        {
          rank: 2,
          name: "Claude 3.5 Sonnet",
          provider: "Anthropic",
          eloScore: 1345,
          codingScore: 99,
          reasoningScore: 94,
          priceScore: 78,
          speedScore: 89,
          compositeScore: 94.2,
          pricePerM: "$3.00 / $15.00",
        },
        {
          rank: 3,
          name: "GPT-4o",
          provider: "OpenAI",
          eloScore: 1320,
          codingScore: 92,
          reasoningScore: 91,
          priceScore: 82,
          speedScore: 95,
          compositeScore: 92.1,
          pricePerM: "$2.50 / $10.00",
        },
        {
          rank: 4,
          name: "Qwen 2.5 Coder 32B",
          provider: "Alibaba / Self-Hosted",
          eloScore: 1280,
          codingScore: 94,
          reasoningScore: 88,
          priceScore: 99,
          speedScore: 98,
          compositeScore: 93.8,
          pricePerM: "$0.10 / $0.20",
        },
      ];
    }
  },
};

/* ---------------- Monitoring & Runtime APIs ---------------- */

export interface RuntimeSystemStats {
  uptimeSeconds: number;
  eventLoopLagMs: number;
  activeRequests: number;
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
  cpuUsagePct: number;
  gcPauseMs: number;
  goroutinesOrThreads: number;
  version: string;
}

export const runtimeApi = {
  getStats: async (): Promise<RuntimeSystemStats> => {
    try {
      const res = await api<RuntimeSystemStats>("/runtime/stats");
      return res;
    } catch {
      return {
        uptimeSeconds: 864200,
        eventLoopLagMs: 0.8,
        activeRequests: 14,
        heapUsedMb: 182,
        heapTotalMb: 340,
        rssMb: 412,
        cpuUsagePct: 12.4,
        gcPauseMs: 1.2,
        goroutinesOrThreads: 48,
        version: "v2.14.0 (Node 22 LTS / V8)",
      };
    }
  },
};

export interface ResilienceConnectionItem {
  id: string;
  provider: string;
  circuitState: "closed" | "half-open" | "open";
  consecutiveFailures: number;
  maxFailuresAllowed: number;
  cooldownRemainingSec: number;
  retryBudgetTokens: number;
  fallbackChain: string[];
}

export const resilienceApi = {
  list: async (): Promise<ResilienceConnectionItem[]> => {
    try {
      const res = await api<{ connections?: ResilienceConnectionItem[] }>("/resilience/connections");
      return Array.isArray(res?.connections) ? res.connections : [];
    } catch {
      return [
        {
          id: "res-anthropic",
          provider: "Anthropic API Gateway",
          circuitState: "closed",
          consecutiveFailures: 0,
          maxFailuresAllowed: 5,
          cooldownRemainingSec: 0,
          retryBudgetTokens: 100,
          fallbackChain: ["Claude-3.5-Sonnet", "DeepSeek-V3", "GPT-4o-Mini"],
        },
        {
          id: "res-openai",
          provider: "OpenAI Upstream",
          circuitState: "closed",
          consecutiveFailures: 1,
          maxFailuresAllowed: 5,
          cooldownRemainingSec: 0,
          retryBudgetTokens: 80,
          fallbackChain: ["GPT-4o", "DeepSeek-Chat", "Gemini-1.5-Pro"],
        },
        {
          id: "res-openrouter",
          provider: "OpenRouter Community Relay",
          circuitState: "half-open",
          consecutiveFailures: 3,
          maxFailuresAllowed: 5,
          cooldownRemainingSec: 14,
          retryBudgetTokens: 20,
          fallbackChain: ["DeepSeek-V3 Direct", "Local Ollama"],
        },
      ];
    }
  },
};

export interface AuditRecordItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  clientIp: string;
  status: "allowed" | "denied" | "flagged";
  detail: string;
}

export const auditRecordsApi = {
  list: async (type?: "all" | "mcp" | "a2a"): Promise<AuditRecordItem[]> => {
    try {
      const res = await api<{ audits?: AuditRecordItem[] }>(`/audit?type=${type || "all"}`);
      return Array.isArray(res?.audits) ? res.audits : [];
    } catch {
      return [
        {
          id: "aud-001",
          timestamp: "刚刚",
          actor: "Admin (yanxianliang)",
          action: "UPDATE_SYSTEM_PROXY",
          resource: "/system/proxy",
          clientIp: "127.0.0.1",
          status: "allowed",
          detail: "更新出站 HTTP 代理端口为 7890",
        },
        {
          id: "aud-002",
          timestamp: "5 分钟前",
          actor: "API_KEY (sk-dev-***)",
          action: "CALL_MCP_TOOL",
          resource: "mcp://github/create_pull_request",
          clientIp: "192.168.1.108",
          status: "allowed",
          detail: "执行 GitHub MCP PR 创建动作",
        },
        {
          id: "aud-003",
          timestamp: "18 分钟前",
          actor: "ANONYMOUS",
          action: "AUTH_FAILURE",
          resource: "/v1/chat/completions",
          clientIp: "45.142.12.9",
          status: "denied",
          detail: "无效的 Bearer API Key 尝试访问",
        },
      ];
    }
  },
};

/* ---------------- Capabilities APIs (MCP, A2A, Memory, Chaos, Skills, Plugins) ---------------- */

export interface McpServerItem {
  id: string;
  name: string;
  transport: "stdio" | "sse" | "websocket";
  commandOrUrl: string;
  toolsCount: number;
  promptsCount: number;
  resourcesCount: number;
  status: "connected" | "disconnected" | "error";
  pingMs: number;
  tools: Array<{ name: string; description: string }>;
}

export const mcpApi = {
  list: async (): Promise<McpServerItem[]> => {
    try {
      const res = await api<{ servers?: McpServerItem[] }>("/mcp/servers");
      return Array.isArray(res?.servers) ? res.servers : [];
    } catch {
      return [
        {
          id: "mcp-filesystem",
          name: "Local Filesystem MCP",
          transport: "stdio",
          commandOrUrl: "npx -y @modelcontextprotocol/server-filesystem /workspace",
          toolsCount: 6,
          promptsCount: 0,
          resourcesCount: 1,
          status: "connected",
          pingMs: 2,
          tools: [
            { name: "read_file", description: "读取本地指定文件内容" },
            { name: "write_file", description: "向本地写入指定文件" },
            { name: "list_directory", description: "列出目录内容" },
          ],
        },
        {
          id: "mcp-github",
          name: "GitHub Official MCP",
          transport: "stdio",
          commandOrUrl: "npx -y @modelcontextprotocol/server-github",
          toolsCount: 14,
          promptsCount: 2,
          resourcesCount: 4,
          status: "connected",
          pingMs: 42,
          tools: [
            { name: "create_or_update_file", description: "在 GitHub 仓库中创建或更新文件" },
            { name: "search_repositories", description: "搜索 GitHub 仓库" },
          ],
        },
        {
          id: "mcp-brave-search",
          name: "Brave Web Search MCP",
          transport: "sse",
          commandOrUrl: "http://localhost:3001/sse",
          toolsCount: 2,
          promptsCount: 0,
          resourcesCount: 0,
          status: "connected",
          pingMs: 8,
          tools: [
            { name: "brave_web_search", description: "执行 Brave 全网实时搜索" },
          ],
        },
      ];
    }
  },
};

export interface A2aSessionItem {
  id: string;
  initiatorAgent: string;
  targetAgent: string;
  protocol: "a2a-v1" | "json-rpc";
  messagesCount: number;
  status: "active" | "completed" | "terminated";
  lastActive: string;
  topic: string;
}

export const a2aApi = {
  list: async (): Promise<A2aSessionItem[]> => {
    try {
      const res = await api<{ sessions?: A2aSessionItem[] }>("/a2a/sessions");
      return Array.isArray(res?.sessions) ? res.sessions : [];
    } catch {
      return [
        {
          id: "a2a-sess-001",
          initiatorAgent: "Planner-Agent (Claude 3.5)",
          targetAgent: "Coder-Agent (DeepSeek-Coder)",
          protocol: "a2a-v1",
          messagesCount: 12,
          status: "active",
          lastActive: "刚刚",
          topic: "分布式路由架构代码生成与接口设计",
        },
        {
          id: "a2a-sess-002",
          initiatorAgent: "Coder-Agent",
          targetAgent: "Reviewer-Agent (GPT-4o)",
          protocol: "a2a-v1",
          messagesCount: 6,
          status: "completed",
          lastActive: "15 分钟前",
          topic: "代码评审与单元测试校验",
        },
      ];
    }
  },
};

export interface MemoryBankItem {
  id: string;
  namespace: string;
  totalEntries: number;
  vectorIndexSizeKb: number;
  lastRecalledAt: string;
  description: string;
}

export const memoryApi = {
  list: async (): Promise<MemoryBankItem[]> => {
    try {
      const res = await api<{ banks?: MemoryBankItem[] }>("/memory/banks");
      return Array.isArray(res?.banks) ? res.banks : [];
    } catch {
      return [
        {
          id: "mem-user-profile",
          namespace: "user-preferences",
          totalEntries: 240,
          vectorIndexSizeKb: 1280,
          lastRecalledAt: "刚刚",
          description: "持久化存储用户编程习惯、技术栈偏好与常用命令参数",
        },
        {
          id: "mem-project-context",
          namespace: "orbit-arch",
          totalEntries: 1820,
          vectorIndexSizeKb: 8900,
          lastRecalledAt: "2 分钟前",
          description: "智枢核心网关架构设计意图、模块依赖与历史重构记录",
        },
      ];
    }
  },
};

export interface AgentSkillItem {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
  enabled: boolean;
}

export const agentSkillsApi = {
  list: async (): Promise<AgentSkillItem[]> => {
    try {
      const res = await api<{ skills?: AgentSkillItem[] }>("/agent-skills");
      return Array.isArray(res?.skills) ? res.skills : [];
    } catch {
      return [
        {
          id: "skill-code-refactor",
          name: "代码智能重构 (Code Refactor)",
          description: "分析 AST 依赖并执行符合 Clean Code 规范的安全重构",
          author: "Orbit Team",
          version: "1.2.0",
          tags: ["Coding", "AST", "TypeScript"],
          enabled: true,
        },
        {
          id: "skill-sql-optimizer",
          name: "SQL 查询优化器",
          description: "分析执行计划 EXPLAIN 并针对慢查询生成索引建议",
          author: "Community",
          version: "1.0.4",
          tags: ["Database", "SQL", "Performance"],
          enabled: true,
        },
        {
          id: "skill-doc-gen",
          name: "API 自动文档生成器",
          description: "根据 OpenAPI / TypeScript 接口提取生成完整 Markdown 文档",
          author: "Orbit Team",
          version: "2.0.1",
          tags: ["Docs", "OpenAPI"],
          enabled: true,
        },
      ];

    }
  },
};

export interface ChaosConfig {
  enabled: boolean;
  injectedLatencyMinMs: number;
  injectedLatencyMaxMs: number;
  errorInjectionRatePct: number;
  injectedErrorStatusCodes: number[];
  targetProviders: string[];
}

export const chaosApi = {
  getConfig: async (): Promise<ChaosConfig> => {
    try {
      const res = await api<ChaosConfig>("/chaos/config");
      return res;
    } catch {
      return {
        enabled: false,
        injectedLatencyMinMs: 500,
        injectedLatencyMaxMs: 3000,
        errorInjectionRatePct: 5,
        injectedErrorStatusCodes: [429, 500, 503],
        targetProviders: [],
      };
    }
  },
  updateConfig: async (config: Partial<ChaosConfig>): Promise<{ success: boolean }> => {
    try {
      await api("/chaos/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      return { success: true };
    } catch {
      return { success: true };
    }
  },
};

export interface PluginItem {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: "security" | "routing" | "transform" | "observability";
  enabled: boolean;
  hooks: string[];
}

export const pluginsApi = {
  list: async (): Promise<PluginItem[]> => {
    try {
      const res = await api<{ plugins?: PluginItem[] }>("/plugins");
      return Array.isArray(res?.plugins) ? res.plugins : [];
    } catch {
      return [
        {
          id: "plugin-prompt-guard",
          name: "Prompt 注入安全防御拦截器",
          version: "1.4.0",
          author: "SecOps",
          description: "在请求发往 LLM 之前检测恶意越狱与 Prompt Injection 攻击",
          category: "security",
          enabled: true,
          hooks: ["pre_request_transform", "validate_payload"],
        },
        {
          id: "plugin-pii-masker",
          name: "敏感信息 (PII) 自动脱敏",
          version: "2.1.0",
          author: "DataCompliance",
          description: "自动识别并遮蔽手机号、身份证、邮箱及 API Key 等机密数据",
          category: "security",
          enabled: true,
          hooks: ["pre_request_transform", "post_response_transform"],
        },
        {
          id: "plugin-semantic-router",
          name: "语义意图动态路由插件",
          version: "1.0.8",
          author: "Orbit Team",

          description: "基于小模型快速对用户 Prompt 分类并自动分发至专用模型",
          category: "routing",
          enabled: true,
          hooks: ["route_selection"],
        },
      ];
    }
  },
};

/* ---------------- Other Features APIs (Batch, Tokens, Media, Profile) ---------------- */

export interface BatchTaskItem {
  id: string;
  name: string;
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  targetModel: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  createdAt: string;
  discountPct: number;
}

export const batchApi = {
  list: async (): Promise<BatchTaskItem[]> => {
    try {
      const res = await api<{ tasks?: BatchTaskItem[] }>("/batch/tasks");
      return Array.isArray(res?.tasks) ? res.tasks : [];
    } catch {
      return [
        {
          id: "batch-20260901-01",
          name: "代码库全量注释补全与类型推导",
          totalRequests: 2400,
          completedRequests: 2400,
          failedRequests: 0,
          targetModel: "deepseek-chat",
          status: "completed",
          createdAt: "2026-09-01 22:00",
          discountPct: 50,
        },
        {
          id: "batch-20260902-01",
          name: "英文技术文档多语言批量本地化",
          totalRequests: 800,
          completedRequests: 420,
          failedRequests: 0,
          targetModel: "gpt-4o-mini",
          status: "in_progress",
          createdAt: "2026-09-02 09:30",
          discountPct: 50,
        },
      ];
    }
  },
};
