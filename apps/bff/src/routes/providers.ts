/**
 * Providers 路由：迁移自 src/app/api/providers/route.ts + [id]/route.ts。
 * 覆盖：
 *  - GET/POST /api/providers(列表/创建)
 *  - PATCH /api/providers(批量激活停用)、DELETE /api/providers(批量删除)
 *  - GET/PUT/DELETE /api/providers/:id(单条)
 * 响应/脱敏与原后端一致：apiKey 掩码(除非 reveal 开启)、剔除 accessToken/refreshToken/idToken、
 * providerSpecificData 走 sanitize。
 */
import type { FastifyInstance } from "fastify";
import { getStaticProviderCatalog, getStaticProviderModels } from "../lib/engine.js";

export interface ProviderEngine {
  listProviders(filter: { provider?: string }, limit?: number, offset?: number): Promise<ProviderRow[]>;
  countProviders(filter: { provider?: string }): number;
  getProviderById(id: string): Promise<ProviderRow | null>;
  createProvider(data: Record<string, unknown>): Promise<ProviderRow>;
  updateProvider(id: string, data: Record<string, unknown>): Promise<ProviderRow>;
  deleteProvider(id: string): Promise<boolean>;
  deleteProviders(ids: string[]): Promise<number>;
  isApiKeyRevealEnabled(): boolean;
  maskStoredApiKey(apiKey: string): string;
  sanitizeProviderSpecificData(data: unknown): unknown;
  getCatalog?: () => Promise<ProviderCatalogResponse>;
  getExpirations?: () => Promise<{ summary: unknown; list: unknown[] }>;
  getOpenRouterStats?: (refresh?: boolean) => Promise<{
    data: unknown[];
    meta?: Record<string, unknown>;
  }>;
  testConnection?: (id: string) => Promise<{
    valid: boolean;
    latencyMs?: number;
    error?: string | null;
    diagnosis?: unknown;
    statusCode?: number | null;
    testedAt?: string;
  }>;
  getProviderFamilyIds?: (providerId: string) => string[];
  /** Resolve the catalog auth category for a provider id (used by batch-test filters). */
  getProviderCategory?: (providerId: string) => string | undefined;
  getProviderModels?: (connectionId: string) => Promise<{ models: unknown[]; customModels: unknown[] }>;
  getModelsForProvider?: (providerId: string) => Promise<{ models: unknown[]; customModels: unknown[]; modelCompatOverrides?: unknown[]; hiddenModelsByProvider?: Record<string, string[]>; source?: string }>;
  addCustomModel?: (data: Record<string, unknown>) => Promise<{ model: unknown }>;
  updateCustomModel?: (data: Record<string, unknown>) => Promise<{ model?: unknown; success: boolean }>;
  removeCustomModel?: (provider: string, modelId?: string, options?: { resetOverride?: boolean; clearAll?: boolean }) => Promise<{ success: boolean }>;
  setModelVisibility?: (provider: string, modelIds: string[], isHidden: boolean) => Promise<{ ok: boolean; updated: number }>;
  getCcAlias?: (providerId: string) => Promise<{ provider: "on" | "off" | null; models: Record<string, "on" | "off"> }>;
  setCcAlias?: (providerId: string, data: { scope: "provider" | "model"; value: "on" | "off" | null; modelId?: string }) => Promise<{ success: boolean }>;
  getModelAliases?: () => Promise<Record<string, string>>;
  setModelAlias?: (model: string, alias: string) => Promise<boolean>;
  deleteModelAlias?: (alias: string) => Promise<boolean>;
  testModel?: (data: { providerId: string; modelId: string; connectionId?: string }) => Promise<{ status: "ok" | "error"; latencyMs?: number; responseText?: string; error?: string }>;
  webSearch?: (body: Record<string, unknown>) => Promise<{ status: number; payload: unknown }>;
  embeddings?: (body: Record<string, unknown>) => Promise<{ status: number; payload: unknown }>;
  imageGenerations?: (body: Record<string, unknown>) => Promise<{ status: number; payload: unknown }>;
  audioSpeech?: (body: Record<string, unknown>) => Promise<{ status: number; payload: unknown }>;
  addProviderModel?: (connectionId: string, modelId: string, modelName?: string) => unknown;
  removeProviderModel?: (connectionId: string, modelId: string) => unknown;
  getParamFilters?: (providerId: string) => unknown;
  setParamFilters?: (providerId: string, config: Record<string, unknown>) => unknown;
  deleteParamFilters?: (providerId: string) => unknown;
  getInterceptionRules?: (providerId: string) => unknown;
  setInterceptionRules?: (providerId: string, config: Record<string, unknown>) => unknown;
  deleteInterceptionRules?: (providerId: string) => unknown;
  webFetch?: (body: Record<string, unknown>) => Promise<{ status: number; payload: unknown }>;
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

export interface ProviderRow {
  id: string;
  provider: string;
  name: string;
  apiKey?: string;
  accessToken?: unknown;
  refreshToken?: unknown;
  idToken?: unknown;
  providerSpecificData?: unknown;
  [key: string]: unknown;
}

/** 与后端一致的脱敏：掩码 key + 剔除敏感 token + sanitize providerSpecificData */
function sanitizeConnection(c: ProviderRow, revealKeys: boolean, engine: ProviderEngine): ProviderRow {
  return {
    ...c,
    apiKey: revealKeys ? c.apiKey : c.apiKey ? engine.maskStoredApiKey(c.apiKey) : undefined,
    accessToken: undefined,
    refreshToken: undefined,
    idToken: undefined,
    providerSpecificData: c.providerSpecificData
      ? engine.sanitizeProviderSpecificData(c.providerSpecificData)
      : undefined,
  };
}

export function providerRoutes(
  app: FastifyInstance,
  opts: { engine?: ProviderEngine } = {},
): void {
  const engine = opts.engine;

  /** Official provider playground endpoint; the engine delegates to Orbit's
   * existing handler so credential lookup, provider fallback and sanitization
   * remain identical to the original implementation. */
  app.post("/v1/web/fetch", async (request, reply) => {
    try {
      if (!engine?.webFetch) return reply.status(501).send({ error: "Web fetch is unavailable" });
      const result = await engine.webFetch((request.body ?? {}) as Record<string, unknown>);
      return reply.status(result.status).send(result.payload);
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to execute web fetch" }); }
  });

  /** GET /api/providers */
  app.get("/providers", async (request, reply) => {
    try {
      const url = new URL(request.url, "http://bff");
      const provider = url.searchParams.get("provider")?.trim();
      const limitValue = url.searchParams.get("limit");
      const offsetValue = url.searchParams.get("offset");
      const parsedLimit = limitValue ? Number.parseInt(limitValue, 10) : undefined;
      const parsedOffset = offsetValue ? Number.parseInt(offsetValue, 10) : undefined;
      const limit = Number.isInteger(parsedLimit) && parsedLimit && parsedLimit > 0 ? parsedLimit : undefined;
      const offset = Number.isInteger(parsedOffset) && parsedOffset && parsedOffset > 0 ? parsedOffset : 0;
      const filter = provider ? { provider } : {};

      if (!engine) {
        return reply.status(200).send({ connections: [], total: 0 });
      }

      const connections = await engine.listProviders(filter, limit, offset);
      const total = engine.countProviders(filter);
      const revealKeys = engine.isApiKeyRevealEnabled();

      const safeConnections = connections.map((c) => sanitizeConnection(c, revealKeys, engine));
      return reply.status(200).send({ connections: safeConnections, total });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch providers" });
    }
  });

  /** GET /api/providers/catalog —— 静态 provider catalog 由 BFF 统一投影 */
  app.get("/providers/catalog", async (_request, reply) => {
    try {
      // Catalog metadata is a static Orbit registry, not NAS-backed state. In
      // proxy mode the local BFF still serves it so older NAS deployments that
      // lack this endpoint do not make the whole Providers page look broken.
      return reply.status(200).send(engine?.getCatalog ? await engine.getCatalog() : await getStaticProviderCatalog());
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch provider catalog" });
    }
  });

  /** Official static model registry, served locally even while data is proxied to NAS. */
  app.get("/providers/:id/catalog-models", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return reply.status(200).send({ models: await getStaticProviderModels(id), source: "registry" });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch provider model registry" });
    }
  });

