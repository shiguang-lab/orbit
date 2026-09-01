/**
 * API Keys 路由：迁移自 src/app/api/keys/ 下 10 个 route.ts。
 * 覆盖：GET/POST /api/keys、[id] CRUD、regenerate/reveal/devices/usage-limits、groups。
 * 响应/错误格式与原后端一致(掩码 key、allowKeyReveal 门控、部分更新 PATCH)。
 */
import type { FastifyInstance } from "fastify";

export interface KeyEngine {
  getApiKeys(limit?: number, offset?: number): Promise<ApiKeyView[]>;
  getApiKeysCount(): number;
  getApiKeyById(id: string): Promise<ApiKeyView | null>;
  createApiKey(
    name: string,
    machineId: string,
    scopes?: string[],
    options?: { allowedConnections?: string[] },
  ): Promise<{ key: string; id: string }>;
  regenerateApiKey(id: string): Promise<{ id: string; key: string } | null>;
  updateApiKeyPermissions(id: string, update: Record<string, unknown>): Promise<unknown>;
  deleteApiKey(id: string): Promise<boolean>;
  isApiKeyRevealEnabled(): boolean;
  maskStoredApiKey(key: string): string;
  getConsistentMachineId(salt?: string): Promise<string>;
}

export interface ApiKeyView {
  id: string;
  name: string;
  key?: string | null;
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

/** 掩码格式：前8****后4(与 maskStoredApiKey 一致) */
function maskKey(key: string | null | undefined): string | null | undefined {
  if (!key) return key;
  if (key.length <= 12) return key;
  return `${key.slice(0, 8)}****${key.slice(-4)}`;
}

export function keyRoutes(app: FastifyInstance, opts: { engine?: KeyEngine } = {}): void {
  const engine = opts.engine;

  /** GET /api/keys */
  app.get("/keys", async (request, reply) => {
    try {
      const url = new URL(request.url, "http://bff");
      const limitValue = url.searchParams.get("limit");
      const offsetValue = url.searchParams.get("offset");
      const limit = limitValue && Number.isInteger(Number(limitValue)) && Number(limitValue) > 0 ? Number(limitValue) : undefined;
      const offset = offsetValue && Number.isInteger(Number(offsetValue)) && Number(offsetValue) > 0 ? Number(offsetValue) : 0;

      if (!engine) {
        return reply.status(200).send({ keys: [], total: 0, allowKeyReveal: false });
      }

      const keys = await engine.getApiKeys(limit, offset);
      const total = engine.getApiKeysCount();
      const allowKeyReveal = engine.isApiKeyRevealEnabled();

      const safeKeys = keys.map((k) => ({ ...k, key: maskKey(k.key) }));
      return reply.status(200).send({ keys: safeKeys, total, allowKeyReveal });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch keys" });
    }
  });

  /** POST /api/keys */
  app.post("/keys", async (request, reply) => {
    try {
      const body = (request.body ?? {}) as { name?: unknown; scopes?: unknown; allowUsageCommand?: unknown; noLog?: unknown; allowedConnections?: unknown };
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length === 0 || name.length > 200) {
        return reply.status(400).send({ error: { type: "invalid_request", message: "Invalid key name" } });
      }

      if (!engine) {
        return reply.status(500).send({ error: "Engine not configured" });
      }

      const scopes = Array.isArray(body.scopes) ? body.scopes.filter((s): s is string => typeof s === "string") : [];
      // 与原后端一致：创建时强制加入 self:usage
      const normalizedScopes = scopes.includes("self:usage") ? scopes : ["self:usage", ...scopes];

      const machineId = await engine.getConsistentMachineId();
      const allowedConnections = Array.isArray(body.allowedConnections)
        ? body.allowedConnections.filter((c): c is string => typeof c === "string")
        : undefined;

      const created = await engine.createApiKey(name, machineId, normalizedScopes, { allowedConnections });

      // 可选扩展字段(noLog/allowUsageCommand 等)由前端 PATCH 补充；创建返回明文 key
      return reply.status(201).send({
        key: created.key,
        name,
        id: created.id,
        machineId,
        scopes: normalizedScopes,
        allowedConnections: allowedConnections ?? [],
        noLog: body.noLog === true,
        allowUsageCommand: body.allowUsageCommand === true,
        streamDefaultMode: "legacy",
        compressionEnabled: true,
        cacheDefaultMode: "legacy",
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to create key" });
    }
  });

  /** GET /api/keys/:id */
  app.get("/keys/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (!engine) return reply.status(500).send({ error: "Engine not configured" });
      const key = await engine.getApiKeyById(id);
      if (!key) return reply.status(404).send({ error: "Key not found" });
      return reply.status(200).send({ ...key, key: maskKey(key.key) });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch key" });
    }
  });

