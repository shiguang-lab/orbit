/**
 * 引擎桥：把 vendor/orbit 的纯 TS 业务模块适配成 BFF 各路由需要的接口。
 *
 * 引擎 shim 方案（仅同机部署）：
 *  - tsconfig paths 把 `@/*` → Orbit/src/*、`@omniroute/open-sse/*` → Orbit/open-sse/*
 *  - tsx 用该 tsconfig 运行，引擎内部的 `@/` 别名随之全部解析(零改动复用引擎)
 *  - BFF 自身的模块一律用相对导入，避免与 `@/` 冲突
 *
 * 注意：本地 Web+BFF 开发若配置 OMNIROUTE_NAS_API_TARGET，不会加载此模块，
 * 业务请求统一由 nasProxy 转发到 NAS；只有 BFF 与 Orbit 同机时才加载此桥。
 */
import type { EngineAuthAdapter } from "../middleware/authz.js";
import type { AuthEngine } from "../routes/auth.js";
import type { ProviderCatalogResponse, ProviderEngine, ProviderRow } from "../routes/providers.js";
import type { ProviderNodeEngine } from "../routes/provider-nodes.js";
import type { SettingsEngine } from "../routes/settings.js";
import type { KeyEngine, ApiKeyView } from "../routes/keys.js";
import type { HomeEngine } from "../routes/home.js";
import type { ComboEngine } from "../routes/combos.js";
import bundledCatalog from "./static-catalog.json" with { type: "json" };
import bundledModels from "./static-models.json" with { type: "json" };

/**
 * Build the provider catalog from Orbit's static registry without opening the
 * Orbit database. This is also used when the local BFF proxies connections to
 * a NAS instance whose older API does not expose /api/providers/catalog.
 */
export async function getStaticProviderCatalog(): Promise<ProviderCatalogResponse> {
  return bundledCatalog as ProviderCatalogResponse;
}

/**
 * Read the official provider model registry without touching Orbit's database.
 * The provider detail page merges this stable catalog with NAS-synced models,
 * matching Orbit's own dashboard behavior.
 */
export async function getStaticProviderModels(providerId: string): Promise<Array<Record<string, unknown>>> {
  const models = (bundledModels as Record<string, unknown>)[providerId];
  return Array.isArray(models) ? models.map((model) => ({ ...(model as Record<string, unknown>) })) : [];
}

/**
 * 真实引擎适配器：通过 tsconfig paths 的 @/* 指向 Orbit 源码。
 * 若 Orbit 源码不可解析(骨架阶段未接线)，返回 null，BFF 以降级模式运行。
 */