  /** GET /api/providers/expiration —— Orbit provider expiration projection */
  app.get("/providers/expiration", async (_request, reply) => {
    try {
      if (!engine?.getExpirations) return reply.status(200).send({ summary: null, list: [] });
      return reply.status(200).send(await engine.getExpirations());
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch provider expiration metadata" });
    }
  });

  /** GET /api/providers/openrouter-stats —— cached Orbit catalog enrichment */
  app.get("/providers/openrouter-stats", async (request, reply) => {
    try {
      if (!engine?.getOpenRouterStats) {
        return reply.status(200).send({ object: "list", data: [], meta: { source: "unavailable", count: 0 } });
      }
      const url = new URL(request.url, "http://bff");
      const refresh = url.searchParams.get("refresh") === "true";
      const result = await engine.getOpenRouterStats(refresh);
      return reply.status(200).send({ object: "list", ...result });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch OpenRouter provider stats" });
    }
  });

  /** POST /api/providers —— 创建连接 */
  app.post("/providers", async (request, reply) => {
    try {
      const body = (request.body ?? {}) as Record<string, unknown>;
      const provider = typeof body.provider === "string" ? body.provider : "";
      if (!provider) {
        return reply.status(400).send({ error: { type: "invalid_request", message: "Provider is required" } });
      }
      if (!engine) return reply.status(500).send({ error: "Engine not configured" });

      const connection = await engine.createProvider({
        provider,
        name: typeof body.name === "string" ? body.name : `${provider} Primary`,
        apiKey: typeof body.apiKey === "string" ? body.apiKey : undefined,
        baseUrl: typeof body.baseUrl === "string" ? body.baseUrl : undefined,
        authType: typeof body.authType === "string" ? body.authType : undefined,
        priority: typeof body.priority === "number" ? body.priority : 1,
        defaultModel: typeof body.defaultModel === "string" ? body.defaultModel : undefined,
        testStatus: typeof body.testStatus === "string" ? body.testStatus : "unknown",
        isActive: false, // 与原后端一致：测试通过才激活
        providerSpecificData: body.providerSpecificData ?? undefined,
      });
      const revealKeys = engine.isApiKeyRevealEnabled();
      return reply.status(201).send({ connection: sanitizeConnection(connection, revealKeys, engine) });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to create provider" });
    }
  });

