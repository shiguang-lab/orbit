import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

export interface SettingsEngine {
  getSettings(): Promise<Record<string, unknown>>;
  updateSettings?(patch: Record<string, unknown>): Promise<Record<string, unknown>>;
  getCacheConfig?(): Promise<{ modelCatalogCacheTtlMs: number }>;
  updateCacheConfig?(modelCatalogCacheTtlMs: number): Promise<{ modelCatalogCacheTtlMs: number }>;
  getComboDefaults?(): Promise<{ comboDefaults?: Record<string, unknown>; providerOverrides?: Record<string, unknown> }>;
  getCompressionSettings?(): Promise<Record<string, unknown>>;
  // Storage & Database Backups
  listDbBackups?(): Promise<unknown[]>;
  createDbBackup?(): Promise<unknown>;
  restoreDbBackup?(backupFile: string): Promise<unknown>;
  cleanupDbBackups?(keepLatest?: number, retentionDays?: number): Promise<unknown>;
  getStorageHealth?(): Promise<Record<string, unknown>>;
  getDatabaseSettings?(): Promise<Record<string, unknown>>;
  updateDatabaseSettings?(patch: Record<string, unknown>): Promise<Record<string, unknown>>;
  vacuumDatabase?(): Promise<{ success: boolean; message?: string; duration?: number; error?: string }>;
  purgeLogs?(retentionDays?: number): Promise<{ deleted: number; deletedArtifacts?: number }>;
  purgeQuotaSnapshots?(): Promise<{ deleted: number }>;
  purgeCallLogs?(retentionDays?: number): Promise<{ deleted: number; deletedArtifacts?: number }>;
  purgeDetailedLogs?(retentionDays?: number): Promise<{ deleted: number }>;
  resetUsageHistory?(period: string): Promise<Record<string, unknown>>;
  exportJson?(): Promise<Record<string, unknown>>;
  importJson?(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  getFeatureFlags?(): Promise<Record<string, unknown>>;
  updateFeatureFlag?(key: string, value?: string): Promise<Record<string, unknown>>;
  clearFeatureFlagOverrides?(): Promise<Record<string, unknown>>;
  listAccessTokens?(): Promise<unknown[]>;
  createAccessToken?(input: { name: string; scope?: string; expiresInDays?: number }): Promise<Record<string, unknown>>;
  revokeAccessToken?(id: string): Promise<boolean>;
}

export interface SidebarSettingsResponse {
  hiddenSidebarItems: string[];
  sidebarSectionOrder: string[];
  sidebarItemOrder: Record<string, string[]>;
  sidebarActivePreset?: string;
  blockedProviders: string[];
  codexServiceTier?: unknown;
  showQuickStartOnHome?: boolean;
  showProviderTopologyOnHome?: boolean;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function stringMap(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, items]) => [key, stringList(items)]),
  );
}