export async function createEngineAdapters(): Promise<{
  auth: AuthEngine;
  providers: ProviderEngine;
  providerNodes: ProviderNodeEngine;
  settings: SettingsEngine;
  keys: KeyEngine;
  home: HomeEngine;
  combos: ComboEngine;
} | null> {
  try {
    const apiAuth = await import("@/shared/utils/apiAuth");
    const providers = await import("@/lib/db/providers");
    const localDb = await import("@/lib/localDb");
    const managementPassword = await import("@/lib/auth/managementPassword");
    const apiKeys = await import("@/lib/db/apiKeys");
    const machineId = await import("@/shared/utils/machineId");
    const apiKeyExposure = await import("@/lib/apiKeyExposure");
    const providerRequestDefaults = await import("@/lib/providers/requestDefaults");
    const providerCatalog = await import("@/lib/providers/catalog");
    const providerExpiration = await import("@/domain/providerExpiration");
    const openRouterProviderStats = await import("@/lib/catalog/openrouterProviderStats");
    const providerModels = await import("@/lib/db/models");
    const staticProviderModels = await import("@/lib/providers/staticModels");
    const paramFilters = await import("@/lib/db/paramFilters");
    const interceptionRules = await import("@/lib/db/interceptionRules");
    const providerTest = await import("@/app/api/providers/[id]/test/route");
    const providerModelsRoute = await import("@/app/api/providers/[id]/models/route");
    const modelsRoute = await import("@/app/api/models/route");
    const callLogs = await import("@/lib/usage/callLogs");
    const callLogStats = await import("@/lib/db/callLogStats");
    const providerConstants = await import("@/shared/constants/providers");
    const featureFlags = await import("@/shared/utils/featureFlags");
    const combos = await import("@/lib/db/combos");
    const comboContext = await import("@/lib/combos/comboContext");
    const builderOptions = await import("@/lib/combos/builderOptions");
    const comboMetrics = (await import(("@omniroute/open-sse/services/comboMetrics.ts" + "") as string)) as Record<string, any>;
    const comboTestRoute = await import("@/app/api/combos/test/route");
    const comboDuplicateRoute = await import("@/app/api/combos/duplicate/route");
    const comboAutoRoute = await import("@/app/api/combos/auto/route");
    const comboRoute = await import("@/app/api/combos/route");
    const comboIdRoute = await import("@/app/api/combos/[id]/route");
    const reorderRoute = await import("@/app/api/combos/reorder/route");
    const comboDefaultsRoute = await import("@/app/api/settings/combo-defaults/route");
    const compressionSettings = await import("@/lib/db/compression");

    return {
      auth: {
        verifyPassword: async (password: string) => {
          const settings = await localDb.getSettings();
          const stored = await managementPassword.getStoredManagementPassword(settings);
          if (!stored) return { ok: false, needsSetup: true };
          const ok = await managementPassword.verifyManagementPassword(password, stored);
          return { ok };
        },
        isLoginLocked: async () => ({ allowed: true }),
        isOidcActive: async () => {
          const settings = await localDb.getSettings();
          return settings.oidcEnabled === true;
        },
        getRequireLogin: async () => {
          const settings = await localDb.getSettings();
          return {
            authenticated: false,
            requireLogin: settings.requireLogin === true,
            hasPassword: typeof settings.password === "string" && settings.password.length > 0,
            setupComplete: settings.setupComplete === true,
            oidcEnabled: settings.oidcEnabled === true,
            oidcDisablePasswordLogin: settings.oidcDisablePasswordLogin === true,
          };
        },
      },
      providers: {
        listProviders: async (
          filter: { provider?: string },
          limit?: number,
          offset?: number,
        ) => (await providers.getProviderConnections(filter, limit, offset)) as ProviderRow[],
        countProviders: (filter: { provider?: string }) =>
          providers.getProviderConnectionsCount(filter) as number,
        getProviderById: (id: string) =>
          providers.getProviderConnectionById(id) as Promise<ProviderRow | null>,
        createProvider: (data: Record<string, unknown>) =>
          providers.createProviderConnection(data) as Promise<ProviderRow>,
        updateProvider: (id: string, data: Record<string, unknown>) =>
          providers.updateProviderConnection(id, data) as Promise<ProviderRow>,
        deleteProvider: (id: string) =>
          providers.deleteProviderConnection(id) as Promise<boolean>,
        deleteProviders: (ids: string[]) =>
          providers.deleteProviderConnections(ids) as Promise<number>,
        isApiKeyRevealEnabled: () => apiAuth.isApiKeyRevealEnabled?.(),
        maskStoredApiKey: (k: string) => apiKeyExposure.maskStoredApiKey(k) as string,
        sanitizeProviderSpecificData: (d: unknown) =>
          providerRequestDefaults.sanitizeProviderSpecificDataForResponse(d) as unknown,
        getCatalog: getStaticProviderCatalog,
        getExpirations: async () => ({
          summary: providerExpiration.getExpirationSummary(),
          list: providerExpiration.getAllExpirations(),
        }),
        getOpenRouterStats: async (refresh = false) => {
          if (refresh) {
            const result = await openRouterProviderStats.refreshOpenRouterProviderStats();
            return {
              data: result.data,
              meta: {
                source: result.ok ? "fresh" : "error",
                count: result.data.length,
                error: result.error,
              },
            };
          }
          const result = await openRouterProviderStats.getOpenRouterProviderStats();
          return {
            data: result.data,
            meta: {
              source: result.fromCache ? (result.stale ? "stale-cache" : "cache") : "fresh",
              cachedAt: result.cachedAt ?? undefined,
              stale: result.stale,
              count: result.data.length,
            },
          };
        },
        testConnection: (id: string) => providerTest.testSingleConnection(id),
        getProviderFamilyIds: (providerId: string) => providerConstants.getProviderConnectionFamilyIds(providerId),
        getProviderCategory: (providerId: string) => {
          if (providerConstants.IDE_PROVIDER_IDS.has(providerId)) return "ide";
          for (const category of providerCatalog.STATIC_PROVIDER_CATALOG_RESOLUTION_ORDER as string[]) {
            const group = (providerCatalog.STATIC_PROVIDER_CATALOG_GROUPS as Record<string, { providers: Record<string, unknown> }>)[category];
            if (group?.providers && Object.prototype.hasOwnProperty.call(group.providers, providerId)) return category;
          }
          return undefined;
        },
        getProviderModels: async (connectionId: string) => {
          const connection = await providers.getProviderConnectionById(connectionId) as ProviderRow | null;
          const providerId = connection?.provider;
          if (!providerId) return { models: [], customModels: [] };
          try {
            const response = await providerModelsRoute.GET(
              new Request(`http://bff/api/providers/${encodeURIComponent(connectionId)}/models`),
              { params: { id: connectionId } },
            );
            const payload = await response.json() as { models?: unknown; customModels?: unknown };
            return { models: Array.isArray(payload.models) ? payload.models : [], customModels: Array.isArray(payload.customModels) ? payload.customModels : [] };
          } catch {
            const [models, customModels] = await Promise.all([
              providerModels.getSyncedAvailableModels(providerId),
              providerModels.getCustomModels(providerId),
            ]);
            return { models: Array.isArray(models) ? models : [], customModels: Array.isArray(customModels) ? customModels : [] };
          }
        },
        getModelsForProvider: async (providerId: string) => {
          // The original route is authenticated independently of the BFF hook;
          // use its DB projections plus the same static registry used by Orbit
          // so a provider with no connection still has its official catalog.
          const [synced, customModels] = await Promise.all([
            providerModels.getSyncedAvailableModels(providerId),
            providerModels.getCustomModels(providerId),
          ]);
          const staticModels = staticProviderModels.getStaticModelsForProvider(providerId) ?? [];
          const models = (Array.isArray(synced) && synced.length > 0 ? synced : staticModels) as unknown[];
          return { models, customModels: Array.isArray(customModels) ? customModels : [], source: Array.isArray(synced) && synced.length > 0 ? "synced" : "catalog" };
        },
        addProviderModel: async (connectionId: string, modelId: string, modelName?: string) => {
          const connection = await providers.getProviderConnectionById(connectionId) as ProviderRow | null;
          if (!connection?.provider) throw new Error("Provider connection not found");
          return providerModels.addCustomModel(connection.provider, modelId, modelName);
        },
        removeProviderModel: async (connectionId: string, modelId: string) => {
          const connection = await providers.getProviderConnectionById(connectionId) as ProviderRow | null;
          if (!connection?.provider) throw new Error("Provider connection not found");
          return providerModels.removeCustomModel(connection.provider, modelId);
        },
        getParamFilters: (providerId: string) => paramFilters.getParamFilterConfig(providerId) ?? { block: [], allow: [], autoLearn: false },
        setParamFilters: (providerId: string, config: Record<string, unknown>) => paramFilters.setParamFilterConfig(providerId, config),
        deleteParamFilters: (providerId: string) => paramFilters.deleteParamFilterConfig(providerId),
        getInterceptionRules: (providerId: string) => interceptionRules.getInterceptionRules(providerId) ?? { interceptSearch: undefined, interceptFetch: undefined },
        setInterceptionRules: (providerId: string, config: Record<string, unknown>) => interceptionRules.setInterceptionRules(providerId, config),
        deleteInterceptionRules: (providerId: string) => interceptionRules.deleteInterceptionRules(providerId),
        webFetch: async (body: Record<string, unknown>) => {
          const webFetchRoute = await import("@/app/api/v1/web/fetch/route");
          const response = await webFetchRoute.POST(new Request("http://bff/api/v1/web/fetch", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }));
          let payload: unknown = null;
          try { payload = await response.json(); } catch { payload = { error: "Invalid web fetch response" }; }
          return { status: response.status, payload };
        },
      },
      providerNodes: {
        listProviderNodes: async (limit?: number, offset?: number) =>
          (await providers.getProviderNodes({}, limit, offset)) as Record<string, unknown>[],
        countProviderNodes: () => providers.getProviderNodesCount() as number,
        isCcCompatibleProviderEnabled: () => featureFlags.isCcCompatibleProviderEnabled(),
      },
      settings: {
        getSettings: () => localDb.getSettings(),
        getComboDefaults: async () => {
          try {
            const response = await comboDefaultsRoute.GET(new Request("http://bff/api/settings/combo-defaults"));
            return (await response.json()) as Record<string, unknown>;
          } catch {
            return {};
          }
        },
        getCompressionSettings: async () => {
          try {
            return (await compressionSettings.getCompressionSettings()) as Record<string, unknown>;
          } catch {
            return { enabled: false };
          }
        },
      },
      keys: {
        getApiKeys: (limit?: number, offset?: number) =>
          apiKeys.getApiKeys(limit, offset) as Promise<ApiKeyView[]>,
        getApiKeysCount: () => apiKeys.getApiKeysCount() as number,
        getApiKeyById: (id: string) => apiKeys.getApiKeyById(id) as Promise<ApiKeyView | null>,
        createApiKey: (
          name: string,
          mId: string,
          scopes?: string[],
          options?: { allowedConnections?: string[] },
        ) => apiKeys.createApiKey(name, mId, scopes, options) as Promise<{ key: string; id: string }>,
        regenerateApiKey: (id: string) =>
          apiKeys.regenerateApiKey(id) as Promise<{ id: string; key: string } | null>,
        updateApiKeyPermissions: (id: string, update: Record<string, unknown>) =>
          apiKeys.updateApiKeyPermissions(id, update),
        deleteApiKey: (id: string) => apiKeys.deleteApiKey(id) as Promise<boolean>,
        isApiKeyRevealEnabled: () => apiKeyExposure.isApiKeyRevealEnabled() as boolean,
        maskStoredApiKey: (k: string) => apiKeyExposure.maskStoredApiKey(k) as string,
        getConsistentMachineId: (salt?: string) => machineId.getConsistentMachineId(salt) as Promise<string>,
      },
      home: {
        getModels: async () => {
          try {
            const response = await modelsRoute.GET(new Request("http://bff/api/models?all=true"));
            return await response.json();
          } catch {
            return { models: [] };
          }
        },
        getProviderMetrics: async () => {
          const rows = callLogStats.getProviderMetrics();
          const metrics: Record<string, Record<string, unknown>> = {};
          let lastProvider = "";
          let lastProviderAt = 0;
          let errorProvider = "";
          let errorProviderAt = 0;
          for (const row of rows as Array<Record<string, unknown>>) {
            const provider = typeof row.provider === "string" && row.provider.trim() ? row.provider : "unknown";
            const totalRequests = Number(row.totalRequests ?? 0);
            const totalSuccesses = Number(row.totalSuccesses ?? 0);
            const lastRequestAt = typeof row.lastRequestAt === "string" ? row.lastRequestAt : null;
            const lastErrorAt = typeof row.lastErrorAt === "string" ? row.lastErrorAt : null;
            const lastStatus = row.lastStatus == null ? null : Number(row.lastStatus);
            metrics[provider] = {
              totalRequests,
              totalSuccesses,
              successRate: totalRequests > 0 ? Math.round((totalSuccesses / totalRequests) * 100) : 0,
              avgLatencyMs: Number(row.avgLatencyMs ?? 0), lastRequestAt, lastErrorAt, lastStatus,
              lastErrorStatus: row.lastErrorStatus == null ? null : Number(row.lastErrorStatus),
            };
            const requestAt = lastRequestAt ? Date.parse(lastRequestAt) : 0;
            if (requestAt > lastProviderAt) { lastProvider = provider; lastProviderAt = requestAt; }
            const errorAt = lastStatus !== null && (lastStatus < 200 || lastStatus >= 400) && lastErrorAt ? Date.parse(lastErrorAt) : 0;
            if (errorAt > errorProviderAt) { errorProvider = provider; errorProviderAt = errorAt; }
          }
          return { metrics, topology: { providers: Object.keys(metrics), lastProvider, errorProvider } };
        },
        getRecentCallLogs: async ({ limit, excludeTests }) => {
          const rows = await callLogs.getCallLogs({ limit, excludeTests });
          return Array.isArray(rows) ? rows : [];
        },
        getVersion: async () => {
          const version = process.env.npm_package_version ?? "unknown";
          return { version, current: version, latest: version, updateAvailable: false, autoUpdateSupported: false };
        },
      },
      combos: {
        getCombos: async (limit?: number, offset?: number) => {
          const rawCombos = (await combos.getCombos(limit, offset)) as Array<Record<string, unknown>>;
          return rawCombos.map((combo) => ({
            ...combo,
            computed_context_length: comboContext.computeComboContextLength?.(combo, rawCombos),
          }));
        },
        getCombosCount: () => combos.getCombosCount() as number,
        getComboById: (id: string) => combos.getComboById(id) as Promise<Record<string, unknown> | null>,
        getComboByName: (name: string) => combos.getComboByName(name) as Promise<Record<string, unknown> | null>,
        createCombo: async (data: Record<string, unknown>) => {
          const response = await comboRoute.POST(
            new Request("http://bff/api/combos", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(data),
            }),
          );
          const payload = (await response.json()) as Record<string, unknown>;
          if (!response.ok) {
            const err = payload?.error as { message?: string } | string | undefined;
            const errMsg = typeof err === "object" ? err?.message : err;
            throw new Error(errMsg || `Failed to create combo (${response.status})`);
          }
          return payload;
        },
        updateCombo: async (id: string, data: Record<string, unknown>) => {
          const response = await comboIdRoute.PUT(
            new Request(`http://bff/api/combos/${encodeURIComponent(id)}`, {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(data),
            }),
            { params: Promise.resolve({ id }) },
          );
          const payload = (await response.json()) as Record<string, unknown>;
          if (!response.ok) {
            const err = payload?.error as { message?: string } | string | undefined;
            const errMsg = typeof err === "object" ? err?.message : err;
            throw new Error(errMsg || `Failed to update combo (${response.status})`);
          }
          return payload;
        },
        deleteCombo: async (id: string) => {
          const response = await comboIdRoute.DELETE(
            new Request(`http://bff/api/combos/${encodeURIComponent(id)}`, { method: "DELETE" }),
            { params: Promise.resolve({ id }) },
          );
          return response.ok;
        },
        reorderCombos: async (comboIds: string[]) => {
          const response = await reorderRoute.POST(
            new Request("http://bff/api/combos/reorder", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ comboIds }),
            }),
          );
          const payload = (await response.json()) as { combos?: Array<Record<string, unknown>> };
          if (!response.ok) {
            throw new Error("Failed to reorder combos");
          }
          return payload?.combos ?? [];
        },
        getBuilderOptions: async () => {
          const options = await builderOptions.getComboBuilderOptions();
          return (options ?? { providers: [], comboRefs: [] }) as Record<string, unknown>;
        },
        getComboMetrics: (comboName?: string) => {
          if (comboName) return comboMetrics.getComboMetrics(comboName);
          return comboMetrics.getAllComboMetrics();
        },
        resetComboMetrics: (comboName?: string) => {
          if (comboName) comboMetrics.resetComboMetrics(comboName);
          else comboMetrics.resetAllComboMetrics();
        },
        testCombo: async (comboName: string) => {
          try {
            const response = await comboTestRoute.POST(
              new Request("http://bff/api/combos/test", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ comboName }),
              }),
            );
            return (await response.json()) as Record<string, unknown>;
          } catch (err) {
            return { error: err instanceof Error ? err.message : "Failed to test combo" };
          }
        },
        duplicateAutoCombo: async (name: string, strategy?: string) => {
          const response = await comboDuplicateRoute.POST(
            new Request("http://bff/api/combos/duplicate", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ name, strategy }),
            }),
          );
          const payload = (await response.json()) as Record<string, unknown>;
          if (!response.ok) {
            const err = payload?.error as { message?: string } | string | undefined;
            const errMsg = typeof err === "object" ? err?.message : err;
            throw new Error(errMsg || `Failed to duplicate combo (${response.status})`);
          }
          return payload;
        },
        listAutoCombos: async () => {
          try {
            const response = await comboAutoRoute.GET(new Request("http://bff/api/combos/auto"));
            const payload = (await response.json()) as { combos?: Array<Record<string, unknown>> };
            return Array.isArray(payload?.combos) ? payload.combos : [];
          } catch {
            return [];
          }
        },
      },
    };
  } catch (err) {
    console.warn("[bff] engine adapters unavailable (skeleton mode):", (err as Error).message);
    return null;
  }
}