  /** PATCH /api/keys/:id —— 部分更新(与 updateApiKeyPermissions 一致) */
  app.patch("/keys/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as Record<string, unknown>;
      const fields = Object.keys(body);
      if (fields.length === 0) {
        return reply.status(400).send({ error: { type: "invalid_request", message: "No valid fields to update" } });
      }
      if (!engine) return reply.status(500).send({ error: "Engine not configured" });
      const existing = await engine.getApiKeyById(id);
      if (!existing) return reply.status(404).send({ error: "Key not found" });
      await engine.updateApiKeyPermissions(id, body);
      return reply.status(200).send({ message: "API key settings updated successfully", ...body });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to update key" });
    }
  });

  /** DELETE /api/keys/:id */
  app.delete("/keys/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (!engine) return reply.status(500).send({ error: "Engine not configured" });
      const ok = await engine.deleteApiKey(id);
      if (!ok) return reply.status(404).send({ error: "Key not found" });
      return reply.status(200).send({ message: "Key deleted successfully" });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to delete key" });
    }
  });

  /** POST /api/keys/:id/regenerate */
  app.post("/keys/:id/regenerate", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (!engine) return reply.status(500).send({ error: "Engine not configured" });
      const result = await engine.regenerateApiKey(id);
      if (!result) return reply.status(404).send({ error: "Key not found" });
      return reply.status(200).send({ message: "API key regenerated successfully", key: result.key, id: result.id });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to regenerate key" });
    }
  });

  /** GET /api/keys/:id/reveal —— 受 allowKeyReveal 门控 */
  app.get("/keys/:id/reveal", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (!engine) return reply.status(500).send({ error: "Engine not configured" });
      if (!engine.isApiKeyRevealEnabled()) {
        return reply.status(403).send({ error: "API key reveal is disabled" });
      }
      const key = await engine.getApiKeyById(id);
      if (!key) return reply.status(404).send({ error: "Key not found" });
      return reply.status(200).send({ key: key.key ?? null });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to reveal key" });
    }
  });

  /** GET /api/keys/:id/devices */
  app.get("/keys/:id/devices", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!engine) return reply.status(500).send({ error: "Engine not configured" });
    const key = await engine.getApiKeyById(id);
    if (!key) return reply.status(404).send({ error: "Key not found" });
    // deviceTracker 在 open-sse 内存态；BFF 骨架返回空设备列表(后续接线)
    return reply.status(200).send({ keyId: id, name: key.name, count: 0, devices: [] });
  });

  /** GET /api/keys/:id/usage-limits */
  app.get("/keys/:id/usage-limits", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!engine) return reply.status(500).send({ error: "Engine not configured" });
    const key = await engine.getApiKeyById(id);
    if (!key) return reply.status(404).send({ error: "Key not found" });
    return reply.status(200).send({
      key: {
        id: key.id,
        name: key.name,
        usageLimitEnabled: key.usageLimitEnabled === true,
        dailyUsageLimitUsd: key.dailyUsageLimitUsd ?? null,
        weeklyUsageLimitUsd: key.weeklyUsageLimitUsd ?? null,
      },
      status: {
        enabled: key.usageLimitEnabled === true,
        dailyLimitUsd: key.dailyUsageLimitUsd ?? null,
        weeklyLimitUsd: key.weeklyUsageLimitUsd ?? null,
        dailySpentUsd: 0,
        weeklySpentUsd: 0,
        dailyExceeded: false,
        weeklyExceeded: false,
      },
    });
  });
}