  /** POST /api/providers/import —— 导入多个 Provider 连接 */
  app.post("/providers/import", async (request, reply) => {
    try {
      if (!engine) return reply.status(500).send({ error: "Engine not configured" });
      const body = (request.body ?? {}) as { providers?: unknown };
      if (!Array.isArray(body.providers) || body.providers.length === 0) {
        return reply.status(400).send({ error: { type: "invalid_request", message: "providers must be a non-empty array" } });
      }
      if (body.providers.length > 100) {
        return reply.status(400).send({ error: { type: "invalid_request", message: "Too many providers (max 100)" } });
      }
      const imported: ProviderRow[] = [];
      const errors: Array<{ index: number; message: string }> = [];
      for (const [index, value] of body.providers.entries()) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          errors.push({ index, message: "Provider entry must be an object" });
          continue;
        }
        const item = value as Record<string, unknown>;
        const provider = typeof item.provider === "string" ? item.provider.trim() : "";
        if (!provider) {
          errors.push({ index, message: "Provider is required" });
          continue;
        }
        try {
          const connection = await engine.createProvider({
            provider,
            name: typeof item.name === "string" && item.name.trim() ? item.name : `${provider} Primary`,
            apiKey: typeof item.apiKey === "string" ? item.apiKey : undefined,
            baseUrl: typeof item.baseUrl === "string" ? item.baseUrl : undefined,
            authType: typeof item.authType === "string" ? item.authType : undefined,
            priority: typeof item.priority === "number" ? item.priority : 1,
            defaultModel: typeof item.defaultModel === "string" ? item.defaultModel : undefined,
            providerSpecificData: item.providerSpecificData,
            isActive: false,
            testStatus: "unknown",
          });
          imported.push(connection);
        } catch (error) {
          errors.push({ index, message: error instanceof Error ? error.message : "Failed to import provider" });
        }
      }
      const revealKeys = engine.isApiKeyRevealEnabled();
      return reply.status(200).send({
        imported: imported.map((connection) => sanitizeConnection(connection, revealKeys, engine)),
        importedCount: imported.length,
        errors,
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to import providers" });
    }
  });

