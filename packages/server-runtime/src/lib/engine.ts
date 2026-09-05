/**
 * 引擎桥：把本地 vendored runtime 的纯 TS 业务模块适配成 Gateway 各路由需要的接口。
 *
 * 本地 runtime 方案：
 *  - tsconfig paths 把 `@/*` → packages/gateway-runtime/src/*、`@shiguang-gateway/open-sse/*` → packages/gateway-runtime/open-sse/*
 *  - tsx 用该 tsconfig 运行，引擎内部的 `@/` 别名随之全部解析(零改动复用引擎)
 *  - Gateway 自身的模块一律用相对导入，避免与 `@/` 冲突
 *
 * 业务请求必须由本地 runtime 处理，独立部署不包含远程代理。
 */
import type { EngineAuthAdapter } from "../middleware/authz.js";
import type { AuthEngine } from "../routes/auth.js";
import type { ProviderCatalogResponse, ProviderEngine, ProviderRow } from "../routes/providers.js";
import type { ProviderNodeEngine } from "../routes/provider-nodes.js";
import type { SettingsEngine } from "../routes/settings.js";
import type { KeyEngine, ApiKeyView } from "../routes/keys.js";
import type { HomeEngine } from "../routes/home.js";
import type { ComboEngine } from "../routes/combos.js";
import type { AnalyticsEngine } from "../routes/analytics.js";
import bundledCatalog from "./static-catalog.json" with { type: "json" };
import bundledModels from "./static-models.json" with { type: "json" };

/**
 * Build the provider catalog from the local static registry without opening the
 * runtime database. The catalog is bundled for deterministic startup and is
 * refreshed by the importer/worker from configured provider sources.
 */
export async function getStaticProviderCatalog(): Promise<ProviderCatalogResponse> {
  return bundledCatalog as ProviderCatalogResponse;
}

/**
 * Read the local provider model registry without touching the runtime database.
 * The provider detail page merges this stable catalog with locally synced models.
 */
export async function getStaticProviderModels(providerId: string): Promise<Array<Record<string, unknown>>> {
  const models = (bundledModels as Record<string, unknown>)[providerId];
  return Array.isArray(models) ? models.map((model) => ({ ...(model as Record<string, unknown>) })) : [];
}

/**
 * 真实引擎适配器：通过 tsconfig paths 的 @/* 指向本地 vendored runtime。
 * 引擎不可解析时必须让启动失败；不能返回 null 或以伪数据降级。
 */
