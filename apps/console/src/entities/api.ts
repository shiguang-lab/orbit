/**
 * API client 核心 + 领域类型（参考 asset-hub apps/web/src/entities/api.ts）。
 * - api<T>() 统一 fetch 封装：同源 cookie 会话 + CSRF 头 + 401/错误归一化
 * - 长连接：WS(live) client + SSE helpers
 */
import { withCsrfHeader } from "@/auth/csrf";
import { revalidateAuthSession } from "@/auth/session";
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
  if (options.body !== undefined && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
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
    // An upstream credential failure is not proof that the SSO session expired.
    if (!DEV_BYPASS_AUTH) await revalidateAuthSession();
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
  success: number;
  failed: number;
  total: number;
  created: ProviderConnection[];
  errors: Array<{ index: number; name?: string; provider?: string; message: string }>;
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
  chat: (input: { model: string; messages: Array<{ role: "user" | "assistant"; content: string }>; temperature?: number; max_tokens?: number }) => api<Record<string, unknown>>("/v1/chat/completions", { method: "POST", body: JSON.stringify({ ...input, stream: false }) }),
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

export interface ModelCatalogItem {
  id: string;
  name?: string;
  provider?: string;
  [key: string]: unknown;
}

export interface RuntimeModelCatalogResponse {
  catalog?: Record<string, { provider?: string; models?: ModelCatalogItem[] }>;
}

export const modelsApi = {
  list: () => api<{ models?: ModelCatalogItem[] }>("/models"),
  catalog: () => api<RuntimeModelCatalogResponse>("/models/catalog"),
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

export interface StorageHealthInfo {
  driver: string;
  dbPath: string;
  sizeBytes: number;
  backupCount: number;
  lastBackupAt?: string | null;
  retentionDays?: number;
  maxBackups?: number;
}

export interface DbBackupItem {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  type?: "manual" | "auto";
}

export interface DatabaseSettingsConfig {
  autoBackupEnabled?: boolean;
  backupIntervalHours?: number;
  maxBackups?: number;
  retentionDays?: number;
  autoVacuumEnabled?: boolean;
  stats?: {
    lastVacuumAt?: string | null;
    lastVacuumDurationMs?: number | null;
  };
}

export const storageApi = {
  getHealth: () => api<StorageHealthInfo>("/storage/health"),
  getBackups: () => api<{ backups?: DbBackupItem[] }>("/db-backups"),
  createBackup: () => api<{ created: boolean; filename?: string }>("/db-backups", { method: "PUT" }),
  restoreBackup: (filename: string) =>
    api<{ restored: boolean }>("/db-backups", {
      method: "POST",
      body: JSON.stringify({ action: "restore", filename, backupFile: filename }),
    }),
  cleanupBackups: (params?: { keepLatest?: number; retentionDays?: number }) =>
    api<{ cleaned: boolean }>("/db-backups", {
      method: "DELETE",
      body: JSON.stringify(params || {}),
    }),
  getDatabaseSettings: () => api<DatabaseSettingsConfig>("/settings/database"),
  updateDatabaseSettings: (patch: DatabaseSettingsConfig) =>
    api<DatabaseSettingsConfig>("/settings/database", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  vacuum: () => api<{ success: boolean; message?: string; duration?: number }>("/settings/database/vacuum", { method: "POST" }),
  purgeCallLogs: () => api<{ deleted: number }>("/settings/purge-call-logs", { method: "POST" }),
  purgeDetailedLogs: () => api<{ deleted: number }>("/settings/purge-detailed-logs", { method: "POST" }),
  purgeQuotaSnapshots: () => api<{ deleted: number }>("/settings/purge-quota-snapshots", { method: "POST" }),
  resetUsage: (period: string) => api<Record<string, unknown>>("/settings/purge-usage-history", {
    method: "POST",
    body: JSON.stringify({ period }),
  }),
  importJson: (config: Record<string, unknown>) =>
    api<{ success: boolean }>("/settings/import-json", {
      method: "POST",
      body: JSON.stringify(config),
    }),
  getDatabaseSettingsFull: () => api<any>("/settings/database"),
  updateDatabaseSettingsFull: (patch: any) =>
    api<any>("/settings/database", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  refreshDatabaseStats: () =>
    api<{ success: boolean; stats?: any }>("/settings/database/refresh-stats", { method: "POST" }),
  saveBackupRetention: (params: { keepLatest: number; retentionDays: number }) =>
    api<any>("/db-backups", { method: "PATCH", body: JSON.stringify(params) }),
  clearCache: () => api<{ success: boolean }>("/cache", { method: "DELETE" }),
  purgeExpiredLogs: () => api<{ deleted: number }>("/settings/purge-logs", { method: "POST" }),
};

export const settingsApi = {
  sidebar: () => api<SidebarSettings>("/settings?sidebar=true"),
  get: () => api<Record<string, unknown>>("/settings"),
  getSettings: () => api<Record<string, unknown>>("/settings"),
  patch: (patch: Record<string, unknown>) => api<Record<string, unknown>>("/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }),
  updateSettings: (patch: Record<string, unknown>) => api<Record<string, unknown>>("/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }),
  headroomStatus: () =>
    api<{
      url: string;
      running: boolean;
      canStart: boolean;
      localUrl: boolean;
      installed: boolean;
      managedPid?: number | null;
    }>("/headroom/status"),
  startHeadroom: () => api<Record<string, unknown>>("/headroom/start", { method: "POST" }),
  stopHeadroom: () => api<Record<string, unknown>>("/headroom/stop", { method: "POST" }),
  changePassword: (password: string) =>
    api<{ success: boolean }>("/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }),
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
  getThinkingBudget: () =>
    api<{ mode: string; customBudget: number; effortLevel: string }>("/settings/thinking-budget"),
  updateThinkingBudget: (payload: { mode: string; customBudget: number; effortLevel: string }) =>
    api<Record<string, unknown>>("/settings/thinking-budget", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  getPayloadRules: () =>
    api<{ default?: any[]; override?: any[]; filter?: any[]; defaultRaw?: any[] }>("/settings/payload-rules"),
  updatePayloadRules: (payload: Record<string, unknown>) =>
    api<Record<string, unknown>>("/settings/payload-rules", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};

export interface CacheConfig {
  modelCatalogCacheTtlMs: number;
}

export const cacheConfigApi = {
  get: () => api<CacheConfig>("/settings/cache-config"),
  update: (config: CacheConfig) =>
    api<{ ok?: boolean; modelCatalogCacheTtlMs?: number }>("/settings/cache-config", {
      method: "PUT",
      body: JSON.stringify(config),
    }).then((response) => ({
      modelCatalogCacheTtlMs: response.modelCatalogCacheTtlMs ?? config.modelCatalogCacheTtlMs,
    })),
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
  ipAllowlist?: string[];
  lastClientIp?: string | null;
  lastClientUserAgent?: string | null;
  lastClientAt?: string | null;
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
} from "@orbit/contracts";

export const combosApi = {
  list: () => api<import("@orbit/contracts").ComboListResponse>("/combos"),
  get: (id: string) => api<import("@orbit/contracts").ComboItem>(`/combos/${encodeURIComponent(id)}`),
  create: (data: Partial<import("@orbit/contracts").ComboItem>) =>
    api<import("@orbit/contracts").ComboItem>("/combos", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<import("@orbit/contracts").ComboItem>) =>
    api<import("@orbit/contracts").ComboItem>(`/combos/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  patch: (id: string, data: Partial<import("@orbit/contracts").ComboItem>) =>
    api<import("@orbit/contracts").ComboItem>(`/combos/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    api<{ success: boolean }>(`/combos/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  reorder: (comboIds: string[]) =>
    api<{ combos: import("@orbit/contracts").ComboItem[] }>("/combos/reorder", {
      method: "POST",
      body: JSON.stringify({ comboIds }),
    }),
  duplicate: (name: string, strategy?: string) =>
    api<import("@orbit/contracts").ComboItem>("/combos/duplicate", {
      method: "POST",
      body: JSON.stringify({ name, strategy }),
    }),
  test: (comboName: string, prompt?: string) =>
    api<import("@orbit/contracts").ComboTestResponse>("/combos/test", {
      method: "POST",
      body: JSON.stringify({ comboName, ...(prompt?.trim() ? { prompt: prompt.trim() } : {}) }),
    }),
  metrics: (comboName?: string) =>
    api<{ metrics: Record<string, import("@orbit/contracts").ComboMetrics> | import("@orbit/contracts").ComboMetrics | null }>(
      comboName ? `/combos/metrics?combo=${encodeURIComponent(comboName)}` : "/combos/metrics",
    ),
  builderOptions: () =>
    api<import("@orbit/contracts").ComboBuilderOptions>("/combos/builder/options"),
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
  tailscaleIpUrl?: string | null;
  publicIp?: string | null;
  machineId?: string;
  port?: number;
  tailscaleDetails?: {
    connected?: boolean;
    ip?: string | null;
    magicDns?: string | null;
    hostname?: string | null;
    source?: string;
  };
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
  }> => api<any>("/tunnels/tailscale"),
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
    return await api<any>("/tunnels/tailscale/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  disconnectTailscale: async (): Promise<{ success: boolean }> => {
    return await api<{ success: boolean }>("/tunnels/tailscale/disable", { method: "POST" });
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
      enabled?: boolean;
      transport?: string;
      activity?: Record<string, unknown>;
    }>("/mcp/status"),
  a2aStatus: () =>
    api<{ online: boolean; enabled?: boolean; tasks?: Record<string, unknown>; agent?: Record<string, unknown> }>(
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
  fastRequests?: number;
  standardRequests?: number;
  flexRequests?: number;
  fastCost?: number;
  standardCost?: number;
  flexCost?: number;
  flexSavings?: number;
  flexUsageSavingsTokens?: number;
  fastRequestSharePct?: number;
  successfulRequests?: number;
  successRatePct?: number;
  avgLatencyMs?: number;
  firstRequest?: string;
  lastRequest?: string;
}

export interface UsageAnalyticsProviderRow {
  provider: string;
  requests: number;
  totalTokens: number;
  promptTokens?: number;
  completionTokens?: number;
  cost: number;
  sharePct?: number;
}

export interface UsageAnalyticsModelRow {
  model: string;
  provider?: string;
  requests: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens: number;
  avgLatencyMs?: number;
  successRatePct?: string | number;
  lastUsed?: string;
  cost: number;
}

export interface UsageAnalyticsApiKeyRow {
  apiKey: string;
  apiKeyId: string | null;
  apiKeyName: string;
  historicalApiKeyNames?: string[];
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
  promptTokens?: number;
  completionTokens?: number;
  avgLatencyMs?: number;
  lastUsed?: string;
  cost: number;
}

export interface UsageAnalyticsTrendRow {
  date: string;
  requests?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost: number;
}

export interface UsageAnalyticsServiceTierRow {
  serviceTier: string;
  label?: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  savings?: number;
  usageSavingsTokens?: number;
}

export interface DiversityReport {
  score: number;
  providers: Record<string, { share: number }>;
  windowSize: number;
  ttlMs: number;
}

export interface UsageAnalyticsPayload {
  summary: UsageAnalyticsSummary;
  byProvider: UsageAnalyticsProviderRow[];
  byModel: UsageAnalyticsModelRow[];
  byApiKey: UsageAnalyticsApiKeyRow[];
  byAccount: UsageAnalyticsAccountRow[];
  byServiceTier?: UsageAnalyticsServiceTierRow[];
  dailyTrend: UsageAnalyticsTrendRow[];
  dailyByModel?: Record<string, Record<string, number>>;
  modelNames?: string[];
  weeklyPattern: Array<{ day: string; avgTokens: number; totalTokens?: number }>;
  activityMap: Record<string, number>;
  presetSummaries?: Record<string, { totalCost: number; totalRequests?: number }>;
  // The API reports whether the returned cost figures include token-price
  // equivalents for flat-rate subscriptions. Billed-cost mode omits it, so
  // treat anything but an explicit `true` as billed money.
  includesFlatRateEstimates?: boolean;
}

export const usageApi = {
  getAnalytics: (params: {
    range?: string;
    presets?: string;
    apiKeyIds?: string;
    startDate?: string;
    endDate?: string;
    includeFlatRateEstimates?: string;
  }) => {
    const q = new URLSearchParams();
    if (params.range) q.set("range", params.range);
    if (params.presets) q.set("presets", params.presets);
    if (params.apiKeyIds) q.set("apiKeyIds", params.apiKeyIds);
    if (params.startDate) q.set("startDate", params.startDate);
    if (params.endDate) q.set("endDate", params.endDate);
    if (params.includeFlatRateEstimates) q.set("includeFlatRateEstimates", params.includeFlatRateEstimates);
    return api<UsageAnalyticsPayload>(`/usage/analytics?${q.toString()}`);
  },
  getDiversity: () => api<DiversityReport>("/analytics/diversity"),
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
  connectionId: string;
  connectionIds: string[];
  name: string;
  groupId: string | null;
  createdAt: string;
  /** Optional provider metadata used by the quota overview page. */
  provider?: string;
  description?: string;
  dailyLimitUsd?: number | null;
  monthlyLimitUsd?: number | null;
  autoFailover?: boolean;
  allocations: Array<{
    apiKeyId: string;
    weight: number;
    capValue?: number;
    capUnit?: "percent" | "requests" | "tokens" | "usd";
    policy: "hard" | "soft" | "burst";
  }>;
}

export interface QuotaPoolUsage {
  poolId: string;
  generatedAt: string;
  dimensions: Array<{
    unit: "percent" | "requests" | "tokens" | "usd";
    window: "5h" | "hourly" | "daily" | "weekly" | "monthly";
    limit: number;
    consumedTotal: number;
    perKey: Array<{
      apiKeyId: string;
      consumed: number;
      fairShare: number;
      deficit: number;
      borrowing: boolean;
    }>;
  }>;
  burnRate?: { tokensPerSecond: number; timeToExhaustionMs: number | null };
}

export const quotaApi = {
  getOverview: (): Promise<QuotaOverviewSummary> => api<QuotaOverviewSummary>("/quota/overview"),
  listProviderQuotas: async (): Promise<ProviderQuotaItem[]> => {
    const res = await api<any>("/quota/providers");
    const list = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : res?.data;
    return Array.isArray(list) ? list : [];
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
    const res = await api<any>("/quota/pools");
    const pools = Array.isArray(res) ? res : Array.isArray(res?.pools) ? res.pools : Array.isArray(res?.items) ? res.items : res?.data;
    return Array.isArray(pools) ? pools : [];
  },
  getPoolUsage: (poolId: string) =>
    api<{ usage: QuotaPoolUsage }>(`/quota/pools/${encodeURIComponent(poolId)}/usage`),
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
    const res = await api<any>("/quota/groups");
    if (Array.isArray(res)) return res;
    return Array.isArray(res?.groups) ? res.groups : [];
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
    const res = await api<{ models: string[] }>(`/quota/keys/${encodeURIComponent(keyId)}/models`);
    return Array.isArray(res?.models) ? res.models : [];
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
  },
  listConsoleLogs: async (params?: {
    level?: string;
    limit?: number;
    search?: string;
  }): Promise<ConsoleLogItem[]> => {
    const q = new URLSearchParams();
    if (params?.level && params.level !== "all") q.set("level", params.level);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.search) q.set("search", params.search);
    const res = await api<any>(`/logs/console?${q.toString()}`);
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.logs)) return res.logs;
    return [];
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
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.search) q.set("search", params.search);
    const res = await api<any>(`/conversations?${q.toString()}`);
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.conversations)) return res.conversations;
    if (Array.isArray(res?.items)) return res.items;
    throw new ApiError(502, "会话接口返回了无法识别的数据格式");
  },
  getTurns: async (id: string, params?: { limit?: number; beforeSeq?: number; afterSeq?: number }): Promise<{ nodes: ConversationTurnItem[]; hasMore: boolean }> => {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.beforeSeq != null) q.set("beforeSeq", String(params.beforeSeq));
    if (params?.afterSeq != null) q.set("afterSeq", String(params.afterSeq));
    const queryString = q.toString() ? `?${q.toString()}` : "";
    const res = await api<any>(`/conversations/${encodeURIComponent(id)}/tree${queryString}`);
    if (Array.isArray(res)) return { nodes: res, hasMore: false };
    if (Array.isArray(res?.nodes)) return { nodes: res.nodes, hasMore: Boolean(res?.hasMore) };
    if (Array.isArray(res?.turns)) return { nodes: res.turns, hasMore: Boolean(res?.hasMore) };
    throw new ApiError(502, "会话详情接口返回了无法识别的数据格式");
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
    return await api<HealthDashboardData>("/monitoring/health");
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
  instanceId?: string;
  instanceName?: string;
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
  const instanceId = typeof raw.instanceId === "string" ? raw.instanceId : undefined;
  const instanceName = typeof raw.instanceName === "string" ? raw.instanceName : undefined;

  return { id, name, provider, status, lastTestedAt, latencyMs, errorMessage, instanceId, instanceName };
}

export interface NinerouterModelItem {
  id: string;
  name: string;
  provider: string;
  contextLength?: number;
  isAvailable?: boolean;
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
  getLogs: async (name: string, instanceId?: string): Promise<string[]> => {
    const query = instanceId ? `?instanceId=${encodeURIComponent(instanceId)}` : "";
    const res = await api<any>(`/services/${encodeURIComponent(name)}/logs${query}`);
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.logs)) return res.logs;
    if (typeof res?.logs === "string") return res.logs.split("\n");
    return [];
  },
  clearLogs: (name: string) =>
    api<{ success: boolean }>(`/services/${encodeURIComponent(name)}/logs`, { method: "DELETE" }),
  getCliproxyAccounts: async (instanceId?: string): Promise<CliproxyAccountItem[]> => {
    const query = instanceId ? `?instanceId=${encodeURIComponent(instanceId)}` : "";
    const res = await api<any>(`/services/cliproxy/accounts${query}`);
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
  get9RouterModels: async (): Promise<NinerouterModelItem[]> => {
    const res = await api<any>("/services/9router/models");
    return Array.isArray(res) ? res : Array.isArray(res?.models) ? res.models : [];
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
  proactiveConfig?: { thresholdRatio: number };
  preserveSystemPrompt: boolean;
  preserveSystemPromptMode?: "always" | "whenNoCache" | "never";
  engines: Record<string, { enabled: boolean; level?: string }>;
  activeComboId: string | null;
  cavemanOutputMode?: {
    enabled: boolean;
    intensity: "lite" | "full" | "ultra";
    autoClarity: boolean;
  };
  languageConfig?: {
    enabled: boolean;
    defaultLanguage: string;
    autoDetect: boolean;
    enabledPacks: string[];
  };
  ultraEngine?: "heuristic" | "slm";
  ultraSlmPrewarm?: boolean;
  liveZone?: { enabled: boolean };
  contextBudget?: {
    mode?: "floor" | "replace-autotrigger" | "off";
    policy?: "reserve-output" | "percentage" | "absolute";
    reserveOutputTokens?: number;
    percentage?: number;
    absoluteTokens?: number;
  };
}

export interface CompressionAnalyticsSummary {
  totalRequests: number;
  totalTokensSaved: number;
  avgSavingsPct: number;
  avgDurationMs: number;
  byMode: Record<
    string,
    { count: number; tokensSaved: number; avgSavingsPct: number; skipped?: number }
  >;
  byEngine?: Record<string, { count: number; tokensSaved: number; avgSavingsPct: number }>;
  byCompressionCombo?: Record<string, { count: number; tokensSaved: number }>;
  byProvider: Record<string, { count: number; tokensSaved: number }>;
  last24h: Array<{ hour: string; count: number; tokensSaved: number }>;
  totalSkipped?: number;
  bySkipReason?: Record<string, number>;
  validationFallbacks: number;
  realUsage: {
    requestsWithReceipts: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    estimatedUsdSaved: number;
    bySource: Record<string, number>;
  };
  mcpDescriptionCompression?: {
    snapshots: number;
    estimatedTokensSaved: number;
  };
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
  preview: (input: {
    messages: Array<{ role: string; content: string }>;
    mode?: "off" | "lite" | "standard" | "aggressive" | "ultra" | "rtk" | "stacked" | "caveman";
    engineId?: string;
    pipeline?: string[];
    heatmap?: "ultra" | "universal";
  }) => api<Record<string, unknown>>("/compression/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }),
  compare: (input: { messages: Array<{ role: string; content: string }>; engineIds?: string[] }) =>
    api<Record<string, unknown>>("/compression/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  getConfig: (): Promise<CompressionConfig> => api<CompressionConfig>("/settings/compression"),
  updateConfig: async (config: Partial<CompressionConfig>): Promise<{ success: boolean }> => {
    await api<CompressionConfig>("/settings/compression", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    return { success: true };
  },
  getTelemetry: (): Promise<CompressionTelemetrySummary> =>
    api<CompressionTelemetrySummary>("/settings/compression/run-telemetry"),
  getAnalytics: async (since: "24h" | "7d" | "30d" | "all" = "24h"): Promise<CompressionAnalyticsSummary> => {
    return api<CompressionAnalyticsSummary>(`/analytics/compression?since=${since}`);
  },
};

export const contextCombosApi = {
  getCombos: async (): Promise<CompressionComboItem[]> => {
    const res = await api<{ combos: CompressionComboItem[] }>("/context/combos");
    return Array.isArray(res?.combos) ? res.combos : [];
  },
  createCombo: async (payload: Partial<CompressionComboItem>): Promise<CompressionComboItem> => {
    return api<CompressionComboItem>("/context/combos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  updateCombo: async (id: string, payload: Partial<CompressionComboItem>): Promise<CompressionComboItem> => {
    return api<CompressionComboItem>(`/context/combos/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  deleteCombo: async (id: string): Promise<{ success: boolean }> => {
    return api<{ success: boolean }>(`/context/combos/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  setDefaultCombo: async (id: string): Promise<{ success: boolean }> => {
    return api<{ success: boolean }>(`/context/combos/${encodeURIComponent(id)}/set-default`, { method: "POST" });
  },
  getComboAssignments: async (id: string): Promise<string[]> => {
    const res = await api<any>(`/context/combos/${encodeURIComponent(id)}/assignments`);
    return Array.isArray(res?.assignments)
      ? res.assignments.map((item: { routingComboId: string }) => item.routingComboId)
      : [];
  },
  saveComboAssignments: async (id: string, routingComboIds: string[]): Promise<{ success: boolean }> => {
    await api<{ success: boolean }>(`/context/combos/${encodeURIComponent(id)}/assignments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routingComboIds }),
    });
    return { success: true };
  },
  getLanguagePacks: async (): Promise<LanguagePackItem[]> => {
    const res = await api<any>("/compression/language-packs");
    return Array.isArray(res?.packs) ? res.packs : [];
  },
};

/* ---------------- Remaining Gateway Proxy APIs ---------------- */

// 1. Compression Exclusions
export const compressionExclusionsApi = {
  getExclusions: async (): Promise<string[]> => {
    const res = await api<{ exclusions?: string[] }>("/settings/compression");
    return Array.isArray(res?.exclusions) ? res.exclusions : [];
  },
  saveExclusions: async (exclusions: string[]): Promise<{ success: boolean }> => {
    await api("/settings/compression", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exclusions }),
    });
    return { success: true };
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
    const res = await api<{ agents?: Array<Record<string, unknown>> }>("/acp/agents");
    return (Array.isArray(res?.agents) ? res.agents : []).map((agent) => ({
      id: String(agent.id ?? ""),
      name: String(agent.name ?? agent.id ?? "Unnamed agent"),
      command: String(agent.binary ?? agent.command ?? ""),
      cwd: String(agent.cwd ?? ""),
      status: agent.installed === true ? "idle" : "error",
      lastActive: new Date().toISOString(),
      protocol: String(agent.protocol ?? "stdio"),
    }));
  },
  spawn: async (payload: { name: string; command: string; cwd?: string }): Promise<CliAgentSession> => {
    const [binary, ...spawnArgs] = payload.command.trim().split(/\s+/);
    const res = await api<{ agents?: Array<Record<string, unknown>> }>("/acp/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: payload.name,
        name: payload.name,
        binary,
        versionCommand: `${binary} --version`,
        spawnArgs,
        protocol: "stdio",
      }),
    });
    const agent = res.agents?.find((item) => String(item.name ?? item.id) === payload.name) ?? res.agents?.[0];
    return { id: String(agent?.id ?? payload.name), name: payload.name, command: payload.command, cwd: payload.cwd ?? "", status: "idle", lastActive: new Date().toISOString(), protocol: "stdio" };
  },
  terminate: async (id: string): Promise<{ success: boolean }> => {
    await api(`/acp/agents?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    return { success: true };
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
    const res = await api<{ agents?: AcpAgentItem[] }>("/acp/agents");
    return Array.isArray(res?.agents) ? res.agents : [];
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
    const res = await api<{ data?: Array<Record<string, unknown>> }>("/cloud-agents/tasks?limit=100");
    return (Array.isArray(res?.data) ? res.data : []).map((task) => ({
      id: String(task.id ?? ""),
      name: String(task.providerId ?? task.provider_id ?? task.id ?? "Cloud task"),
      provider: String(task.providerId ?? task.provider_id ?? "unknown"),
      type: "hosted",
      endpoint: String(task.externalId ?? task.external_id ?? ""),
      model: String((task.options as Record<string, unknown> | undefined)?.model ?? ""),
      status: task.status === "completed" ? "healthy" : task.status === "failed" ? "degraded" : "inactive",
      requests24h: 0,
    }));
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
    const res = await api<{ tasks?: Array<Record<string, unknown>> }>("/conductor/fleet");
    return (Array.isArray(res?.tasks) ? res.tasks : []).map((task) => ({
      id: String(task.id ?? ""),
      name: String(task.mode ?? "Conductor task"),
      description: String(task.summary ?? ""),
      steps: [],
      status: task.status === "completed" ? "completed" : task.status === "failed" ? "failed" : task.status === "running" ? "running" : "idle",
      lastRunAt: typeof task.updated_at === "string" ? task.updated_at : undefined,
    }));
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
    const res = await api<{ routes?: AgentBridgeRoute[] }>("/tools/agent-bridge/routes");
    return Array.isArray(res?.routes) ? res.routes : [];
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
    const res = await api<{ requests?: Array<Record<string, unknown>> }>(`/tools/traffic-inspector/requests?limit=${limit}`);
    return (Array.isArray(res?.requests) ? res.requests : []).map((record) => ({
      id: String(record.id ?? ""), timestamp: String(record.timestamp ?? record.createdAt ?? ""), method: String(record.method ?? ""), path: String(record.path ?? ""),
      status: Number(record.status ?? record.statusCode ?? 0), durationMs: Number(record.durationMs ?? record.latencyMs ?? 0), model: String(record.model ?? ""), promptTokens: Number(record.promptTokens ?? 0), completionTokens: Number(record.completionTokens ?? 0), compressed: record.compressed === true, requestPayload: record.requestPayload, responsePayload: record.responsePayload,
    }));
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
  results: async (): Promise<DiscoveredEndpoint[]> => {
    const res = await api<{ results?: DiscoveredEndpoint[] }>("/discovery/results");
    return Array.isArray(res?.results) ? res.results : [];
  },
  scan: async (providerId: string): Promise<DiscoveredEndpoint[]> => {
    const res = await api<{ results?: DiscoveredEndpoint[] }>("/discovery/scan", { method: "POST", body: JSON.stringify({ providerId }) });
    return Array.isArray(res?.results) ? res.results : [];
  },
};

// 9. API Endpoints Manager
export interface ApiEndpointItem {
  id: string;
  path: string;
  targetProvider: string | null;
  protocol: "OpenAI" | "Anthropic" | "Gemini" | "Native";
  rateLimitPerMin: number | null;
  corsEnabled: boolean | null;
  authRequired: boolean;
  status: "active" | "disabled";
}

export const apiEndpointsApi = {
  list: async (): Promise<ApiEndpointItem[]> => {
    // The independent runtime exposes its registered inbound contract through
    // OpenAPI; there is no separate `/api-endpoints` persistence table. Keep
    // this view derived from the live contract so it cannot drift or invent
    // endpoint rows.
    const res = await api<OpenApiCatalog>("/openapi/spec");
    return (Array.isArray(res?.endpoints) ? res.endpoints : []).map((endpoint) => ({
      id: `${endpoint.method}:${endpoint.path}`,
      path: endpoint.path,
      targetProvider: endpoint.tags?.length ? endpoint.tags.join(", ") : null,
      protocol: /anthropic/i.test(endpoint.path) ? "Anthropic" : /gemini/i.test(endpoint.path) ? "Gemini" : /openai|v1/i.test(endpoint.path) ? "OpenAI" : "Native",
      rateLimitPerMin: null,
      corsEnabled: null,
      authRequired: endpoint.security || endpoint.alwaysProtected === true,
      status: "active",
    }));
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
    const res = await api<{ webhooks?: WebhookSubscription[] }>("/webhooks");
    return Array.isArray(res?.webhooks) ? res.webhooks : [];
  },
};

// 11. System Outbound Proxy
export interface OutboundProxyConfig {
  type: "http" | "socks5" | "https";
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export interface SystemProxyConfig {
  global: OutboundProxyConfig | null;
  providers: Record<string, OutboundProxyConfig>;
  combos: Record<string, OutboundProxyConfig>;
  keys: Record<string, OutboundProxyConfig>;
}

export const systemProxyApi = {
  getConfig: async (): Promise<SystemProxyConfig> => {
    return await api<SystemProxyConfig>("/settings/proxy");
  },
  updateConfig: async (global: OutboundProxyConfig | null): Promise<SystemProxyConfig> => {
    return await api<SystemProxyConfig>("/settings/proxy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ global }),
    });
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

export type UtilizationTimeRange = "1h" | "24h" | "7d" | "30d";
export type ComboForecastHorizon = "24h" | "7d" | "30d";
export type ComboForecastConfidence = "high" | "medium" | "low" | "no_data";
export type ComboForecastRiskLevel = "low" | "medium" | "high" | "critical" | "unknown";
export type ComboAutopilotSeverity = "info" | "warning" | "critical";
export type ComboAutopilotStatus = "healthy" | "warning" | "critical";
export type ComboAutopilotState = "healthy" | "degraded" | "down";

export interface ComboHealthMetrics {
  comboId: string;
  comboName: string;
  strategy: string;
  models: string[];
  targetHealth?: Array<{
    executionKey: string;
    stepId: string;
    model: string;
    provider: string;
    connectionId: string | null;
    label: string | null;
    requests: number;
    successRate: number;
    avgLatencyMs: number;
    lastStatus: "ok" | "error" | null;
    lastUsedAt: string | null;
    quotaRemainingPct: number | null;
    quotaIsExhausted: boolean | null;
    quotaTrend: "improving" | "stable" | "declining" | null;
    quotaScope: "connection" | "provider" | "none";
  }>;
  quotaHealth: {
    providers: Array<{
      provider: string;
      remainingPct: number;
      isExhausted: boolean;
      trend: "improving" | "stable" | "declining";
    }>;
    worstRemainingPct: number;
  };
  usageSkew: {
    modelDistribution: Array<{
      model: string;
      requestShare: number;
      tokenShare: number;
    }>;
    giniCoefficient: number;
  };
  performance: {
    avgLatencyMs: number;
    successRate: number;
    totalRequests: number;
  };
}

export interface ComboHealthResponse {
  timeRange: UtilizationTimeRange;
  combos: ComboHealthMetrics[];
}

export interface ComboForecastTarget {
  executionKey: string;
  stepId: string | null;
  provider: string;
  model: string;
  connectionId: string | null;
  label: string | null;
  trafficShare: number;
  history: {
    requests: number;
    costUsd: number;
    totalTokens: number;
  };
  forecast: {
    projectedRequests: number;
    projectedCostUsd: number;
    projectedTokens: number;
  };
  quota: {
    scope: "connection" | "provider" | "none";
    remainingPct: number | null;
    depletionPctPerDay: number | null;
    projectedRemainingPct: number | null;
    timeToExhaustDays: number | null;
    risk: ComboForecastRiskLevel;
  };
}

export interface ComboForecastMetrics {
  comboId: string;
  comboName: string;
  strategy: string;
  confidence: ComboForecastConfidence;
  history: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    reasoningTokens: number;
    totalTokens: number;
    costUsd: number;
    avgDailyCostUsd: number;
  };
  forecast: {
    projectedRequests: number;
    projectedTokens: number;
    projectedCostUsd: number;
  };
  quotaRisk: {
    level: ComboForecastRiskLevel;
    projectedWorstRemainingPct: number | null;
    timeToExhaustDays: number | null;
    worstTargetExecutionKey: string | null;
  };
  targets: ComboForecastTarget[];
  dataQuality: {
    pricingCoveragePct: number;
    quotaCoverage: "connection" | "provider" | "partial" | "none";
    notes: string[];
  };
}

export interface ComboForecastResponse {
  timeRange: UtilizationTimeRange;
  horizon: ComboForecastHorizon;
  asOf: string;
  method: "linear_history";
  combos: ComboForecastMetrics[];
}

export interface ComboAutopilotIssue {
  id: string;
  severity: ComboAutopilotSeverity;
  kind: string;
  title: string;
  recommendation: string;
  evidence: Record<string, unknown>;
  target: {
    comboId: string;
    comboName: string;
    provider?: string;
    connectionId?: string | null;
    executionKey?: string;
    model?: string;
  };
  actions: Array<{
    type: string;
    mode: "manual";
    label: string;
    href?: string;
  }>;
}

export interface ComboAutopilotCombo {
  comboId: string;
  comboName: string;
  strategy: string;
  state: ComboAutopilotState;
  score: number;
  signals: {
    totalRequests: number;
    successRate: number;
    avgLatencyMs: number;
    worstQuotaRemainingPct: number | null;
    forecastRisk: ComboForecastRiskLevel;
    forecastConfidence: ComboForecastConfidence;
    usageSkew: number;
    targetCount: number;
    providerIssueCount: number;
    dataQualityNotes: string[];
  };
  issues: ComboAutopilotIssue[];
}

export interface ComboAutopilotReport {
  status: ComboAutopilotStatus;
  checkedAt: string;
  timeRange: UtilizationTimeRange;
  horizon: ComboForecastHorizon;
  summary: {
    comboCount: number;
    healthyCount: number;
    degradedCount: number;
    downCount: number;
    issueCount: number;
    suggestionCount: number;
    actionableCount?: number;
  };
  combos: ComboAutopilotCombo[];
}

export interface ComboScoringInspectorFactor {
  key: string;
  value: number;
  weight: number;
  contribution: number;
  source: string;
  note?: string;
}

export interface ComboScoringInspectorTarget {
  executionKey: string;
  stepId: string | null;
  provider: string;
  model: string;
  connectionId: string | null;
  label: string | null;
  rank: number;
  score: number;
  factors: ComboScoringInspectorFactor[];
  signals: {
    quotaRemainingPct: number | null;
    projectedQuotaRemainingPct: number | null;
    successRate: number | null;
    avgLatencyMs: number | null;
    forecastRisk: ComboForecastRiskLevel | null;
    autopilotIssueCount: number;
    resilience?: any;
  };
}

export interface ComboScoringInspectorCombo {
  comboId: string;
  comboName: string;
  strategy: string;
  taskType: string;
  weights: Record<string, number>;
  weightSource: string;
  modePack: string | null;
  selectedExecutionKey: string | null;
  targets: ComboScoringInspectorTarget[];
  warnings: string[];
}

export interface ComboScoringInspectorResponse {
  asOf: string;
  timeRange: UtilizationTimeRange;
  horizon: ComboForecastHorizon;
  method: "read_only_recompute";
  combos: ComboScoringInspectorCombo[];
}

export interface ComboHealthDashboardResponse {
  health: ComboHealthResponse;
  forecast: ComboForecastResponse | null;
  autopilot: ComboAutopilotReport | null;
  scoring: ComboScoringInspectorResponse | null;
  errors: Partial<Record<"forecast" | "autopilot" | "scoring", string>>;
}

export const comboHealthApi = {
  getDashboard: (params?: {
    range?: UtilizationTimeRange;
    horizon?: ComboForecastHorizon;
    comboId?: string;
    taskType?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params?.range) sp.set("range", params.range);
    if (params?.horizon) sp.set("horizon", params.horizon);
    if (params?.comboId) sp.set("comboId", params.comboId);
    if (params?.taskType) sp.set("taskType", params.taskType);
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return api<ComboHealthDashboardResponse>(`/usage/combo-health-dashboard${qs}`);
  },
  getOverview: async (params?: { range?: string; horizon?: string }): Promise<{ combos: ComboHealthItem[]; overallHealth: number }> => {
    const sp = new URLSearchParams();
    if (params?.range) sp.set("range", params.range);
    if (params?.horizon) sp.set("horizon", params.horizon);
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    const res = await api<any>(`/usage/combo-health-dashboard${qs}`);

    const autopilotCombos = res?.autopilot?.combos || [];
    const healthCombos = res?.health?.combos || [];
    const healthMap = new Map<string, any>(healthCombos.map((c: any) => [c.comboId, c]));

    const items: ComboHealthItem[] = autopilotCombos.map((ac: any) => {
      const hc = healthMap.get(ac.comboId);
      const perf = hc?.performance || {};
      const score = Math.round(ac.score ?? (perf.successRate != null ? perf.successRate * 100 : 100));
      return {
        id: ac.comboId,
        name: ac.comboName,
        score,
        state: ac.state || "healthy",
        latencyMs: Math.round(ac.signals?.avgLatencyMs ?? perf.avgLatencyMs ?? 0),
        successRate: Number(((perf.successRate != null ? perf.successRate * 100 : 100)).toFixed(1)),
        activeRoutes: ac.signals?.targetCount ?? (hc?.models?.length || 0),
        riskLevel: ac.signals?.forecastRisk === "critical" ? "critical" : ac.signals?.forecastRisk === "high" ? "high" : ac.signals?.forecastRisk === "medium" ? "medium" : "low",
        issues: (ac.issues || []).map((iss: any) => ({
          severity: iss.severity || "info",
          message: iss.message || iss.kind || "告警",
        })),
      };
    });

    const summary = res?.autopilot?.summary;
    const totalCount = summary?.comboCount || items.length;
    const healthyCount = summary?.healthyCount || items.filter((i) => i.state === "healthy").length;
    const overallHealth = totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 100;

    return {
      combos: items,
      overallHealth,
    };
  },
};

// 2. Provider Utilization & Heatmap
export interface ProviderUtilizationPoint {
  timestamp: string;
  provider: string;
  remainingPct: number;
  isExhausted: boolean;
  windowKey: string;
}

export interface ConnectionMetaEntry {
  email?: string | null;
  name?: string | null;
  displayName?: string | null;
}

export interface ProviderUtilizationResponse {
  timeRange: UtilizationTimeRange;
  bucketSizeMinutes: number;
  providers: string[];
  data: ProviderUtilizationPoint[];
  connectionMeta?: Record<string, ConnectionMetaEntry>;
}

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
  getUtilization: (params?: {
    range?: UtilizationTimeRange;
    provider?: string;
    aggregateBy?: "provider" | "connection";
  }) => {
    const sp = new URLSearchParams();
    if (params?.range) sp.set("range", params.range);
    if (params?.provider) sp.set("provider", params.provider);
    if (params?.aggregateBy) sp.set("aggregateBy", params.aggregateBy);
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return api<ProviderUtilizationResponse>(`/usage/utilization${qs}`);
  },
  getMetrics: async (params?: { range?: string; aggregateBy?: string }): Promise<UtilizationProviderMetric[]> => {
    const sp = new URLSearchParams();
    sp.set("range", params?.range || "24h");
    sp.set("aggregateBy", params?.aggregateBy || "provider");
    const res = await api<any>(`/usage/utilization?${sp.toString()}`);

    if (Array.isArray(res?.metrics)) {
      return res.metrics;
    }

    const providers: string[] = res?.providers || [];
    const points: Array<{ provider: string; remainingPct: number; isExhausted: boolean }> = res?.data || [];

    return providers.map((prov) => {
      const provPoints = points.filter((p) => p.provider === prov);
      const latestPoint = provPoints[provPoints.length - 1];
      const remainingPct = latestPoint?.remainingPct ?? 100;
      const usedPct = Math.max(0, Math.min(100, Math.round(100 - remainingPct)));
      return {
        providerId: prov,
        providerName: prov,
        tpmUtilization: usedPct,
        rpmUtilization: usedPct,
        budgetUtilization: usedPct,
        currentRpm: latestPoint?.isExhausted ? 100 : 0,
        maxRpm: 100,
        currentTpm: usedPct * 1000,
        maxTpm: 100000,
        trend: latestPoint?.isExhausted ? "degrading" : "stable",
      };
    });
  },
};

// 3. Cache Performance & Reasoning Cache
export interface SemanticCacheStats {
  memoryEntries: number;
  dbEntries: number;
  hits: number;
  misses: number;
  hitRate: string;
  tokensSaved: number;
}

export interface CacheHealthModel {
  model: string;
  calls: number;
  cacheReadTotal: number;
  cacheWriteTotal: number;
  writeReadRatio: number;
  heavyWriteCalls: number;
}

export type CacheHealthVerdict = "healthy" | "degraded" | "thrash" | "no-data";

export interface CacheHealthResponse {
  totalCalls: number;
  cacheReadTotal: number;
  cacheWriteTotal: number;
  writeReadRatio: number;
  warmCalls: number;
  coldCalls: number;
  rewriteCalls: number;
  uncachedCalls: number;
  writeP50: number;
  writeP90: number;
  writeP99: number;
  writeMax: number;
  heavyWriteCalls: number;
  heavyWriteCallShare: number;
  heavyWriteTokenShare: number;
  heavyWriteThreshold: number;
  verdict: CacheHealthVerdict;
  byModel: CacheHealthModel[];
  timeRange: "1h" | "24h" | "7d" | "30d";
  since: string;
  truncated: boolean;
}

export interface PromptCacheProviderStats {
  requests: number;
  totalRequests?: number;
  cachedRequests?: number;
  inputTokens: number;
  cachedTokens: number;
  cacheCreationTokens: number;
}

export interface PromptCacheMetrics {
  totalRequests: number;
  requestsWithCacheControl: number;
  totalInputTokens: number;
  totalCachedTokens: number;
  totalCacheCreationTokens: number;
  tokensSaved: number;
  estimatedCostSaved: number;
  byProvider: Record<string, PromptCacheProviderStats>;
  byStrategy: Record<string, PromptCacheProviderStats>;
  health?: CacheHealthResponse;
  lastUpdated: string;
}

export interface CacheTrendPoint {
  timestamp: string;
  requests: number;
  cachedRequests: number;
  inputTokens: number;
  cachedTokens: number;
  cacheCreationTokens: number;
}

export interface IdempotencyStats {
  activeKeys: number;
  windowMs: number;
}

export interface CacheConfigData {
  semanticCacheEnabled: boolean;
}

export interface FullCacheStatsResponse {
  semanticCache: SemanticCacheStats;
  promptCache: PromptCacheMetrics | null;
  trend: CacheTrendPoint[];
  idempotency: IdempotencyStats;
  config?: CacheConfigData;
}

export interface SemanticCacheItem {
  id: string;
  signature: string;
  model: string;
  hit_count: number;
  tokens_saved: number;
  created_at: string;
  expires_at: string;
}

export interface SemanticCacheEntriesResponse {
  entries: SemanticCacheItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReasoningCacheEntry {
  toolCallId: string;
  provider: string;
  model: string;
  reasoning: string;
  charCount: number;
  createdAt: string;
  expiresAt: string;
}

export interface ReasoningCacheStats {
  memoryEntries: number;
  dbEntries: number;
  totalEntries: number;
  totalChars: number;
  hits: number;
  misses: number;
  replays: number;
  replayRate: string;
  byProvider: Record<string, { entries: number; chars: number }>;
  byModel: Record<string, { entries: number; chars: number }>;
  oldestEntry: string | null;
  newestEntry: string | null;
}

export interface ReasoningCacheResponse {
  stats: ReasoningCacheStats;
  entries: ReasoningCacheEntry[];
}

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
  getFullStats: (params?: { trendHours?: number }) => {
    const q = params?.trendHours ? `?trendHours=${params.trendHours}` : "";
    return api<FullCacheStatsResponse>(`/cache${q}`);
  },
  getCacheHealth: (params?: { range?: "1h" | "24h" | "7d" | "30d"; model?: string }) => {
    const q = new URLSearchParams();
    if (params?.range) q.set("range", params.range);
    if (params?.model) q.set("model", params.model);
    const qs = q.toString();
    return api<CacheHealthResponse>(`/usage/cache-health${qs ? `?${qs}` : ""}`);
  },
  getStats: async (): Promise<CacheStatsSummary> => {
    const raw = await api<any>("/cache");
    const semantic = raw?.semanticCache ?? {};
    const prompt = raw?.promptCache ?? {};

    const entriesCount = Number(raw?.entriesCount ?? semantic.dbEntries ?? semantic.memoryEntries ?? raw?.size ?? 0) || 0;
    const totalTokensSaved = Number(raw?.totalTokensSaved ?? prompt.tokensSaved ?? semantic.tokensSaved ?? 0) || 0;
    const costSavedUsd = Number(raw?.costSavedUsd ?? prompt.estimatedCostSaved ?? 0) || 0;
    const hitRate = Number(raw?.hitRate ?? semantic.hitRate ?? (prompt.totalInputTokens > 0 ? (prompt.totalCachedTokens / prompt.totalInputTokens) * 100 : 0)) || 0;
    const totalHits = Number(raw?.totalHits ?? semantic.hits ?? 0) || 0;
    const totalMisses = Number(raw?.totalMisses ?? semantic.misses ?? 0) || 0;
    const memoryUsedMb = Number(raw?.memoryUsedMb ?? 0) || 0;
    const maxMemoryMb = Number(raw?.maxMemoryMb ?? 2048) || 2048;
    const reasoningCacheHitRate = Number(raw?.reasoningCacheHitRate ?? 0) || 0;
    const reasoningTokensSaved = Number(raw?.reasoningTokensSaved ?? 0) || 0;

    return {
      hitRate: Number.isFinite(hitRate) ? parseFloat(hitRate.toFixed(1)) : 0,
      totalHits,
      totalMisses,
      totalTokensSaved,
      costSavedUsd: Number.isFinite(costSavedUsd) ? parseFloat(costSavedUsd.toFixed(2)) : 0,
      memoryUsedMb,
      maxMemoryMb,
      entriesCount,
      reasoningCacheHitRate: Number.isFinite(reasoningCacheHitRate) ? parseFloat(reasoningCacheHitRate.toFixed(1)) : 0,
      reasoningTokensSaved,
      promptCache: prompt,
    };
  },
  clearCache: async (params?: { model?: string; signature?: string; staleMs?: number }): Promise<{ ok?: boolean; cleared?: number; scope?: string }> => {
    const q = new URLSearchParams();
    if (params?.model) q.set("model", params.model);
    if (params?.signature) q.set("signature", params.signature);
    if (params?.staleMs) q.set("staleMs", String(params.staleMs));
    const qs = q.toString();
    return await api(`/cache${qs ? `?${qs}` : ""}`, { method: "DELETE" });
  },
  getEntries: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    model?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.search) q.set("search", params.search);
    if (params?.model) q.set("model", params.model);
    if (params?.sortBy) q.set("sortBy", params.sortBy);
    if (params?.sortOrder) q.set("sortOrder", params.sortOrder);
    const qs = q.toString();
    return api<SemanticCacheEntriesResponse>(`/cache/entries${qs ? `?${qs}` : ""}`);
  },
  deleteEntry: (signature: string) =>
    api<{ ok: boolean; deleted: number }>(`/cache/entries?signature=${encodeURIComponent(signature)}`, {
      method: "DELETE",
    }),
  deleteEntryByModel: (model: string) =>
    api<{ ok: boolean; deleted: number }>(`/cache/entries?model=${encodeURIComponent(model)}`, {
      method: "DELETE",
    }),
  getReasoning: (params?: {
    provider?: string;
    model?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.provider) q.set("provider", params.provider);
    if (params?.model) q.set("model", params.model);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    const qs = q.toString();
    return api<ReasoningCacheResponse>(`/cache/reasoning${qs ? `?${qs}` : ""}`);
  },
  clearReasoning: (params?: { toolCallId?: string; provider?: string }) => {
    const q = new URLSearchParams();
    if (params?.toolCallId) q.set("toolCallId", params.toolCallId);
    if (params?.provider) q.set("provider", params.provider);
    const qs = q.toString();
    return api<{ ok: boolean; cleared: number; scope: string }>(`/cache/reasoning${qs ? `?${qs}` : ""}`, {
      method: "DELETE",
    });
  },
};

// 4. Search Analytics
export interface SearchStats {
  total: number;
  today: number;
  cached: number;
  errors: number;
  totalCostUsd: number;
  byProvider: Record<string, { count: number; costUsd: number }>;
  last24h: Array<{ hour: string; count: number }>;
  cacheHitRate: number;
  avgDurationMs: number;
}

export const searchAnalyticsApi = {
  getData: async (): Promise<SearchStats> => {
    return await api<SearchStats>("/search/analytics");
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

export interface EvalTargetOption {
  key: string;
  type: "suite-default" | "model" | "combo";
  id: string | null;
  label: string;
  description: string;
}

export interface EvalApiKeyOption {
  id: string;
  name: string;
  isActive: boolean;
}

export interface EvalCasePreview {
  id: string;
  name: string;
  model?: string;
  input?: {
    messages?: Array<{ role: string; content: string }>;
  };
  expected?: {
    strategy?: string;
    value?: string;
  };
  tags?: string[];
}

export interface EvalSuite {
  id: string;
  name: string;
  description?: string;
  source?: "built-in" | "custom";
  caseCount?: number;
  cases?: EvalCasePreview[];
  updatedAt?: string;
}

export interface EvalResult {
  caseId: string;
  caseName: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: {
    expected?: string;
    actual?: string;
    actualSnippet?: string;
    searchTerm?: string;
    pattern?: string;
  };
}

export interface EvalRunSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

export interface EvalRun {
  id: string;
  runGroupId: string | null;
  suiteId: string;
  suiteName: string;
  target: {
    type: "suite-default" | "model" | "combo";
    id: string | null;
    key: string;
    label: string;
  };
  avgLatencyMs: number;
  summary: EvalRunSummary;
  results: EvalResult[];
  outputs: Record<string, string>;
  createdAt: string;
}

export interface EvalScorecard {
  suites: number;
  totalCases: number;
  totalPassed: number;
  overallPassRate: number;
  perSuite: Array<{ id: string; name: string; passRate: number }>;
}

export interface EvalsDashboardPayload {
  suites: EvalSuite[];
  recentRuns: EvalRun[];
  scorecard: EvalScorecard | null;
  targets: EvalTargetOption[];
  apiKeys: EvalApiKeyOption[];
}

export const evalsApi = {
  getDashboard: async (): Promise<EvalsDashboardPayload> => {
    return api("/evals");
  },
  runSuite: async (params: {
    suiteId: string;
    target?: { type: "suite-default" | "model" | "combo"; id: string | null };
    compareTarget?: { type: "suite-default" | "model" | "combo"; id: string | null };
    apiKeyId?: string;
  }): Promise<{ runs: EvalRun[]; scorecard: EvalScorecard | null }> => {
    return api("/evals", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  saveSuite: async (suite: {
    id?: string;
    name: string;
    description?: string;
    cases: Array<{
      name: string;
      model?: string;
      userPrompt?: string;
      systemPrompt?: string;
      strategy?: string;
      expectedValue?: string;
      tags?: string;
    }>;
  }): Promise<EvalSuite> => {
    return api("/evals/suites", {
      method: "POST",
      body: JSON.stringify(suite),
    });
  },
  deleteSuite: async (suiteId: string): Promise<{ success: boolean }> => {
    return api(`/evals/suites/${encodeURIComponent(suiteId)}`, {
      method: "DELETE",
    });
  },
  list: async (): Promise<EvalBenchmarkResult[]> => {
    const res = await api<{ evals?: EvalBenchmarkResult[] }>("/evals");
    return Array.isArray(res?.evals) ? res.evals : [];
  },
};

// 6. Provider Stats & Latency
export interface ProviderStat {
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  avgLatencyMs: number | null;
  totalTokensIn: number;
  totalTokensOut: number;
}

export interface ModelStat {
  provider: string;
  model: string;
  requests: number;
  avgLatencyMs: number | null;
  successfulRequests: number;
}

export interface ToolLatencyStat {
  avgTtftAfterToolMs: number;
  avgGapAfterToolMs: number;
  measurementCount: number;
}

export interface ProviderStatsResponse {
  providers: ProviderStat[];
  models: ModelStat[];
  comboMetrics?: Record<string, unknown>;
  telemetry?: Record<string, unknown>;
  toolLatency?: Record<string, ToolLatencyStat>;
}

export const providerStatsApi = {
  getStats: async (): Promise<ProviderStatsResponse> => {
    return await api<ProviderStatsResponse>("/provider-stats");
  },
};

/* ---------------- Pricing & Costs APIs ---------------- */

export type PricingSource = "default" | "litellm" | "modelsDev" | "user";

export interface PricingSyncStatus {
  enabled: boolean;
  lastSync: string | null;
  lastSyncModelCount: number;
  nextSync: string | null;
  intervalMs: number;
  sources: string[];
}

export interface PricingCatalogModel {
  id: string;
  name: string;
  custom?: boolean;
}

export interface PricingCatalogProvider {
  id: string;
  alias: string;
  name?: string;
  authType: string;
  format: string;
  modelCount: number;
  models: PricingCatalogModel[];
  pricingKey?: string;
  displayPrefix?: string;
  modelOverrideEligible?: boolean;
}

export interface PricingDataResponse {
  pricing?: Record<string, Record<string, Record<string, number>>>;
  sourceMap?: Record<string, Record<string, PricingSource>>;
}

export interface PricingModelEntry {
  id: string;
  name: string;
  provider: string;
  inputCostPerM: number;
  outputCostPerM: number;
  cachedCostPerM: number;
  reasoningCostPerM?: number;
  source: PricingSource;
  lastUpdated: string;
}

export const pricingApi = {
  getCatalog: () => api<Record<string, PricingCatalogProvider>>("/pricing/models"),
  getPricingWithSources: () => api<PricingDataResponse>("/pricing?includeSources=1"),
  getSyncStatus: () => api<PricingSyncStatus>("/pricing/sync"),
  saveProviderPricing: (pricingKey: string, providerData: Record<string, Record<string, number>>) =>
    api<Record<string, unknown>>("/pricing", {
      method: "PATCH",
      body: JSON.stringify({ [pricingKey]: providerData }),
    }),
  resetProviderPricing: (provider: string, model?: string) => {
    const q = new URLSearchParams({ provider });
    if (model) q.set("model", model);
    return api<Record<string, unknown>>(`/pricing?${q.toString()}`, { method: "DELETE" });
  },
  resetAllPricing: () => api<Record<string, unknown>>("/pricing", { method: "DELETE" }),
  sync: (sources?: string[]) =>
    api<{ success: boolean; modelCount?: number; providerCount?: number; error?: string }>(
      "/pricing/sync",
      { method: "POST", body: JSON.stringify(sources ? { sources } : {}) }
    ),
  clearSynced: () => api<{ success: boolean; message: string }>("/pricing/sync", { method: "DELETE" }),
  list: async (): Promise<{ models: PricingModelEntry[]; lastSync: string; sourceCount: number }> => {
    const res = await api<any>("/pricing");
    if (Array.isArray(res?.models)) {
      return res;
    }
    const models: PricingModelEntry[] = [];
    if (res && typeof res === "object") {
      for (const [provider, modelMap] of Object.entries(res)) {
        if (modelMap && typeof modelMap === "object") {
          for (const [modelId, p] of Object.entries(modelMap as Record<string, any>)) {
            models.push({
              id: modelId,
              name: modelId,
              provider,
              inputCostPerM: p?.input ?? 0,
              outputCostPerM: p?.output ?? 0,
              cachedCostPerM: p?.cached ?? 0,
              reasoningCostPerM: p?.reasoning,
              source: p?.source || "default",
              lastUpdated: p?.updatedAt || "系统内置",
            });
          }
        }
      }
    }
    return {
      models,
      lastSync: "已同步最新定价规则",
      sourceCount: Object.keys(res || {}).length,
    };
  },
};

export interface BudgetSummary {
  dailyLimitUsd?: number;
  weeklyLimitUsd?: number;
  monthlyLimitUsd?: number;
  warningThreshold?: number | null;
  resetInterval?: "daily" | "weekly" | "monthly" | null;
  resetTime?: string | null;
  totalCostToday?: number;
  totalCostMonth?: number;
  totalCostPeriod?: number;
  activeLimitUsd?: number;
  budgetResetAt?: number | null;
  nextResetAt?: number | null;
  periodStartAt?: number | null;
  budgetCheck?: { allowed: boolean; remaining?: number };
}

export interface BulkBudgetResponse {
  budgets: Record<string, BudgetSummary>;
}

export interface SetBudgetPayload {
  apiKeyId: string;
  dailyLimitUsd?: number;
  weeklyLimitUsd?: number;
  monthlyLimitUsd?: number;
  warningThreshold?: number;
  warningThresholdPct?: number;
  resetInterval?: "daily" | "weekly" | "monthly";
  resetTime?: string;
}

export interface ProviderCostBreakdown {
  provider: string;
  cost: number;
  pct: number;
}

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
  getBulk: async (): Promise<Record<string, BudgetSummary>> => {
    const res = await api<BulkBudgetResponse>("/usage/budget/bulk");
    return res?.budgets ?? {};
  },
  getBudget: async (apiKeyId: string): Promise<BudgetSummary> => {
    return api<BudgetSummary>(`/usage/budget?apiKeyId=${encodeURIComponent(apiKeyId)}`);
  },
  setBudget: async (payload: SetBudgetPayload): Promise<{ success: boolean; apiKeyId?: string; budget?: BudgetSummary }> => {
    return api("/usage/budget", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  deleteBudget: async (apiKeyId: string): Promise<{ success: boolean }> => {
    return api(`/usage/budget?apiKeyId=${encodeURIComponent(apiKeyId)}`, {
      method: "DELETE",
    });
  },
  getProviderBreakdown: async (apiKeyId: string): Promise<ProviderCostBreakdown[]> => {
    const data = await api<{ byProvider?: Array<{ provider?: string; totalCost?: number; cost?: number }> }>(
      `/usage/analytics?range=30d&apiKeyIds=${encodeURIComponent(apiKeyId)}`
    );
    const arr = Array.isArray(data?.byProvider) ? data.byProvider : [];
    const total = arr.reduce((s, p) => s + Number(p?.totalCost ?? p?.cost ?? 0), 0) || 0;
    return arr
      .map((p) => {
        const cost = Number(p?.totalCost ?? p?.cost ?? 0);
        return {
          provider: String(p?.provider ?? "未知提供商"),
          cost,
          pct: total > 0 ? (cost / total) * 100 : 0,
        };
      })
      .filter((p) => p.cost > 0)
      .sort((a, b) => b.cost - a.cost);
  },
  list: async (): Promise<BudgetRuleItem[]> => {
    const res = await api<{ budgets?: BudgetRuleItem[] }>("/budget");
    return Array.isArray(res?.budgets) ? res.budgets : [];
  },
};

export interface FreeBudgetPerModel {
  provider: string;
  modelId: string;
  displayName: string;
  monthlyTokens: number;
  creditTokens: number;
  freeType: string;
  poolKey: string | null;
  tos: string;
}

export interface FreeBudgetSummaryData {
  steadyRecurringTokens: number;
  steadyWithRecurringCreditsTokens: number;
  firstMonthRealisticTokens: number;
  usedThisMonth: number;
  remaining: number;
  modelCount: number;
  poolCount: number;
  perModel: FreeBudgetPerModel[];
  boostMonthlyTokens?: number;
  uncappedProviders?: string[];
  catalogUpdatedAt?: string | null;
  noCredentialProviders?: string[];
}

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
    const res = await api<{ tiers?: FreeTierItem[] }>("/free-tiers");
    return Array.isArray(res?.tiers) ? res.tiers : [];
  },
  getSummary: async (params?: { excludeTosAvoid?: boolean }): Promise<FreeBudgetSummaryData> => {
    const qs = params?.excludeTosAvoid ? "?excludeTosAvoid=1" : "";
    return await api<FreeBudgetSummaryData>(`/free-tier/summary${qs}`);
  },
};

export type ProviderAuthType = "noauth" | "oauth" | "apikey";

export interface ProviderModelScore {
  modelId: string;
  modelName: string;
  score: number;
  eloRaw: number | null;
  confidence: string | null;
  category: string;
}

export interface ProviderReliabilityUsage {
  requests: number;
  successes: number;
  windowHours: number;
  rate?: number;
}

export interface ProviderReliability {
  connections: Array<{
    testStatus: string | null;
    rateLimitedUntil: string | null;
    state: string;
  }>;
  state: string;
  usage?: ProviderReliabilityUsage;
}

export interface FreeProviderRankingItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  textIcon?: string;
  category: ProviderAuthType;
  topModel: ProviderModelScore | null;
  averageScore: number;
  modelCount: number;
  reliability?: ProviderReliability;
}

export const freeProviderRankingsApi = {
  getRankings: async (params?: {
    category?: string;
    limit?: number;
    configuredOnly?: boolean;
    availableOnly?: boolean;
    withUsage?: boolean;
    usageRange?: string;
    sortBy?: "elo" | "reliability";
  }): Promise<FreeProviderRankingItem[]> => {
    const sp = new URLSearchParams();
    if (params?.category) sp.set("category", params.category);
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.configuredOnly) sp.set("configuredOnly", "1");
    if (params?.availableOnly) sp.set("availableOnly", "1");
    if (params?.withUsage ?? true) sp.set("withUsage", "1");
    if (params?.usageRange) sp.set("usageRange", params.usageRange);
    if (params?.sortBy) sp.set("sortBy", params.sortBy);
    const qs = sp.toString();
    const res = await api<{ rankings?: FreeProviderRankingItem[] }>(`/free-provider-rankings${qs ? `?${qs}` : ""}`);
    return Array.isArray(res?.rankings) ? res.rankings : [];
  },
};

export const resetCreditsApi = {
  list: (connectionId: string) => api<{ ok: boolean; availableCount: number; credits: Array<{ selectionToken: string; expiresAt?: string | null }> }>(`/usage/codex-reset-credit?connectionId=${encodeURIComponent(connectionId)}`),
  consume: (connectionId: string, creditId?: string) => api<{ ok: boolean; outcome: "reset" | "alreadyRedeemed"; usage: Record<string, unknown> }>("/usage/codex-reset-credit", {
    method: "POST",
    body: JSON.stringify({ connectionId, idempotencyKey: crypto.randomUUID(), ...(creditId ? { creditId } : {}) }),
  }),
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

export interface RadarMergedEntry {
  provider: string;
  modelId: string;
  displayName: string;
  familyId?: string | null;
  monthlyTokens: number;
  creditTokens: number;
  freeType: string;
  poolKey: string | null;
  tos: string;
  trainsOnPrompts?: boolean;
  enabled?: boolean;
  origin: "baseline" | "radar" | "local";
  disabledBy?: "radar";
  contextWindow?: number | null;
  capabilities?: {
    tools: boolean | null;
    vision: boolean | null;
    thinking: boolean | null;
  };
  metadataEvidenceUrls?: string[];
  budget?: { kind: string; tokensPerMonth?: number; poolId?: string };
  limits?: { rpm: number | null; rpd: number | null; tpm: number | null; tpd: number | null };
  setup?: { keyUrl: string | null; steps: Array<string | { en: string; zh?: string; pt?: string }> } | null;
}

export interface RadarMeta {
  version: string;
  generatedAt?: string | null;
  tier: string;
  fetchedAt: string;
}

export interface RadarReferralItem {
  provider: string;
  url: string;
  kind: "fixo" | "campanha";
  validUntil: string | null;
  requiredAction: string | null;
  isDefault: boolean;
}

export interface RadarOffer {
  id: string;
  provider: string;
  title: { en: string; zh?: string; pt?: string } | string;
  description: { en: string; zh?: string; pt?: string } | string;
  benefit: { kind: string; [k: string]: any };
  publicBenefit: { kind: string; [k: string]: any } | null;
  conditions: { en: string; zh?: string; pt?: string } | string;
  validUntil: string | null;
  url: string;
  partner?: boolean;
}

export interface RadarIntelData {
  feed: string;
  version: string;
  tier: string;
  methodology?: { kind: string; initialRating: number; kFactor: number };
  rankings: Array<{
    rank: number;
    provider: string;
    modelId: string;
    category: string;
    rating: number;
    matches: number;
    wins: number;
    losses: number;
    draws: number;
  }>;
  catalog?: {
    currentVersion: string;
    previousVersion?: string;
    currentGeneratedAt?: string;
    ageDays: number;
    freshness: string;
    providers: { current: number; added: number; removed: number };
    models: { current: number; added: number; removed: number };
    trend: string;
  };
}

export interface RadarLocalModelState {
  provider: string;
  modelId: string;
  displayName: string | null;
  enabled: boolean | null;
  tombstoned: boolean;
  updatedAt: string;
}

export const radarApi = {
  getSettings: async (): Promise<{
    optIn: boolean;
    hasSupporterKey: boolean;
    supporterKeyMasked: string | null;
    contributorClaimUrl?: string;
    supporterPlansUrl?: string;
  }> => {
    return api("/radar/settings");
  },
  saveSettings: async (settings: { optIn?: boolean; supporterKey?: string | null }): Promise<{
    optIn: boolean;
    hasSupporterKey: boolean;
    supporterKey: string | null;
  }> => {
    return api("/radar/settings", {
      method: "POST",
      body: JSON.stringify(settings),
    });
  },
  getCatalog: async (): Promise<{ entries: RadarMergedEntry[]; meta: RadarMeta | null }> => {
    return api("/radar/catalog");
  },
  sync: async (): Promise<{ status: string; version?: string; tier?: string }> => {
    return api("/radar/sync", { method: "POST" });
  },
  getReferrals: async (): Promise<{
    fixed: RadarReferralItem[];
    campaigns: RadarReferralItem[];
    tier: string | null;
  }> => {
    return api("/radar/referrals");
  },
  getLocalModelState: async (): Promise<{ states: RadarLocalModelState[] }> => {
    return api("/radar/local-model-state");
  },
  saveLocalModelOverride: async (patch: {
    provider: string;
    modelId: string;
    displayName?: string | null;
    enabled?: boolean | null;
  }): Promise<{ states: RadarLocalModelState[] }> => {
    return api("/radar/local-model-state", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  resetLocalModelOverride: async (provider: string, modelId: string): Promise<{ states: RadarLocalModelState[] }> => {
    return api(`/radar/local-model-state?provider=${encodeURIComponent(provider)}&modelId=${encodeURIComponent(modelId)}`, {
      method: "DELETE",
    });
  },
  setLocalModelTombstone: async (
    provider: string,
    modelId: string,
    tombstoned: boolean,
  ): Promise<{ states: RadarLocalModelState[] }> => {
    return api("/radar/local-model-state", {
      method: "PUT",
      body: JSON.stringify({ provider, modelId, tombstoned }),
    });
  },
  getOffers: async (): Promise<{ offers: RadarOffer[]; meta: any }> => {
    return api("/radar/offers");
  },
  syncOffers: async (): Promise<{ status: string; version?: string }> => {
    return api("/radar/offers/sync", { method: "POST" });
  },
  getIntel: async (): Promise<{ intel: RadarIntelData | null; meta: any }> => {
    return api("/radar/intel");
  },
  syncIntel: async (): Promise<{ status: string }> => {
    return api("/radar/intel/sync", { method: "POST" });
  },
  getRankings: async (): Promise<RadarModelRanking[]> => {
    const res = await api<{ rankings?: RadarModelRanking[] }>("/free-provider-rankings");
    return Array.isArray(res?.rankings) ? res.rankings : [];
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
    return await api<RuntimeSystemStats>("/runtime/stats");
  },
};

export type KnownBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN" | "DEGRADED";

export interface ProviderBreakerItem {
  provider: string;
  state: KnownBreakerState | string;
  failureCount: number;
  lastFailure: string | null;
  retryAfterMs: number;
}

export interface RuntimeConnectionItem {
  id: string;
  provider: string;
  name?: string;
  displayName?: string;
  email?: string;
  authType?: string;
  rateLimitedUntil?: string | null;
  testStatus?: string;
  lastError?: string;
  lastErrorType?: string;
  errorCode?: string | number;
  backoffLevel?: number;
}

export interface RuntimeHealthPayload {
  status: string;
  timestamp: string;
  providerBreakers: ProviderBreakerItem[];
  connections: RuntimeConnectionItem[];
  lockouts: Record<string, { reason?: string; until?: number | string | null; remainingMs?: number; model?: string; accountId?: string }>;
  quotaMonitor: {
    active: number;
    alerting: number;
    exhausted: number;
    errors: number;
    monitors: Array<{
      sessionId?: string;
      accountId?: string;
      provider?: string;
      window?: string;
      status?: "ok" | "alerting" | "exhausted" | "error" | string;
      remainingPercent?: number;
    }>;
  };
  sessions: {
    activeCount: number;
    stickyBoundCount: number;
    byApiKey: Record<string, number>;
    top: Array<{
      sessionId: string;
      requestCount: number;
      connectionId?: string | null;
      ageMs: number;
      idleMs: number;
      createdAt?: string;
      lastActiveAt?: string;
    }>;
  };
}

export interface ModelCooldownItem {
  provider: string;
  model: string;
  reason: string;
  remainingMs: number;
  unavailableSince: string;
}

export const monitoringHealthApi = {
  getHealth: async (): Promise<RuntimeHealthPayload> => {
    return await api<RuntimeHealthPayload>("/monitoring/health");
  },
  getModelCooldowns: async (): Promise<ModelCooldownItem[]> => {
    const res = await api<{ items?: ModelCooldownItem[] }>("/resilience/model-cooldowns");
    return Array.isArray(res?.items) ? res.items : [];
  },
  clearModelCooldown: async (provider: string, model: string): Promise<void> => {
    await api("/resilience/model-cooldowns", {
      method: "DELETE",
      body: JSON.stringify({ provider, model }),
    });
  },
  clearAllModelCooldowns: async (): Promise<void> => {
    await api("/resilience/model-cooldowns", {
      method: "DELETE",
      body: JSON.stringify({ all: true }),
    });
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
  get: async (): Promise<Record<string, unknown>> => api<Record<string, unknown>>("/resilience"),
  update: async (patch: Record<string, unknown>): Promise<Record<string, unknown>> =>
    api<Record<string, unknown>>("/resilience", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
  list: async (): Promise<ResilienceConnectionItem[]> => {
    const res = await api<{ connections?: ResilienceConnectionItem[] }>("/resilience/connections");
    return Array.isArray(res?.connections) ? res.connections : [];
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
    if (type === "mcp") {
      const res = await api<{ entries?: Array<Record<string, unknown>> }>("/mcp/audit?limit=100");
      return (Array.isArray(res?.entries) ? res.entries : []).map((item) => ({
        id: String(item.id ?? ""), timestamp: String(item.createdAt ?? ""), actor: String(item.apiKeyId ?? "system"),
        action: "mcp.invoke", resource: String(item.toolName ?? ""), clientIp: "—",
        status: item.success === true ? "allowed" : "denied", detail: String(item.errorCode ?? ""),
      }));
    }
    const res = await api<any>(`/compliance/audit-log?limit=100${type === "a2a" ? "&category=a2a" : ""}`);
    const entries = Array.isArray(res) ? res : Array.isArray(res?.logs) ? res.logs : Array.isArray(res?.items) ? res.items : [];
    return entries.map((item: Record<string, unknown>, index: number) => ({
      id: String(item.id ?? index), timestamp: String(item.timestamp ?? item.createdAt ?? ""),
      actor: String(item.actor ?? item.actorId ?? "system"), action: String(item.action ?? item.event ?? "audit"),
      resource: String(item.resource ?? item.resourceType ?? ""), clientIp: String(item.ipAddress ?? "—"),
      status: item.status === "denied" || item.status === "flagged" ? item.status : "allowed",
      detail: typeof item.details === "string" ? item.details : JSON.stringify(item.details ?? item.metadata ?? ""),
    }));
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
    const [status, toolCatalog] = await Promise.all([
      api<Record<string, unknown>>("/mcp/status"),
      api<{ tools?: Array<{ name: string; description: string }> }>("/mcp/tools"),
    ]);
    const tools = Array.isArray(toolCatalog.tools) ? toolCatalog.tools : [];
    return [{
      id: "local-mcp", name: "Orbit MCP", transport: String(status.transport ?? "stdio") as McpServerItem["transport"],
      commandOrUrl: String(status.heartbeatPath ?? "in-process"), toolsCount: tools.length, promptsCount: 0, resourcesCount: 0,
      status: status.online === true ? "connected" : "disconnected", pingMs: 0, tools,
    }];
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
    const res = await api<{ tasks?: Array<Record<string, unknown>> }>("/a2a/tasks?limit=100");
    return (Array.isArray(res?.tasks) ? res.tasks : []).map((task) => {
      const input = (task.input ?? {}) as Record<string, unknown>;
      const messages = Array.isArray(input.messages) ? input.messages : [];
      return {
        id: String(task.id ?? ""), initiatorAgent: "local", targetAgent: String(input.skill ?? task.skill ?? ""),
        protocol: "a2a-v1", messagesCount: messages.length, status: (task.state === "working" ? "active" : task.state === "completed" ? "completed" : "terminated") as A2aSessionItem["status"],
        lastActive: String(task.updatedAt ?? task.createdAt ?? ""), topic: String(input.skill ?? task.skill ?? "A2A task"),
      };
    });
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
    const res = await api<{ data?: Array<Record<string, unknown>>; stats?: { byType?: Record<string, number> } }>("/memory?limit=100");
    const items = Array.isArray(res?.data) ? res.data : [];
    const byNamespace = new Map<string, MemoryBankItem>();
    for (const item of items) {
      const namespace = String(item.sessionId ?? item.apiKeyId ?? "default");
      const existing = byNamespace.get(namespace);
      if (existing) { existing.totalEntries += 1; continue; }
      byNamespace.set(namespace, {
        id: namespace, namespace, totalEntries: 1, vectorIndexSizeKb: 0,
        lastRecalledAt: String(item.updatedAt ?? item.createdAt ?? "—"), description: "本地 SQLite memory namespace",
      });
    }
    return [...byNamespace.values()];
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
    const res = await api<{ skills?: AgentSkillItem[] }>("/agent-skills");
    return Array.isArray(res?.skills) ? res.skills : [];
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
    return await api<ChaosConfig>("/chaos/config");
  },
  updateConfig: async (config: Partial<ChaosConfig>): Promise<{ success: boolean }> => {
    return await api("/chaos/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
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

export interface PluginConfigField {
  type: "string" | "number" | "boolean" | "select";
  default?: unknown;
  min?: number;
  max?: number;
  enum?: string[];
  description?: string;
}

export interface PluginConfigResponse {
  config: Record<string, unknown>;
  configSchema: Record<string, PluginConfigField>;
}

export const pluginsApi = {
  list: async (): Promise<PluginItem[]> => {
    const res = await api<{ plugins?: PluginItem[] }>("/plugins");
    return Array.isArray(res?.plugins) ? res.plugins : [];
  },
  getConfig: async (name: string): Promise<PluginConfigResponse> => api(`/plugins/${encodeURIComponent(name)}/config`),
  updateConfig: async (name: string, config: Record<string, unknown>): Promise<PluginConfigResponse & { success: boolean }> =>
    api(`/plugins/${encodeURIComponent(name)}/config`, {
      method: "PUT",
      body: JSON.stringify({ config }),
    }),
  activate: async (name: string): Promise<{ success: boolean }> => api(`/plugins/${encodeURIComponent(name)}/activate`, { method: "POST" }),
  deactivate: async (name: string): Promise<{ success: boolean }> => api(`/plugins/${encodeURIComponent(name)}/deactivate`, { method: "POST" }),
};

/* ---------------- Other Features APIs (Batch, Tokens, Media, Profile, Leaderboard) ---------------- */

export interface BatchTaskItem {
  id: string;
  name: string;
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  targetModel: string;
  status: "validating" | "in_progress" | "finalizing" | "completed" | "failed" | "cancelled";
  inputFileId: string;
  outputFileId?: string | null;
  errorFileId?: string | null;
  createdAt: string;
  completedAt?: string | null;
  discountPct?: number;
}

export interface BatchFileItem {
  id: string;
  filename: string;
  bytes: number;
  lineCount?: number;
  purpose: string;
  status?: "uploaded" | "processed" | "error";
  createdAt: string;
}

export const batchApi = {
  list: async (): Promise<BatchTaskItem[]> => {
    const res = await api<{ data?: Array<Record<string, unknown>> }>("/v1/batches?limit=100");
    return (Array.isArray(res?.data) ? res.data : []).map((item) => {
      const counts = (item.request_counts ?? {}) as Record<string, unknown>;
      const metadata = (item.metadata ?? {}) as Record<string, unknown>;
      return {
        id: String(item.id ?? ""),
        name: String(metadata.name ?? item.id ?? "Batch"),
        totalRequests: Number(counts.total ?? 0),
        completedRequests: Number(counts.completed ?? 0),
        failedRequests: Number(counts.failed ?? 0),
        targetModel: String(item.model ?? item.endpoint ?? ""),
        status: String(item.status ?? "validating") as BatchTaskItem["status"],
        inputFileId: String(item.input_file_id ?? ""),
        outputFileId: item.output_file_id ? String(item.output_file_id) : null,
        errorFileId: item.error_file_id ? String(item.error_file_id) : null,
        createdAt: new Date(Number(item.created_at ?? 0) * 1000).toISOString(),
        completedAt: item.completed_at ? new Date(Number(item.completed_at) * 1000).toISOString() : null,
      };
    });
  },
  create: async (data: { name?: string; targetModel: string; inputFileId: string }): Promise<BatchTaskItem> => {
    const item = await api<Record<string, unknown>>("/v1/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input_file_id: data.inputFileId,
        endpoint: "/v1/chat/completions",
        completion_window: "24h",
        metadata: { ...(data.name ? { name: data.name } : {}), model: data.targetModel },
      }),
    });
    const counts = (item.request_counts ?? {}) as Record<string, unknown>;
    return {
      id: String(item.id ?? ""),
      name: String(data.name ?? item.id ?? "Batch"),
      totalRequests: Number(counts.total ?? 0),
      completedRequests: Number(counts.completed ?? 0),
      failedRequests: Number(counts.failed ?? 0),
      targetModel: data.targetModel,
      status: String(item.status ?? "validating") as BatchTaskItem["status"],
      inputFileId: String(item.input_file_id ?? data.inputFileId),
      outputFileId: item.output_file_id ? String(item.output_file_id) : null,
      errorFileId: item.error_file_id ? String(item.error_file_id) : null,
      createdAt: new Date(Number(item.created_at ?? 0) * 1000).toISOString(),
    };
  },
  cancel: async (id: string): Promise<BatchTaskItem> => {
    const item = await api<Record<string, unknown>>(`/v1/batches/${encodeURIComponent(id)}/cancel`, { method: "POST" });
    return {
      id: String(item.id ?? id),
      name: String(((item.metadata ?? {}) as Record<string, unknown>).name ?? item.id ?? id),
      totalRequests: Number(((item.request_counts ?? {}) as Record<string, unknown>).total ?? 0),
      completedRequests: Number(((item.request_counts ?? {}) as Record<string, unknown>).completed ?? 0),
      failedRequests: Number(((item.request_counts ?? {}) as Record<string, unknown>).failed ?? 0),
      targetModel: String(item.model ?? item.endpoint ?? ""),
      status: String(item.status ?? "cancelling") as BatchTaskItem["status"],
      inputFileId: String(item.input_file_id ?? ""),
      outputFileId: item.output_file_id ? String(item.output_file_id) : null,
      errorFileId: item.error_file_id ? String(item.error_file_id) : null,
      createdAt: new Date(Number(item.created_at ?? 0) * 1000).toISOString(),
    };
  },
  listFiles: async (): Promise<BatchFileItem[]> => {
    const res = await api<{ data?: Array<Record<string, unknown>> }>("/v1/files?limit=100");
    return (Array.isArray(res?.data) ? res.data : []).map((item) => ({
      id: String(item.id ?? ""),
      filename: String(item.filename ?? item.id ?? "file"),
      bytes: Number(item.bytes ?? 0),
      purpose: String(item.purpose ?? "batch"),
      status: "uploaded" as const,
      createdAt: new Date(Number(item.created_at ?? 0) * 1000).toISOString(),
    }));
  },
  uploadFile: async (data: { file: File; purpose?: string }): Promise<BatchFileItem> => {
    const body = new FormData();
    body.append("file", data.file);
    body.append("purpose", data.purpose ?? "batch");
    const item = await api<Record<string, unknown>>("/v1/files", { method: "POST", body });
    return {
      id: String(item.id ?? ""), filename: String(item.filename ?? data.file.name), bytes: Number(item.bytes ?? data.file.size),
      purpose: String(item.purpose ?? data.purpose ?? "batch"), status: "uploaded", createdAt: new Date(Number(item.created_at ?? 0) * 1000).toISOString(),
    };
  },
  deleteFile: async (id: string): Promise<{ success: boolean }> => {
    await api(`/v1/files/${encodeURIComponent(id)}`, { method: "DELETE" });
    return { success: true };
  },
};

export interface LeaderboardEntry {
  apiKeyId: string;
  name?: string | null;
  score: number;
}

export interface UserLevelInfo {
  apiKeyId: string;
  totalXp: number;
  currentLevel: number;
  updatedAt: string;
}

export interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

export interface UserBadgeItem {
  apiKeyId: string;
  badgeId: string;
  unlockedAt: string;
}

export interface TokenLedgerEntry {
  id: number;
  fromApiKeyId: string;
  toApiKeyId: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface InviteItem {
  id: string;
  code: string;
  serverUrl: string | null;
  maxUses: number;
  useCount: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface ServerConnection {
  id: string;
  name: string;
  url: string;
  status: string;
  lastSyncAt: string | null;
  errorMessage: string | null;
}

export const gamificationApi = {
  getLeaderboard: async (scope: string = "global", limit: number = 50): Promise<{ scope: string; entries: LeaderboardEntry[]; myRank?: number }> => {
    return api(`/gamification/leaderboard?scope=${encodeURIComponent(scope)}&limit=${limit}`);
  },
  getLevel: async (): Promise<{ level: UserLevelInfo; streak?: { current: number; longest: number } }> => {
    return api("/gamification/level");
  },
  getBadges: async (): Promise<{ badges: BadgeItem[] }> => {
    return api("/gamification/badges");
  },
  getEarnedBadges: async (): Promise<{ badges: UserBadgeItem[] }> => {
    return api("/gamification/badges/earned");
  },
  getTransferLedger: async (): Promise<{ balance: number; history: TokenLedgerEntry[] }> => {
    return api("/gamification/transfer");
  },
  transferTokens: async (data: { toApiKeyId: string; amount: number; reason?: string }): Promise<{ success: boolean; idempotencyKey: string }> => {
    return api("/gamification/transfer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  },
  getInvites: async (): Promise<{ invites: InviteItem[] }> => {
    return api("/gamification/invite");
  },
  createInvite: async (data: { maxUses?: number }): Promise<InviteItem> => {
    return api("/gamification/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  },
  revokeInvite: async (id: string): Promise<{ success: boolean }> => {
    return api(`/gamification/invite?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  redeemInvite: async (code: string): Promise<{ success: boolean; serverUrl?: string }> => {
    return api("/gamification/invite/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
  },
  getServers: async (): Promise<{ servers: ServerConnection[] }> => {
    return api("/gamification/servers");
  },
  connectServer: async (data: { name: string; url: string; apiKey?: string }): Promise<ServerConnection> => {
    return api("/gamification/servers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  },
  getAnomalies: async (): Promise<{ anomalies: Array<{ apiKeyId: string; xpLastHour: number; zScore: number }> }> => {
    return api("/gamification/anomalies");
  },
};

export interface RelayTokenItem {
  id: string;
  name: string;
  tokenPrefix: string;
  description?: string;
  maxRequestsPerMinute: number;
  maxRequestsPerDay: number;
  enabled: boolean;
  createdAt: number;
  lastUsedAt?: number | null;
}

export const relayApi = {
  list: async (): Promise<RelayTokenItem[]> => {
    const value = await api<unknown>("/relay/tokens");
    return Array.isArray(value) ? value as RelayTokenItem[] : [];
  },
  create: (data: { name: string; description?: string; maxRequestsPerMinute: number; maxRequestsPerDay: number }) =>
    api<RelayTokenItem & { rawToken: string }>("/relay/tokens", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, patch: { enabled?: boolean }) =>
    api<RelayTokenItem>(`/relay/tokens/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }),
  remove: (id: string) => api<{ success: boolean }>(`/relay/tokens/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const mediaApi = {
  getStats: async (): Promise<{ totalBytes: number; totalFiles: number; byModality: Record<string, { files: number; bytes: number }> }> => {
    return api("/media/cache/stats");
  },
  purgeCache: async (modality: string = "all"): Promise<{ success: boolean; freedBytes: number }> => {
    return api("/media/cache/purge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modality }) });
  },
};