  /** PATCH /api/providers —— 批量激活/停用 */
  app.patch("/providers", async (request, reply) => {
    try {
      const body = (request.body ?? {}) as { ids?: unknown; isActive?: unknown };
      const ids = Array.isArray(body.ids) ? body.ids.filter((i): i is string => typeof i === "string") : [];
      if (ids.length === 0) {
        return reply.status(400).send({ error: { type: "invalid_request", message: "ids required" } });
      }
      if (!engine) return reply.status(500).send({ error: "Engine not configured" });
      const isActive = body.isActive === true;
      let updated = 0;
      const notFound: string[] = [];
      for (const id of ids) {
        const existing = await engine.getProviderById(id);
        if (!existing) {
          notFound.push(id);
          continue;
        }
        await engine.updateProvider(id, { isActive });
        updated++;
      }
      return reply.status(200).send({ message: "Providers updated", updated, notFound });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to update providers" });
    }
  });

  /** DELETE /api/providers —— 批量删除 */
  app.delete("/providers", async (request, reply) => {
    try {
      const body = (request.body ?? {}) as { ids?: unknown };
      const ids = Array.isArray(body.ids) ? body.ids.filter((i): i is string => typeof i === "string") : [];
      if (ids.length === 0) {
        return reply.status(400).send({ error: { type: "invalid_request", message: "ids required" } });
      }
      if (ids.length > 100) {
        return reply.status(400).send({ error: { type: "invalid_request", message: "Too many ids (max 100)" } });
      }
      if (!engine) return reply.status(500).send({ error: "Engine not configured" });
      const deleted = await engine.deleteProviders(ids);
      return reply.status(200).send({ message: "Providers deleted", deleted });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to delete providers" });
    }
  });