export async function settingsRoutes(
  app: FastifyInstance,
  opts: { engine?: SettingsEngine } = {},
): Promise<void> {
  const cacheConfigUpdateSchema = z.object({
    modelCatalogCacheTtlMs: z.number().int().min(100).max(60000),
  });

  app.get("/settings/cache-config", async (_request, reply) => {
    try {
      if (!opts.engine?.getCacheConfig) {
        return reply.status(503).send({ error: "Cache settings engine is unavailable" });
      }
      return reply.status(200).send(await opts.engine.getCacheConfig());
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch cache settings" });
    }
  });

  app.put("/settings/cache-config", async (request, reply) => {
    const parsed = cacheConfigUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid cache settings" });
    }
    try {
      if (!opts.engine?.updateCacheConfig) {
        return reply.status(503).send({ error: "Cache settings engine is unavailable" });
      }
      const config = await opts.engine.updateCacheConfig(parsed.data.modelCatalogCacheTtlMs);
      return reply.status(200).send({ ok: true, ...config });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to save cache settings" });
    }
  });

  app.get("/settings/require-login", async (_request, reply) => {
    try {
      const settings = (opts.engine ? await opts.engine.getSettings() : {}) as any;
      const hasPassword =
        (typeof settings.password === "string" && settings.password.length > 0) ||
        Boolean(settings.managementPassword);
      return reply.status(200).send({
        authenticated: true,
        requireLogin: settings.requireLogin !== false,
        hasPassword,
        setupComplete: settings.setupComplete === true,
        oidcEnabled: settings.oidcEnabled === true,
        oidcDisablePasswordLogin: settings.oidcDisablePasswordLogin === true,
      });
    } catch {
      return reply.status(200).send({
        authenticated: false,
        requireLogin: true,
        hasPassword: true,
        setupComplete: true,
        oidcEnabled: false,
        oidcDisablePasswordLogin: false,
      });
    }
  });

  const sidebarSettings = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const settings = opts.engine ? await opts.engine.getSettings() : {};
      const response: SidebarSettingsResponse = {
        hiddenSidebarItems: stringList(settings.hiddenSidebarItems),
        sidebarSectionOrder: stringList(settings.sidebarSectionOrder),
        sidebarItemOrder: stringMap(settings.sidebarItemOrder),
        blockedProviders: stringList(settings.blockedProviders),
      };
      if (typeof settings.sidebarActivePreset === "string") {
        response.sidebarActivePreset = settings.sidebarActivePreset;
      }
      if (settings.codexServiceTier !== undefined || settings.codexFastServiceTier !== undefined) {
        response.codexServiceTier = settings.codexServiceTier ?? settings.codexFastServiceTier;
      }
      if (typeof settings.showQuickStartOnHome === "boolean") response.showQuickStartOnHome = settings.showQuickStartOnHome;
      if (typeof settings.showProviderTopologyOnHome === "boolean") response.showProviderTopologyOnHome = settings.showProviderTopologyOnHome;
      return reply.status(200).send(response);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch sidebar settings" });
    }
  };

  app.get("/settings/sidebar", sidebarSettings);

  // Full settings GET / PATCH
  app.get("/settings", async (request: FastifyRequest<{ Querystring: { sidebar?: string } }>, reply) => {
    if (request.query?.sidebar === "true") {
      return sidebarSettings(request, reply);
    }
    try {
      const settings = opts.engine ? await opts.engine.getSettings() : {};
      return reply.status(200).send(settings);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/settings", async (request, reply) => {
    try {
      if (!opts.engine?.updateSettings) {
        return reply.status(503).send({ error: "Settings update engine is unavailable" });
      }
      const updated = await opts.engine.updateSettings((request.body || {}) as Record<string, unknown>);
      return reply.status(200).send(updated);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to update settings" });
    }
  });

  // Storage Health
  app.get("/storage/health", async (_request, reply) => {
    try {
      if (opts.engine?.getStorageHealth) {
        return reply.status(200).send(await opts.engine.getStorageHealth());
      }
      return reply.status(200).send({ driver: "sqlite", dbPath: "~/storage.sqlite", sizeBytes: 0, backupCount: 0 });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch storage health" });
    }
  });

  // DB Backups
  app.get("/db-backups", async (_request, reply) => {
    try {
      const backups = opts.engine?.listDbBackups ? await opts.engine.listDbBackups() : [];
      return reply.status(200).send({ backups });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to list db backups" });
    }
  });

  app.put("/db-backups", async (_request, reply) => {
    try {
      if (!opts.engine?.createDbBackup) {
        return reply.status(503).send({ error: "Backup engine unavailable" });
      }
      const result = await opts.engine.createDbBackup();
      return reply.status(200).send({ created: true, result });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to create backup" });
    }
  });

  app.post("/db-backups", async (request: FastifyRequest<{ Body: { action?: string; backupFile?: string; filename?: string } }>, reply) => {
    try {
      const file = request.body?.backupFile || request.body?.filename;
      if (!file) return reply.status(400).send({ error: "Backup file name required" });
      if (!opts.engine?.restoreDbBackup) {
        return reply.status(503).send({ error: "Restore engine unavailable" });
      }
      const result = await opts.engine.restoreDbBackup(file);
      return reply.status(200).send({ restored: true, result });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to restore backup" });
    }
  });

  app.delete("/db-backups", async (request: FastifyRequest<{ Body: { keepLatest?: number; retentionDays?: number } }>, reply) => {
    try {
      if (!opts.engine?.cleanupDbBackups) {
        return reply.status(503).send({ error: "Cleanup engine unavailable" });
      }
      const result = await opts.engine.cleanupDbBackups(request.body?.keepLatest, request.body?.retentionDays);
      return reply.status(200).send({ cleaned: true, result });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to cleanup backups" });
    }
  });

  app.patch("/db-backups", async (request: FastifyRequest<{ Body: { keepLatest?: number; retentionDays?: number } }>, reply) => {
    try {
      const { keepLatest, retentionDays } = request.body || {};
      const dbBackup = await import("@/lib/db/backup");
      if (typeof keepLatest === "number") dbBackup.setDbBackupMaxFiles(keepLatest);
      if (typeof retentionDays === "number") dbBackup.setDbBackupRetentionDays(retentionDays);
      return reply.status(200).send({ success: true });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to update backup retention" });
    }
  });

  app.delete("/cache", async (_request, reply) => {
    try {
      const { invalidateDbCache } = await import("@/lib/db/readCache");
      invalidateDbCache();
      return reply.status(200).send({ success: true, cleared: true });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to clear cache" });
    }
  });

  // Database Settings & Retention
  app.get("/settings/database", async (_request, reply) => {
    try {
      if (opts.engine?.getDatabaseSettings) {
        return reply.status(200).send(await opts.engine.getDatabaseSettings());
      }
      return reply.status(200).send({});
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch database settings" });
    }
  });

  app.patch("/settings/database", async (request, reply) => {
    try {
      if (!opts.engine?.updateDatabaseSettings) {
        return reply.status(503).send({ error: "Database settings engine unavailable" });
      }
      const updated = await opts.engine.updateDatabaseSettings((request.body || {}) as Record<string, unknown>);
      return reply.status(200).send(updated);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to update database settings" });
    }
  });

  app.post("/settings/database/refresh-stats", async (_request, reply) => {
    try {
      const { getDatabaseStats } = await import("@/lib/db/stats");
      const stats = await getDatabaseStats();
      return reply.status(200).send({ success: true, stats });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to refresh database stats" });
    }
  });

  // Database Vacuum
  app.post("/settings/database/vacuum", async (_request, reply) => {
    try {
      if (!opts.engine?.vacuumDatabase) {
        return reply.status(503).send({ error: "Vacuum engine unavailable" });
      }
      const result = await opts.engine.vacuumDatabase();
      return reply.status(result.success ? 200 : 500).send(result);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to run vacuum" });
    }
  });

  // Log Purging Endpoints
  app.post("/settings/purge-logs", async (_request, reply) => {
    try {
      if (!opts.engine?.purgeLogs) return reply.status(200).send({ deleted: 0 });
      return reply.status(200).send(await opts.engine.purgeLogs());
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to purge logs" });
    }
  });

  app.post("/settings/purge-quota-snapshots", async (_request, reply) => {
    try {
      if (!opts.engine?.purgeQuotaSnapshots) return reply.status(200).send({ deleted: 0 });
      return reply.status(200).send(await opts.engine.purgeQuotaSnapshots());
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to purge quota snapshots" });
    }
  });

  app.post("/settings/purge-call-logs", async (_request, reply) => {
    try {
      if (!opts.engine?.purgeCallLogs) return reply.status(200).send({ deleted: 0 });
      return reply.status(200).send(await opts.engine.purgeCallLogs());
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to purge call logs" });
    }
  });

  app.post("/settings/purge-detailed-logs", async (_request, reply) => {
    try {
      if (!opts.engine?.purgeDetailedLogs) return reply.status(200).send({ deleted: 0 });
      return reply.status(200).send(await opts.engine.purgeDetailedLogs());
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to purge detailed logs" });
    }
  });

  app.post("/settings/purge-usage-history", async (request: FastifyRequest<{ Body: { period?: string } }>, reply) => {
    try {
      const period = request.body?.period || "all";
      if (!opts.engine?.resetUsageHistory) return reply.status(200).send({ deleted: 0 });
      const result = await opts.engine.resetUsageHistory(period);
      return reply.status(200).send(result);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to reset usage history" });
    }
  });

  // Export / Import JSON
  app.get("/settings/export-json", async (_request, reply) => {
    try {
      if (!opts.engine?.exportJson) return reply.status(503).send({ error: "Export engine unavailable" });
      const data = await opts.engine.exportJson();
      reply.header("Content-Disposition", `attachment; filename="omniroute-backup-${Date.now()}.json"`);
      return reply.status(200).send(data);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to export configuration" });
    }
  });

  app.post("/settings/import-json", async (request: FastifyRequest<{ Body: Record<string, unknown> }>, reply) => {
    try {
      if (!opts.engine?.importJson) return reply.status(503).send({ error: "Import engine unavailable" });
      const result = await opts.engine.importJson(request.body || {});
      return reply.status(200).send(result);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to import configuration" });
    }
  });

  app.get("/settings/combo-defaults", async (_request, reply) => {
    try {
      if (opts.engine?.getComboDefaults) {
        const defaults = await opts.engine.getComboDefaults();
        return reply.status(200).send(defaults);
      }
      return reply.status(200).send({
        comboDefaults: {
          strategy: "priority",
          maxRetries: 1,
          retryDelayMs: 2000,
          fallbackDelayMs: 0,
          handoffThreshold: 0.85,
          handoffModel: "",
          maxMessagesForSummary: 30,
          maxComboDepth: 3,
          trackMetrics: true,
          reasoningTokenBufferEnabled: true,
          zeroLatencyOptimizationsEnabled: false,
        },
        providerOverrides: {},
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch combo defaults" });
    }
  });

  app.get("/settings/compression", async (_request, reply) => {
    try {
      if (opts.engine?.getCompressionSettings) {
        const compression = await opts.engine.getCompressionSettings();
        return reply.status(200).send(compression);
      }
      return reply.status(200).send({ enabled: false });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch compression settings" });
    }
  });

  app.get("/settings/thinking-budget", async (_request, reply) => {
    try {
      const s = ((await opts.engine?.getSettings?.()) || {}) as any;
      return reply.status(200).send(
        s.thinkingBudget || { mode: "passthrough", customBudget: 10240, effortLevel: "medium" }
      );
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch thinking budget" });
    }
  });

  app.put("/settings/thinking-budget", async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      if (opts.engine?.updateSettings) {
        await opts.engine.updateSettings({ thinkingBudget: body });
      }
      return reply.status(200).send(body);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to update thinking budget" });
    }
  });

  app.get("/settings/system-prompt", async (_request, reply) => {
    try {
      const s = ((await opts.engine?.getSettings?.()) || {}) as any;
      return reply.status(200).send(
        s.systemPrompt || { mode: "passthrough", customPrompt: "" }
      );
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch system prompt" });
    }
  });

  app.put("/settings/system-prompt", async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      if (opts.engine?.updateSettings) {
        await opts.engine.updateSettings({ systemPrompt: body });
      }
      return reply.status(200).send(body);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to update system prompt" });
    }
  });

  app.get("/settings/payload-rules", async (_request, reply) => {
    try {
      const s = ((await opts.engine?.getSettings?.()) || {}) as any;
      return reply.status(200).send(
        s.payloadRules || { default: [], override: [], filter: [], defaultRaw: [] }
      );
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch payload rules" });
    }
  });

  app.put("/settings/payload-rules", async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      if (opts.engine?.updateSettings) {
        await opts.engine.updateSettings({ payloadRules: body });
      }
      return reply.status(200).send(body);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to update payload rules" });
    }
  });

  app.patch("/settings/require-login", async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      if (opts.engine?.updateSettings) {
        await opts.engine.updateSettings({ requireLogin: body.requireLogin });
      }
      return reply.status(200).send({ requireLogin: body.requireLogin });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to update require-login status" });
    }
  });

  app.get("/settings/ip-filter", async (_request, reply) => {
    try {
      const s = ((await opts.engine?.getSettings?.()) || {}) as any;
      return reply.status(200).send(
        s.ipFilter || {
          enabled: false,
          mode: "blacklist",
          whitelist: [],
          blacklist: [],
        }
      );
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch ip filter config" });
    }
  });

  app.put("/settings/ip-filter", async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      if (opts.engine?.updateSettings) {
        await opts.engine.updateSettings({ ipFilter: body });
      }
      return reply.status(200).send(body);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to update ip filter config" });
    }
  });

  app.post("/settings/password", async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      if (opts.engine?.updateSettings && body.password) {
        await opts.engine.updateSettings({ managementPassword: body.password });
      }
      return reply.status(200).send({ success: true });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to update password" });
    }
  });

  // Feature Flags
  app.get("/settings/feature-flags", async (_request, reply) => {
    try {
      if (!opts.engine?.getFeatureFlags) {
        return reply.status(200).send({ flags: [], summary: { total: 0, active: 0, inactive: 0, overriddenByDb: 0, overriddenByEnv: 0 } });
      }
      const data = await opts.engine.getFeatureFlags();
      return reply.status(200).send(data);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch feature flags" });
    }
  });

  app.put("/settings/feature-flags", async (request, reply) => {
    try {
      const body = (request.body || {}) as { key?: string; value?: string };
      if (!body.key) {
        return reply.status(400).send({ error: "Feature flag key is required" });
      }
      if (!opts.engine?.updateFeatureFlag) {
        return reply.status(500).send({ error: "Engine does not support feature flags" });
      }
      const updated = await opts.engine.updateFeatureFlag(body.key, body.value);
      return reply.status(200).send(updated);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: error instanceof Error ? error.message : "Failed to update feature flag" });
    }
  });

  app.delete("/settings/feature-flags", async (_request, reply) => {
    try {
      if (opts.engine?.clearFeatureFlagOverrides) {
        await opts.engine.clearFeatureFlagOverrides();
      }
      return reply.status(200).send({ success: true, message: "Cleared all overrides" });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to clear feature flags" });
    }
  });

  // CLI Access Tokens
  app.get("/cli/tokens", async (_request, reply) => {
    try {
      if (!opts.engine?.listAccessTokens) {
        return reply.status(200).send({ tokens: [] });
      }
      const tokens = await opts.engine.listAccessTokens();
      return reply.status(200).send({ tokens });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch access tokens" });
    }
  });

  app.post("/cli/tokens", async (request, reply) => {
    try {
      const body = (request.body || {}) as { name: string; scope?: string; expiresInDays?: number };
      if (!body.name?.trim()) {
        return reply.status(400).send({ error: "Access token name is required" });
      }
      if (!opts.engine?.createAccessToken) {
        return reply.status(500).send({ error: "Engine does not support access tokens" });
      }
      const result = await opts.engine.createAccessToken(body);
      return reply.status(200).send(result);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: error instanceof Error ? error.message : "Failed to create access token" });
    }
  });

  app.delete("/cli/tokens/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (!opts.engine?.revokeAccessToken) {
        return reply.status(500).send({ error: "Engine does not support access tokens" });
      }
      const revoked = await opts.engine.revokeAccessToken(id);
      return reply.status(200).send({ success: revoked });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to revoke access token" });
    }
  });

  app.delete("/cli/tokens", async (request, reply) => {
    try {
      const body = (request.body || {}) as { id?: string };
      if (!body.id) {
        return reply.status(400).send({ error: "Token id is required" });
      }
      if (!opts.engine?.revokeAccessToken) {
        return reply.status(500).send({ error: "Engine does not support access tokens" });
      }
      const revoked = await opts.engine.revokeAccessToken(body.id);
      return reply.status(200).send({ success: revoked });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to revoke access token" });
    }
  });
}