export async function createEngineAdapters(): Promise<{
  auth: AuthEngine;
  providers: ProviderEngine;
  providerNodes: ProviderNodeEngine;
  settings: SettingsEngine;
  keys: KeyEngine;
  home: HomeEngine;
  combos: ComboEngine;
  analytics: AnalyticsEngine;
} | null> {
  try {
    const apiAuth = await import("@/shared/utils/apiAuth");
    const providers = await import("@/lib/db/providers");
    const localDb = await import("@/lib/localDb");
    const managementPassword = await import("@/lib/auth/managementPassword");
    const apiKeys = await import("@/lib/db/apiKeys");
    const deviceTracker = await import(("@shiguang-gateway/open-sse/services/deviceTracker.ts" + "") as string);
    const apiKeyUsageLimits = await import("@/lib/usage/apiKeyUsageLimits");
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
    const comboMetrics = (await import(("@shiguang-gateway/open-sse/services/comboMetrics.ts" + "") as string)) as Record<string, any>;
    const comboTestRoute = await import("@/app/api/combos/test/route");
    const comboDuplicateRoute = await import("@/app/api/combos/duplicate/route");
    const comboAutoRoute = await import("@/app/api/combos/auto/route");
    const comboRoute = await import("@/app/api/combos/route");
    const comboIdRoute = await import("@/app/api/combos/[id]/route");
    const reorderRoute = await import("@/app/api/combos/reorder/route");
    const comboDefaultsRoute = await import("@/app/api/settings/combo-defaults/route");
    const compressionSettings = await import("@/lib/db/compression");
    const databaseSettings = await import("@/lib/db/databaseSettings");
    const dbSettings = await import("@/lib/db/settings");
    const vacuumScheduler = await import("@/lib/db/vacuumScheduler");
    const dbCleanup = await import("@/lib/db/cleanup");
    const dataPaths = await import("@/lib/dataPaths");
    const dbBackup = (await import("@/lib/db/backup")) as any;
    const fs = await import("fs");
    const path = await import("path");
    const logEnv = await import("@/lib/logEnv");

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
              new Request(`http://gateway/api/providers/${encodeURIComponent(connectionId)}/models`),
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
          const [synced, customModels, compatOverrides] = await Promise.all([
            providerModels.getSyncedAvailableModels(providerId),
            providerModels.getCustomModels(providerId),
            providerModels.getModelCompatOverrides(providerId),
          ]);
          const staticModels = staticProviderModels.getStaticModelsForProvider(providerId) ?? [];
          const models = (Array.isArray(synced) && synced.length > 0 ? synced : staticModels) as unknown[];
          let modelContextOverrides: any = null;
          try {
            modelContextOverrides = await import("@/lib/db/modelContextOverrides");
          } catch {}
          const customWithContext = (Array.isArray(customModels) ? customModels : []).map((m: any) => {
            if (modelContextOverrides && m?.id) {
              const rec = modelContextOverrides.getModelContextOverrideRecord(providerId, m.id);
              if (rec) return { ...m, contextWindowOverride: rec.realContext, contextWindowOverrideSource: rec.source };
            }
            return m;
          });
          const hiddenModelsMap = providerModels.getHiddenModelsByProvider?.();
          const hiddenModelsByProvider: Record<string, string[]> = {};
          if (hiddenModelsMap) {
            for (const [pId, set] of hiddenModelsMap) {
              if (set && set.size > 0) hiddenModelsByProvider[pId] = [...set];
            }
          }
          return {
            models,
            customModels: customWithContext,
            modelCompatOverrides: compatOverrides || [],
            hiddenModelsByProvider,
            source: Array.isArray(synced) && synced.length > 0 ? "synced" : "catalog",
          };
        },
        addCustomModel: async (data: Record<string, unknown>) => {
          const provider = String(data.provider || "");
          const modelId = String(data.modelId || "");
          const modelName = typeof data.modelName === "string" ? data.modelName : undefined;
          const source = typeof data.source === "string" ? data.source : "manual";
          const apiFormat = typeof data.apiFormat === "string" ? data.apiFormat : "chat-completions";
          const supportedEndpoints = Array.isArray(data.supportedEndpoints) ? data.supportedEndpoints : ["chat"];
          const targetFormat = typeof data.targetFormat === "string" ? data.targetFormat : undefined;
          const supportsVision = typeof data.supportsVision === "boolean" ? data.supportsVision : undefined;
          const isFree = typeof data.isFree === "boolean" ? data.isFree : undefined;
          const generationConfig = data.generationConfig && typeof data.generationConfig === "object" ? data.generationConfig : undefined;
          const limits = (data.max_input_tokens != null || data.max_output_tokens != null) ? {
            ...(data.max_input_tokens != null ? { inputTokenLimit: Number(data.max_input_tokens) } : {}),
            ...(data.max_output_tokens != null ? { outputTokenLimit: Number(data.max_output_tokens) } : {}),
          } : undefined;
          const model = await providerModels.addCustomModel(
            provider, modelId, modelName, source, apiFormat, supportedEndpoints, targetFormat, limits, supportsVision, generationConfig, isFree
          );
          return { model };
        },
        updateCustomModel: async (data: Record<string, unknown>) => {
          const provider = String(data.provider || "");
          const modelId = String(data.modelId || "");
          const updates: Record<string, unknown> = {};
          for (const key of ["modelName", "apiFormat", "supportedEndpoints", "targetFormat", "supportsVision", "isFree", "generationConfig", "compatByProtocol"]) {
            if (key in data) updates[key] = data[key];
          }
          if ("normalizeToolCallId" in data || "preserveOpenAIDeveloperRole" in data || "upstreamHeaders" in data || "compatByProtocol" in data) {
            await providerModels.mergeModelCompatOverride(provider, modelId, {
              ...(typeof data.normalizeToolCallId === "boolean" ? { normalizeToolCallId: data.normalizeToolCallId } : {}),
              ...(typeof data.preserveOpenAIDeveloperRole === "boolean" ? { preserveOpenAIDeveloperRole: data.preserveOpenAIDeveloperRole } : {}),
              ...(data.upstreamHeaders && typeof data.upstreamHeaders === "object" ? { upstreamHeaders: data.upstreamHeaders as Record<string, string> } : {}),
              ...(data.compatByProtocol && typeof data.compatByProtocol === "object" ? { compatByProtocol: data.compatByProtocol as any } : {}),
            });
          }
          if ("contextWindowOverride" in data) {
            try {
              const modelContextOverrides = await import("@/lib/db/modelContextOverrides");
              if (data.contextWindowOverride === null) {
                modelContextOverrides.removeModelContextOverride(provider, modelId);
              } else if (typeof data.contextWindowOverride === "number") {
                modelContextOverrides.setModelContextOverride(provider, modelId, data.contextWindowOverride, "manual");
              }
            } catch {}
          }
          const model = await providerModels.updateCustomModel(provider, modelId, updates);
          return { model, success: true };
        },
        removeCustomModel: async (provider: string, modelId?: string, options?: { resetOverride?: boolean; clearAll?: boolean }) => {
          if (options?.clearAll) {
            await providerModels.replaceCustomModels(provider, []);
            await providerModels.deleteSyncedAvailableModelsForProvider(provider);
            return { success: true };
          }
          if (!modelId) return { success: false };
          if (options?.resetOverride) {
            await providerModels.removeModelCompatOverride(provider, modelId);
            try {
              const modelContextOverrides = await import("@/lib/db/modelContextOverrides");
              modelContextOverrides.removeModelContextOverride(provider, modelId);
            } catch {}
            return { success: true };
          }
          await providerModels.removeCustomModel(provider, modelId);
          try {
            const modelContextOverrides = await import("@/lib/db/modelContextOverrides");
            modelContextOverrides.removeModelContextOverride(provider, modelId);
          } catch {}
          return { success: true };
        },
        setModelVisibility: async (provider: string, modelIds: string[], isHidden: boolean) => {
          for (const modelId of modelIds) {
            await providerModels.setModelIsHidden(provider, modelId, isHidden);
          }
          return { ok: true, updated: modelIds.length };
        },
        getCcAlias: async (providerId: string) => {
          const ccDiscoveryAliases = await import("@/lib/db/ccDiscoveryAliases");
          const provider = ccDiscoveryAliases.getCcAliasProviderSetting(providerId);
          const { models: allModels } = ccDiscoveryAliases.getCcAliasSettingsBulk();
          const prefix = `${providerId}/`;
          const models: Record<string, "on" | "off"> = {};
          for (const [key, value] of allModels) {
            if (key.startsWith(prefix)) {
              models[key.slice(prefix.length)] = value;
            }
          }
          return { provider, models };
        },
        setCcAlias: async (providerId: string, data: { scope: "provider" | "model"; value: "on" | "off" | null; modelId?: string }) => {
          const ccDiscoveryAliases = await import("@/lib/db/ccDiscoveryAliases");
          if (data.scope === "provider") {
            ccDiscoveryAliases.setCcAliasProviderSetting(providerId, data.value);
          } else if (data.modelId) {
            ccDiscoveryAliases.setCcAliasModelSetting(providerId, data.modelId, data.value);
          }
          return { success: true };
        },
        getModelAliases: async () => {
          const modelsModule = await import("@/models");
          return modelsModule.getModelAliases();
        },
        setModelAlias: async (model: string, alias: string) => {
          const modelsModule = await import("@/models");
          await modelsModule.setModelAlias(model, alias);
          return true;
        },
        deleteModelAlias: async (alias: string) => {
          const modelsModule = await import("@/models");
          await modelsModule.deleteModelAlias(alias);
          return true;
        },
        testModel: async (data: { providerId: string; modelId: string; connectionId?: string }) => {
          const modelTestRunner = await import("@/lib/api/modelTestRunner");
          const result = await modelTestRunner.runSingleModelTest({
            providerId: data.providerId,
            modelId: data.modelId,
            ...(data.connectionId ? { connectionId: data.connectionId } : {}),
            timeoutMs: data.providerId.trim().toLowerCase() === "nvidia" ? 180_000 : modelTestRunner.DEFAULT_MODEL_TEST_TIMEOUT_MS,
            streamChat: true,
          });
          if (result.status === "ok") {
            return { status: "ok", latencyMs: result.latencyMs, responseText: result.responseText };
          }
          return { status: "error", latencyMs: result.latencyMs, error: result.error || "Model test failed" };
        },
        webSearch: async (body: Record<string, unknown>) => {
          const searchRoute = await import("@/app/api/v1/search/route");
          const response = await searchRoute.POST(new Request("http://gateway/api/v1/search", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }));
          let payload: unknown = null;
          try { payload = await response.json(); } catch { payload = { error: "Invalid search response" }; }
          return { status: response.status, payload };
        },
        embeddings: async (body: Record<string, unknown>) => {
          const embeddingsRoute = await import("@/app/api/v1/embeddings/route");
          const response = await embeddingsRoute.POST(new Request("http://gateway/api/v1/embeddings", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }));
          let payload: unknown = null;
          try { payload = await response.json(); } catch { payload = { error: "Invalid embeddings response" }; }
          return { status: response.status, payload };
        },
        imageGenerations: async (body: Record<string, unknown>) => {
          const imagesRoute = await import("@/app/api/v1/images/generations/route");
          const response = await imagesRoute.POST(new Request("http://gateway/api/v1/images/generations", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }));
          let payload: unknown = null;
          try { payload = await response.json(); } catch { payload = { error: "Invalid image generations response" }; }
          return { status: response.status, payload };
        },
        audioSpeech: async (body: Record<string, unknown>) => {
          const speechRoute = await import("@/app/api/v1/audio/speech/route");
          const response = await speechRoute.POST(new Request("http://gateway/api/v1/audio/speech", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }));
          let payload: unknown = null;
          try { payload = await response.json(); } catch { payload = { error: "Invalid audio speech response" }; }
          return { status: response.status, payload };
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
          const response = await webFetchRoute.POST(new Request("http://gateway/api/v1/web/fetch", {
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
        updateSettings: async (patch: Record<string, unknown>) => {
          return (await dbSettings.updateSettings(patch)) as Record<string, unknown>;
        },
        getCacheConfig: async () => ({
          modelCatalogCacheTtlMs: databaseSettings.getUserDatabaseSettings().cache.modelCatalogCacheTtlMs,
        }),
        updateCacheConfig: async (modelCatalogCacheTtlMs: number) => {
          const current = databaseSettings.getUserDatabaseSettings();
          const updated = databaseSettings.updateDatabaseSettings({
            cache: { ...current.cache, modelCatalogCacheTtlMs },
          });
          return { modelCatalogCacheTtlMs: updated.cache.modelCatalogCacheTtlMs };
        },
        getComboDefaults: async () => {
          try {
            const response = await comboDefaultsRoute.GET(new Request("http://gateway/api/settings/combo-defaults"));
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
        listDbBackups: async () => {
          try {
            return (await (localDb as any).listDbBackups()) as unknown[];
          } catch {
            return [];
          }
        },
        createDbBackup: async () => {
          return await (localDb as any).backupDbFile("manual");
        },
        restoreDbBackup: async (backupFile: string) => {
          return await (localDb as any).restoreDbBackup(backupFile);
        },
        cleanupDbBackups: async (keepLatest?: number, retentionDays?: number) => {
          return await (localDb as any).cleanupDbBackups(keepLatest, retentionDays);
        },
        getStorageHealth: async () => {
          const dataDir = dataPaths.resolveDataDir({});
          const dbFilePath = path.join(dataDir, "storage.sqlite");
          const backupsDir = path.join(dataDir, "db_backups");
          let sizeBytes = 0;
          try {
            if (fs.existsSync(dbFilePath)) {
              sizeBytes = fs.statSync(dbFilePath).size;
            }
          } catch {}
          let lastBackupAt: string | null = null;
          let backupCount = 0;
          try {
            if (fs.existsSync(backupsDir)) {
              const files = fs
                .readdirSync(backupsDir)
                .filter((f: string) => f.startsWith("db_") && f.endsWith(".sqlite"))
                .sort()
                .reverse();
              backupCount = files.length;
              if (files.length > 0) {
                lastBackupAt = fs.statSync(path.join(backupsDir, files[0])).mtime.toISOString();
              }
            }
          } catch {}
          const homeDir = process.env.HOME || process.env.USERPROFILE || "";
          const displayPath = dbFilePath.startsWith(homeDir) ? "~" + dbFilePath.slice(homeDir.length) : dbFilePath;
          return {
            driver: "sqlite",
            dbPath: displayPath,
            sizeBytes,
            backupCount,
            lastBackupAt,
            retentionDays: dbBackup.getDbBackupRetentionDays(),
            maxBackups: dbBackup.getDbBackupMaxFiles(),
          };
        },
        getDatabaseSettings: async () => {
          return databaseSettings.getDatabaseSettings() as Record<string, unknown>;
        },
        updateDatabaseSettings: async (patch: Record<string, unknown>) => {
          databaseSettings.updateDatabaseSettings(patch);
          return databaseSettings.getDatabaseSettings() as Record<string, unknown>;
        },
        vacuumDatabase: async () => {
          const res = await vacuumScheduler.runNow();
          return {
            success: res.success,
            message: res.success ? `VACUUM completed in ${res.durationMs}ms` : (res.error || "VACUUM failed"),
            duration: res.durationMs,
            error: res.error,
          };
        },
        purgeLogs: async () => {
          const retentionMs = logEnv.getCallLogRetentionDays() * 24 * 60 * 60 * 1000;
          const cutoff = new Date(Date.now() - retentionMs).toISOString();
          const res = callLogs.deleteCallLogsBefore(cutoff);
          return { deleted: res.deletedRows, deletedArtifacts: res.deletedArtifacts };
        },
        purgeQuotaSnapshots: async () => {
          return { deleted: 0 };
        },
        purgeCallLogs: async () => {
          const retentionMs = logEnv.getCallLogRetentionDays() * 24 * 60 * 60 * 1000;
          const cutoff = new Date(Date.now() - retentionMs).toISOString();
          const res = callLogs.deleteCallLogsBefore(cutoff);
          return { deleted: res.deletedRows, deletedArtifacts: res.deletedArtifacts };
        },
        purgeDetailedLogs: async () => {
          return { deleted: 0 };
        },
        resetUsageHistory: async (period: string) => {
          return (await dbCleanup.resetUsageHistory(period as any)) as Record<string, unknown>;
        },
        exportJson: async () => {
          const db = localDb as any;
          const [settings, providerConnections, providerNodes, combosList, keyList] = await Promise.all([
            localDb.getSettings(),
            db.getProviderConnections ? db.getProviderConnections() : [],
            db.getCachedProviderNodes ? db.getCachedProviderNodes() : [],
            db.getCombos ? db.getCombos() : [],
            db.getApiKeys ? db.getApiKeys() : [],
          ]);
          return {
            version: 1,
            exportedAt: new Date().toISOString(),
            settings,
            providers: providerConnections,
            providerNodes,
            combos: combosList,
            apiKeys: keyList,
          };
        },
        importJson: async (data: Record<string, unknown>) => {
          if (data.settings && typeof data.settings === "object") {
            await dbSettings.updateSettings(data.settings as Record<string, unknown>);
          }
          return { success: true, imported: true };
        },
        getFeatureFlags: async () => {
          const { FEATURE_FLAG_DEFINITIONS } = await import("@/shared/constants/featureFlagDefinitions");
          const { resolveAllFeatureFlags } = await import("@/shared/utils/featureFlags");
          const resolved = resolveAllFeatureFlags();
          const flags = resolved.map((item: any) => ({
            key: item.definition.key,
            label: item.definition.label,
            description: item.definition.description,
            category: item.definition.category,
            type: item.definition.type,
            enumValues: item.definition.enumValues ?? null,
            defaultValue: item.definition.defaultValue,
            effectiveValue: item.effectiveValue,
            source: item.source,
            requiresRestart: item.definition.requiresRestart,
            warningLevel: item.definition.warningLevel,
          }));
          const total = flags.length;
          const active = flags.filter((f: any) => ["true", "1", "yes"].includes(String(f.effectiveValue).toLowerCase())).length;
          const inactive = total - active;
          const overriddenByDb = flags.filter((f: any) => f.source === "db").length;
          const overriddenByEnv = flags.filter((f: any) => f.source === "env").length;
          return {
            flags,
            summary: { total, active, inactive, overriddenByDb, overriddenByEnv },
          };
        },
        updateFeatureFlag: async (key: string, value?: string) => {
          const featureFlagsDb = await import("@/lib/db/featureFlags");
          const { FEATURE_FLAG_DEFINITIONS } = await import("@/shared/constants/featureFlagDefinitions");
          const { resolveAllFeatureFlags } = await import("@/shared/utils/featureFlags");
          const definition = FEATURE_FLAG_DEFINITIONS.find((d: any) => d.key === key);
          if (!definition) throw new Error(`Unknown feature flag: ${key}`);

          const allFlagsBefore = resolveAllFeatureFlags();
          const prev = allFlagsBefore.find((f: any) => f.key === key);
          const previousValue = prev?.effectiveValue ?? definition.defaultValue;
          const previousSource = prev?.source ?? "default";

          if (value === undefined) {
            featureFlagsDb.removeFeatureFlagOverride(key);
          } else {
            featureFlagsDb.setFeatureFlagOverride(key, value);
          }

          const allFlagsAfter = resolveAllFeatureFlags();
          const updated = allFlagsAfter.find((f: any) => f.key === key);
          const effectiveValue = updated?.effectiveValue ?? definition.defaultValue;
          const source = updated?.source ?? "default";

          return {
            key,
            effectiveValue,
            source,
            previousValue,
            previousSource,
            requiresRestart: definition.requiresRestart,
          };
        },
        clearFeatureFlagOverrides: async () => {
          const featureFlagsDb = await import("@/lib/db/featureFlags");
          featureFlagsDb.clearAllFeatureFlagOverrides();
          return { success: true };
        },
        listAccessTokens: async () => {
          const accessTokensDb = await import("@/lib/db/accessTokens");
          return accessTokensDb.listAccessTokens();
        },
        createAccessToken: async (input: { name: string; scope?: string; expiresInDays?: number }) => {
          const accessTokensDb = await import("@/lib/db/accessTokens");
          const expiresAt =
            typeof input.expiresInDays === "number" && input.expiresInDays > 0
              ? new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString()
              : null;
          const { record, secret } = accessTokensDb.createAccessToken({
            name: input.name,
            scope: input.scope as any,
            expiresAt,
          });
          return {
            success: true,
            token: secret,
            id: record.id,
            name: record.name,
            scope: record.scope,
            tokenPrefix: record.tokenPrefix,
            createdAt: record.createdAt,
            expiresAt: record.expiresAt,
          };
        },
        revokeAccessToken: async (id: string) => {
          const accessTokensDb = await import("@/lib/db/accessTokens");
          return accessTokensDb.revokeAccessToken(id);
        },
      },
      keys: {
        getApiKeys: (limit?: number, offset?: number) =>
          apiKeys.getApiKeys(limit, offset) as Promise<ApiKeyView[]>,
        getApiKeysCount: () => apiKeys.getApiKeysCount() as number,
        getApiKeyById: (id: string) => apiKeys.getApiKeyById(id) as Promise<ApiKeyView | null>,
        getApiKeyDevices: async (id: string) => deviceTracker.getDeviceDetails(id),
        getApiKeyUsageLimitStatus: (key: ApiKeyView) => apiKeyUsageLimits.getApiKeyUsageLimitStatus({
          id: key.id,
          allowedConnections: Array.isArray(key.allowedConnections) ? key.allowedConnections : [],
          usageLimitEnabled: key.usageLimitEnabled === true,
          dailyUsageLimitUsd: typeof key.dailyUsageLimitUsd === "number" ? key.dailyUsageLimitUsd : null,
          weeklyUsageLimitUsd: typeof key.weeklyUsageLimitUsd === "number" ? key.weeklyUsageLimitUsd : null,
        }) as Promise<Record<string, unknown>>,
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
            const response = await modelsRoute.GET(new Request("http://gateway/api/models?all=true"));
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
            new Request("http://gateway/api/combos", {
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
            new Request(`http://gateway/api/combos/${encodeURIComponent(id)}`, {
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
            new Request(`http://gateway/api/combos/${encodeURIComponent(id)}`, { method: "DELETE" }),
            { params: Promise.resolve({ id }) },
          );
          return response.ok;
        },
        reorderCombos: async (comboIds: string[]) => {
          const response = await reorderRoute.POST(
            new Request("http://gateway/api/combos/reorder", {
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
              new Request("http://gateway/api/combos/test", {
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
            new Request("http://gateway/api/combos/duplicate", {
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
            const response = await comboAutoRoute.GET(new Request("http://gateway/api/combos/auto"));
            const payload = (await response.json()) as { combos?: Array<Record<string, unknown>> };
            return Array.isArray(payload?.combos) ? payload.combos : [];
          } catch {
            return [];
          }
        },
      },
      analytics: {
        getSearchAnalytics: async () => {
          const callLogStats = await import("@/lib/db/callLogStats");
          const searchRegistry = (await import(("@shiguang-gateway/open-sse/config/searchRegistry.ts" + "") as string)) as Record<string, any>;
          const SEARCH_PROVIDERS = (searchRegistry.SEARCH_PROVIDERS || {}) as Record<string, { costPerQuery?: number }>;

          const todayStart = new Date();
          todayStart.setUTCHours(0, 0, 0, 0);
          const todayIso = todayStart.toISOString();

          const statsRow = callLogStats.getSearchAggregateStats(todayIso);
          const total = statsRow?.total ?? 0;
          const today = statsRow?.today ?? 0;
          const errors = statsRow?.errors ?? 0;
          const avgDurationMs = Math.round(statsRow?.avg_duration ?? 0);
          const cached = statsRow?.cached ?? 0;

          const provRows = callLogStats.getSearchProviderCounts();
          const byProvider: Record<string, { count: number; costUsd: number }> = {};
          let totalCostUsd = 0;
          for (const row of provRows) {
            const costPerQuery = SEARCH_PROVIDERS[row.provider]?.costPerQuery ?? 0;
            const cost = costPerQuery * row.cnt;
            byProvider[row.provider] = { count: row.cnt, costUsd: cost };
            totalCostUsd += cost;
          }

          const cacheHitRate = total > 0 ? Math.round((cached / total) * 100) : 0;
          return {
            total,
            today,
            cached,
            errors,
            totalCostUsd,
            byProvider,
            cacheHitRate,
            avgDurationMs,
            last24h: [],
          };
        },
        getProviderStats: async () => {
          const providerStats = await import("@/lib/db/providerStats");
          const { AI_PROVIDERS } = await import("@/shared/constants/providers");

          const pStats = providerStats.getProviderCallStats();
          const mStats = providerStats.getModelCallStats();

          let comboMetrics: Record<string, unknown> = {};
          try {
            const comboMetricsMod = (await import(("@shiguang-gateway/open-sse/services/comboMetrics.ts" + "") as string)) as Record<string, any>;
            comboMetrics = comboMetricsMod.getAllComboMetrics ? (comboMetricsMod.getAllComboMetrics() as Record<string, unknown>) : {};
          } catch {}

          let telemetry: Record<string, unknown> = {};
          try {
            const { getTelemetrySummary } = await import("@/shared/utils/requestTelemetry");
            telemetry = getTelemetrySummary(300000) as Record<string, unknown>;
          } catch {}

          let toolLatency: Record<string, unknown> = {};
          try {
            const toolLatencyMod = (await import(("@shiguang-gateway/open-sse/services/toolLatencyTracker.ts" + "") as string)) as Record<string, any>;
            toolLatency = toolLatencyMod.getToolLatencyByProvider ? (toolLatencyMod.getToolLatencyByProvider() as Record<string, unknown>) : {};
          } catch {}

          const resolveName = (provider: string, nodeName: string | null) => {
            if (nodeName?.trim()) return nodeName.trim();
            const info = (AI_PROVIDERS as Record<string, { name?: string }>)[provider];
            return info?.name || provider;
          };

          const providersList = pStats.map((p: any) => ({
            ...p,
            provider: resolveName(p.provider, p.nodeName),
          }));

          const modelsList = mStats.map((m: any) => ({
            ...m,
            provider: resolveName(m.provider, m.nodeName),
          }));

          return {
            providers: providersList,
            models: modelsList,
            comboMetrics,
            telemetry,
            toolLatency,
          };
        },
        getComboHealthDashboard: async (query: {
          range?: "1h" | "24h" | "7d" | "30d";
          horizon?: "24h" | "7d" | "30d";
          comboId?: string;
          taskType?: string;
        }) => {
          const comboHealthDashboard = await import("@/lib/usage/comboHealthDashboard");
          return comboHealthDashboard.buildComboHealthDashboardResponse(query);
        },
        getUtilization: async (query: {
          range: "1h" | "24h" | "7d" | "30d";
          provider?: string;
          aggregateBy?: "provider" | "connection";
        }) => {
          const quotaSnapshots = await import("@/lib/db/quotaSnapshots");
          const { BUCKET_SIZES } = await import("@/shared/types/utilization");
          const end = new Date();
          const start = new Date(end);
          if (query.range === "1h") start.setHours(start.getHours() - 1);
          else if (query.range === "24h") start.setDate(start.getDate() - 1);
          else if (query.range === "7d") start.setDate(start.getDate() - 7);
          else if (query.range === "30d") start.setDate(start.getDate() - 30);

          const bucketMinutes = BUCKET_SIZES[query.range] ?? 60;
          return quotaSnapshots.getAggregatedSnapshots({
            provider: query.provider || undefined,
            since: start.toISOString(),
            bucketMinutes,
            aggregateBy: query.aggregateBy === "connection" ? "connection" : "provider",
          });
        },
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Local runtime adapters failed to initialize: ${message}`, { cause: err });
  }
}