  /** Provider detail projections and settings (all remain engine-backed). */
  app.get("/providers/:id/models", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (!engine?.getProviderModels) return reply.status(200).send({ models: [], customModels: [], source: "unavailable" });
      return reply.status(200).send(await engine.getProviderModels(id));
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch provider models" });
    }
  });
  /** Provider-level model catalog. Orbit uses this for the detail page before a connection exists. */
  app.get("/provider-models", async (request, reply) => {
    try {
      const providerId = new URL(request.url, "http://bff").searchParams.get("provider")?.trim() ?? "";
      if (!providerId) return reply.status(400).send({ error: { type: "invalid_request", message: "provider is required" } });
      if (!engine?.getModelsForProvider) return reply.status(200).send({ models: [], customModels: [], source: "unavailable" });
      return reply.status(200).send(await engine.getModelsForProvider(providerId));
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to fetch provider model catalog" }); }
  });

  app.post("/provider-models", async (request, reply) => {
    try {
      const body = (request.body ?? {}) as Record<string, unknown>;
      if (!body.provider || !body.modelId) {
        return reply.status(400).send({ error: { type: "invalid_request", message: "provider and modelId are required" } });
      }
      if (!engine?.addCustomModel) return reply.status(501).send({ error: "Custom model management unavailable" });
      const result = await engine.addCustomModel(body);
      return reply.status(201).send(result);
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: error instanceof Error ? error.message : "Failed to add custom model" }); }
  });

  app.put("/provider-models", async (request, reply) => {
    try {
      const body = (request.body ?? {}) as Record<string, unknown>;
      if (!body.provider || !body.modelId) {
        return reply.status(400).send({ error: { type: "invalid_request", message: "provider and modelId are required" } });
      }
      if (!engine?.updateCustomModel) return reply.status(501).send({ error: "Custom model management unavailable" });
      const result = await engine.updateCustomModel(body);
      return reply.status(200).send(result);
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: error instanceof Error ? error.message : "Failed to update custom model" }); }
  });

  app.delete("/provider-models", async (request, reply) => {
    try {
      const url = new URL(request.url, "http://bff");
      const provider = url.searchParams.get("provider")?.trim() ?? "";
      const model = url.searchParams.get("model")?.trim() ?? url.searchParams.get("modelId")?.trim();
      const all = url.searchParams.get("all") === "true" || url.searchParams.get("clearAll") === "true";
      const resetOverride = url.searchParams.get("resetOverride") === "true";
      if (!provider) return reply.status(400).send({ error: { type: "invalid_request", message: "provider is required" } });
      if (!engine?.removeCustomModel) return reply.status(501).send({ error: "Custom model management unavailable" });
      const result = await engine.removeCustomModel(provider, model, { resetOverride, clearAll: all });
      return reply.status(200).send(result);
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: error instanceof Error ? error.message : "Failed to delete custom model" }); }
  });

  app.patch("/provider-models", async (request, reply) => {
    try {
      const url = new URL(request.url, "http://bff");
      const body = (request.body ?? {}) as { modelIds?: unknown; modelId?: unknown; isHidden?: unknown };
      const provider = url.searchParams.get("provider")?.trim() ?? "";
      if (!provider) return reply.status(400).send({ error: { type: "invalid_request", message: "provider is required" } });
      const isHidden = body.isHidden === true;
      let modelIds: string[] = [];
      if (Array.isArray(body.modelIds)) {
        modelIds = body.modelIds.filter((id): id is string => typeof id === "string" && Boolean(id.trim()));
      } else if (typeof body.modelId === "string" && body.modelId.trim()) {
        modelIds = [body.modelId.trim()];
      }
      if (!engine?.setModelVisibility) return reply.status(501).send({ error: "Model visibility management unavailable" });
      const result = await engine.setModelVisibility(provider, modelIds, isHidden);
      return reply.status(200).send(result);
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: error instanceof Error ? error.message : "Failed to update model visibility" }); }
  });

  app.get("/providers/:id/cc-alias", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (!engine?.getCcAlias) return reply.status(200).send({ provider: null, models: {} });
      return reply.status(200).send(await engine.getCcAlias(id));
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to fetch cc-alias settings" }); }
  });

  app.put("/providers/:id/cc-alias", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { scope: "provider" | "model"; value: "on" | "off" | null; modelId?: string };
      if (!engine?.setCcAlias) return reply.status(501).send({ error: "cc-alias management unavailable" });
      return reply.status(200).send(await engine.setCcAlias(id, body));
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to save cc-alias settings" }); }
  });

  app.get("/models/alias", async (_request, reply) => {
    try {
      if (!engine?.getModelAliases) return reply.status(200).send({ aliases: {} });
      return reply.status(200).send({ aliases: await engine.getModelAliases() });
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to fetch model aliases" }); }
  });

  app.put("/models/alias", async (request, reply) => {
    try {
      const body = (request.body ?? {}) as { model?: string; alias?: string };
      if (!body.model || !body.alias) return reply.status(400).send({ error: "model and alias are required" });
      if (!engine?.setModelAlias) return reply.status(501).send({ error: "Model alias management unavailable" });
      await engine.setModelAlias(body.model, body.alias);
      return reply.status(200).send({ success: true });
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to set model alias" }); }
  });

  app.delete("/models/alias", async (request, reply) => {
    try {
      const url = new URL(request.url, "http://bff");
      const alias = url.searchParams.get("alias")?.trim() ?? "";
      if (!alias) return reply.status(400).send({ error: "alias is required" });
      if (!engine?.deleteModelAlias) return reply.status(501).send({ error: "Model alias management unavailable" });
      await engine.deleteModelAlias(alias);
      return reply.status(200).send({ success: true });
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to delete model alias" }); }
  });

  app.post("/models/test", async (request, reply) => {
    try {
      const body = (request.body ?? {}) as { providerId?: string; modelId?: string; connectionId?: string };
      if (!body.providerId || !body.modelId) return reply.status(400).send({ error: "providerId and modelId are required" });
      if (!engine?.testModel) return reply.status(501).send({ error: "Model testing unavailable" });
      const result = await engine.testModel({ providerId: body.providerId, modelId: body.modelId, connectionId: body.connectionId });
      return reply.status(result.status === "ok" ? 200 : 400).send(result);
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to test model" }); }
  });

  app.post("/v1/search", async (request, reply) => {
    try {
      if (!engine?.webSearch) return reply.status(501).send({ error: "Web search is unavailable" });
      const result = await engine.webSearch((request.body ?? {}) as Record<string, unknown>);
      return reply.status(result.status).send(result.payload);
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to execute search" }); }
  });

  app.post("/v1/embeddings", async (request, reply) => {
    try {
      if (!engine?.embeddings) return reply.status(501).send({ error: "Embeddings unavailable" });
      const result = await engine.embeddings((request.body ?? {}) as Record<string, unknown>);
      return reply.status(result.status).send(result.payload);
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to generate embeddings" }); }
  });

  app.post("/v1/images/generations", async (request, reply) => {
    try {
      if (!engine?.imageGenerations) return reply.status(501).send({ error: "Image generation unavailable" });
      const result = await engine.imageGenerations((request.body ?? {}) as Record<string, unknown>);
      return reply.status(result.status).send(result.payload);
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to generate image" }); }
  });

  app.post("/v1/audio/speech", async (request, reply) => {
    try {
      if (!engine?.audioSpeech) return reply.status(501).send({ error: "Speech generation unavailable" });
      const result = await engine.audioSpeech((request.body ?? {}) as Record<string, unknown>);
      return reply.status(result.status).send(result.payload);
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to generate speech" }); }
  });

  app.post("/providers/:id/models", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { modelId?: unknown; modelName?: unknown };
      const modelId = typeof body.modelId === "string" ? body.modelId.trim() : "";
      if (!modelId) return reply.status(400).send({ error: { type: "invalid_request", message: "modelId is required" } });
      if (!engine?.addProviderModel) return reply.status(501).send({ error: "Provider model management unavailable" });
      return reply.status(201).send({ model: await engine.addProviderModel(id, modelId, typeof body.modelName === "string" ? body.modelName.trim() : undefined) });
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to add provider model" }); }
  });
  app.delete("/providers/:id/models", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const modelId = new URL(request.url, "http://bff").searchParams.get("modelId")?.trim() ?? "";
      if (!modelId) return reply.status(400).send({ error: { type: "invalid_request", message: "modelId is required" } });
      if (!engine?.removeProviderModel) return reply.status(501).send({ error: "Provider model management unavailable" });
      await engine.removeProviderModel(id, modelId);
      return reply.status(200).send({ success: true });
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to remove provider model" }); }
  });
  app.get("/providers/:id/param-filters", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return reply.status(200).send(engine?.getParamFilters?.(id) ?? { block: [], allow: [], autoLearn: false });
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to fetch parameter filters" }); }
  });
  app.put("/providers/:id/param-filters", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as Record<string, unknown>;
      if (!engine?.setParamFilters) return reply.status(501).send({ error: "Parameter filters unavailable" });
      return reply.status(200).send({ success: true, config: await engine.setParamFilters(id, body) });
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to save parameter filters" }); }
  });
  app.delete("/providers/:id/param-filters", async (request, reply) => {
    try { const { id } = request.params as { id: string }; await engine?.deleteParamFilters?.(id); return reply.status(200).send({ success: true }); }
    catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to reset parameter filters" }); }
  });
  app.get("/providers/:id/interception-rules", async (request, reply) => {
    try { const { id } = request.params as { id: string }; return reply.status(200).send(engine?.getInterceptionRules?.(id) ?? { interceptSearch: undefined, interceptFetch: undefined }); }
    catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to fetch interception rules" }); }
  });
  app.put("/providers/:id/interception-rules", async (request, reply) => {
    try { const { id } = request.params as { id: string }; if (!engine?.setInterceptionRules) return reply.status(501).send({ error: "Interception rules unavailable" }); return reply.status(200).send({ success: true, config: await engine.setInterceptionRules(id, (request.body ?? {}) as Record<string, unknown>) }); }
    catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to save interception rules" }); }
  });
  app.delete("/providers/:id/interception-rules", async (request, reply) => {
    try { const { id } = request.params as { id: string }; await engine?.deleteInterceptionRules?.(id); return reply.status(200).send({ success: true }); }
    catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to reset interception rules" }); }
  });
  /** POST /api/providers/:id/test —— official single-connection test contract */
  app.post("/providers/:id/test", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (!engine?.testConnection) return reply.status(501).send({ error: "Provider connection test is not available" });
      const connection = await engine.getProviderById(id);
      if (!connection) return reply.status(404).send({ error: "Provider not found" });
      const result = await engine.testConnection(id);
      return reply.status(200).send({ provider: connection.provider, connectionId: id, connectionName: connection.name, ...result });
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to test provider" }); }
  });

  /** GET /api/providers/:id */
  app.get("/providers/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (!engine) return reply.status(500).send({ error: "Engine not configured" });
      const connection = await engine.getProviderById(id);
      if (!connection) return reply.status(404).send({ error: "Provider not found" });
      const revealKeys = engine.isApiKeyRevealEnabled();
      return reply.status(200).send({ connection: sanitizeConnection(connection, revealKeys, engine) });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch provider" });
    }
  });

  /** PUT /api/providers/:id —— 更新连接(与原 PATCH 委托 PUT 一致) */
  app.put("/providers/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as Record<string, unknown>;
      if (!engine) return reply.status(500).send({ error: "Engine not configured" });
      const existing = await engine.getProviderById(id);
      if (!existing) return reply.status(404).send({ error: "Provider not found" });
      await engine.updateProvider(id, body);
      // 更新后重新读取(引擎 update 返回的行凭证未解密)，保证 apiKey 脱敏格式一致
      const connection = await engine.getProviderById(id);
      if (!connection) return reply.status(404).send({ error: "Provider not found" });
      const revealKeys = engine.isApiKeyRevealEnabled();
      return reply.status(200).send({ connection: sanitizeConnection(connection, revealKeys, engine) });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to update provider" });
    }
  });

  /** DELETE /api/providers/:id */
  app.delete("/providers/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (!engine) return reply.status(500).send({ error: "Engine not configured" });
      const ok = await engine.deleteProvider(id);
      if (!ok) return reply.status(404).send({ error: "Provider not found" });
      return reply.status(200).send({ message: "Provider deleted" });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to delete provider" });
    }
  });

  /** POST /api/providers/test-batch —— 批量测试(完整并发/超时逻辑在 P-2 接线) */
  app.post("/providers/test-batch", async (request, reply) => {
    try {
      const body = (request.body ?? {}) as { mode?: string; providerId?: string; connectionIds?: unknown };
      const mode = typeof body.mode === "string" ? body.mode : "all";
      const providerId = typeof body.providerId === "string" ? body.providerId : undefined;

      if (!engine) {
        return reply.status(200).send({ mode, providerId, results: [], testedAt: new Date().toISOString(), summary: { total: 0, passed: 0, failed: 0 } });
      }

      // 选中的连接 ID 或按 mode 取连接。除 selected 外与 Orbit 一致只测试启用连接。
      let targets: ProviderRow[] = [];
      const connectionIds = Array.isArray(body.connectionIds) ? body.connectionIds.filter((i): i is string => typeof i === "string") : [];
      if (connectionIds.length > 0) {
        for (const id of connectionIds) {
          const c = await engine.getProviderById(id);
          if (c) targets.push(c);
        }
      } else if (providerId) {
        const familyIds = engine.getProviderFamilyIds?.(providerId) ?? [providerId];
        const family = new Set(familyIds);
        targets = (await engine.listProviders({})).filter((c) => family.has(c.provider));
      } else {
        targets = await engine.listProviders({});
      }

      if (mode !== "selected") targets = targets.filter((c) => c.isActive !== false);
      if (!providerId && connectionIds.length === 0 && mode !== "all" && mode !== "selected") {
        targets = targets.filter((connection) => {
          const category = engine.getProviderCategory?.(connection.provider) ?? connection.authType;
          if (!category) return false;
          if (mode === "apikey") return category === "apikey";
          return category === mode || connection.authType === mode;
        });
      }

      if (!engine.testConnection) {
        return reply.status(501).send({ error: "Provider connection test is not available" });
      }

      const CONCURRENCY = 5;
      const results: Array<Record<string, unknown>> = [];
      for (let index = 0; index < targets.length; index += CONCURRENCY) {
        const batch = targets.slice(index, index + CONCURRENCY);
        const batchResults = await Promise.all(
          batch.map(async (connection) => {
            try {
              const result = await engine.testConnection!(connection.id);
              return {
                provider: connection.provider,
                connectionId: connection.id,
                connectionName: connection.name,
                authType: connection.authType,
                ...result,
              };
            } catch (error) {
              return {
                provider: connection.provider,
                connectionId: connection.id,
                connectionName: connection.name,
                authType: connection.authType,
                valid: false,
                latencyMs: 0,
                error: error instanceof Error ? error.message : "Connection test failed",
                diagnosis: { type: "network_error", source: "local" },
                testedAt: new Date().toISOString(),
              };
            }
          }),
        );
        results.push(...batchResults);
      }

      return reply.status(200).send({
        mode,
        providerId,
        results,
        testedAt: new Date().toISOString(),
        summary: {
          total: results.length,
          passed: results.filter((result) => result.valid === true).length,
          failed: results.filter((result) => result.valid !== true).length,
        },
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to run batch test" });
    }
  });
}
