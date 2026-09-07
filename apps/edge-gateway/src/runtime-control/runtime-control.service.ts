import { Injectable } from "@nestjs/common";
import type {
  EdgeRuntimeCommand,
  EdgeRuntimeHealthSnapshot,
} from "@shiguang-gateway/contracts/edge-runtime-command";
import { refreshResilienceRuntimeSettings } from "@shiguang-gateway/core-domain/resilience/settings-runtime";
import { refreshRequestRuntimeSettings } from "@shiguang-gateway/core-domain/runtime/settings-refresh";
import { LocalProviderHealthService } from "./local-provider-health.service.js";

const FALLBACK_QUOTA_MONITOR_SUMMARY = {
  active: 0,
  alerting: 0,
  exhausted: 0,
  errors: 0,
  statusCounts: { starting: 0, idle: 0, healthy: 0, warning: 0, exhausted: 0, error: 0 },
  byProvider: {},
};

function readValue<T>(label: string, reader: () => T, fallback: T): T {
  try {
    return reader();
  } catch (error) {
    console.warn(
      `[edge-runtime] ${label} unavailable:`,
      error instanceof Error ? error.message : error,
    );
    return fallback;
  }
}

async function readHealthSnapshot(
  localProviderHealth: LocalProviderHealthService,
): Promise<EdgeRuntimeHealthSnapshot> {
  const [
    circuitBreakerModule,
    rateLimitModule,
    accountFallbackModule,
    requestDedupModule,
    quotaMonitorModule,
    sessionManagerModule,
    credentialHealthModule,
    adaptiveAdmissionModule,
    chatAdmissionModule,
  ] = await Promise.all([
    import("@shiguang-gateway/core-domain/resilience/circuit-breaker"),
    import("@shiguang-gateway/open-sse/services/rateLimitManager"),
    import("@shiguang-gateway/open-sse/services/accountFallback"),
    import("@shiguang-gateway/open-sse/services/requestDedup"),
    import("@shiguang-gateway/open-sse/services/quotaMonitor"),
    import("@shiguang-gateway/open-sse/services/sessionManager"),
    import("@shiguang-gateway/core-domain/resilience/credential-health-cache"),
    import("@shiguang-gateway/open-sse/services/admission/runtime"),
    import("@shiguang-gateway/core-domain/shared/middleware/chatBodyAdmission"),
  ]);

  return {
    circuitBreakers: readValue(
      "circuit breakers",
      () => circuitBreakerModule.getAllCircuitBreakerStatuses(),
      [],
    ),
    rateLimitStatus: readValue("rate limits", () => rateLimitModule.getAllRateLimitStatus(), {}),
    learnedLimits: readValue("learned limits", () => rateLimitModule.getLearnedLimits(), {}),
    lockouts: readValue("model lockouts", () => accountFallbackModule.getAllModelLockouts(), []),
    inflightRequests: readValue("inflight requests", () => requestDedupModule.getInflightCount(), 0),
    quotaMonitorSummary: readValue(
      "quota monitor summary",
      () => quotaMonitorModule.getQuotaMonitorSummary(),
      FALLBACK_QUOTA_MONITOR_SUMMARY,
    ),
    quotaMonitorMonitors: readValue(
      "quota monitor snapshots",
      () => quotaMonitorModule.getQuotaMonitorSnapshots(),
      [],
    ),
    activeSessions: readValue("active sessions", () => sessionManagerModule.getActiveSessions(), []),
    activeSessionsByKey: readValue(
      "active sessions by key",
      () => sessionManagerModule.getAllActiveSessionCountsByKey(),
      {},
    ),
    credentialHealth: readValue(
      "credential health",
      () => credentialHealthModule.getCredentialHealthSummary(),
      undefined,
    ),
    adaptiveAdmission: readValue(
      "adaptive admission",
      () => adaptiveAdmissionModule.getAdaptiveAdmissionRuntime().snapshot(),
      null,
    ),
    chatAdmission: readValue(
      "chat admission",
      () => chatAdmissionModule.perConnectionAdmissionController.snapshot(),
      null,
    ),
    localProviders: localProviderHealth.getAllHealthStatuses(),
  };
}

@Injectable()
export class RuntimeControlService {
  constructor(private readonly localProviderHealth: LocalProviderHealthService) {}

  async execute(command: EdgeRuntimeCommand): Promise<unknown> {
    switch (command.command) {
      case "health.snapshot":
        return readHealthSnapshot(this.localProviderHealth);
      case "resilience.reset": {
        const { getAllCircuitBreakerStatuses, resetAllCircuitBreakers } = await import(
          "@shiguang-gateway/core-domain/resilience/circuit-breaker"
        );
        const { clearAllModelLockouts } = await import(
          "@shiguang-gateway/open-sse/services/accountFallback"
        );
        const resetCount = getAllCircuitBreakerStatuses().length;
        resetAllCircuitBreakers();
        clearAllModelLockouts();
        return { success: true, resetCount };
      }
      case "model-lockouts.list": {
        const { getAllModelLockouts } = await import(
          "@shiguang-gateway/open-sse/services/accountFallback"
        );
        return { items: getAllModelLockouts() };
      }
      case "sessions.snapshot": {
        const [sessions, pools] = await Promise.all([
          import("@shiguang-gateway/open-sse/services/sessionManager"),
          import("@shiguang-gateway/open-sse/services/webSessionPoolHealth"),
        ]);
        return {
          count: sessions.getActiveSessionCount(),
          sessions: sessions.getActiveSessions(),
          byApiKey: sessions.getAllActiveSessionCountsByKey(),
          exclusiveSessions: [],
          pools: pools.getWebSessionPoolHealth(command.provider),
        };
      }
      case "concurrency.snapshot": {
        const [rateLimits, semaphores] = await Promise.all([
          import("@shiguang-gateway/open-sse/services/rateLimitManager"),
          import("@shiguang-gateway/open-sse/services/accountSemaphore"),
        ]);
        return {
          timestamp: new Date().toISOString(),
          rateLimits: rateLimits.getAllRateLimitStatus(),
          semaphores: semaphores.getStats(),
        };
      }
      case "concurrency.reset": {
        const { resetAll } = await import("@shiguang-gateway/open-sse/services/accountSemaphore");
        resetAll();
        return { ok: true };
      }
      case "rate-limits.snapshot": {
        const [rateLimits, accountFallback, signatureCache] = await Promise.all([
          import("@shiguang-gateway/open-sse/services/rateLimitManager"),
          import("@shiguang-gateway/open-sse/services/accountFallback"),
          import("@shiguang-gateway/open-sse/services/signatureCache"),
        ]);
        return {
          statusByTarget: Object.fromEntries(command.targets.map(({ provider, connectionId }) => [
            `${provider}:${connectionId}`,
            rateLimits.getRateLimitStatus(provider, connectionId),
          ])),
          overview: rateLimits.getAllRateLimitStatus(),
          learnedLimits: rateLimits.getLearnedLimits(),
          lockouts: accountFallback.getAllModelLockouts(),
          cacheStats: signatureCache.getCacheStats(),
        };
      }
      case "rate-limits.toggle": {
        const rateLimits = await import("@shiguang-gateway/open-sse/services/rateLimitManager");
        if (command.enabled) rateLimits.enableRateLimitProtection(command.connectionId);
        else rateLimits.disableRateLimitProtection(command.connectionId);
        return { success: true };
      }
      case "provider-health.snapshot": {
        const [breakers, fallback, quota] = await Promise.all([
          import("@shiguang-gateway/core-domain/resilience/circuit-breaker"),
          import("@shiguang-gateway/open-sse/services/accountFallback"),
          import("@shiguang-gateway/open-sse/services/quotaMonitor"),
        ]);
        return {
          breakers: breakers.getAllCircuitBreakerStatuses(),
          lockouts: fallback.getAllModelLockouts(),
          quotaSnapshots: quota.getQuotaMonitorSnapshots(),
        };
      }
      case "provider-health.clear": {
        const { clearProviderFailure } = await import(
          "@shiguang-gateway/open-sse/services/accountFallback"
        );
        clearProviderFailure(command.provider);
        return { success: true };
      }
      case "provider-credentials.refresh": {
        const { refreshProviderConnectionCredentials } = await import(
          "./provider-credential-refresh.js"
        );
        return refreshProviderConnectionCredentials(command.connectionId, command.purpose);
      }
      case "codex-import.validate-refresh-token": {
        const { validateCodexImportRefreshToken } = await import(
          "./provider-credential-refresh.js"
        );
        return validateCodexImportRefreshToken(command.accessToken, command.refreshToken);
      }
      case "compression.verify": {
        const { executeCompressionVerify } = await import("./compression-verify.js");
        return executeCompressionVerify(command);
      }
      case "quota-windows.snapshot": {
        const { getAllProviderQuotaWindows } = await import(
          "@shiguang-gateway/open-sse/services/quotaPreflight"
        );
        return { windows: getAllProviderQuotaWindows() };
      }
      case "provider-limits.snapshot": {
        const limits = await import("@shiguang-gateway/open-sse/services/providerLimits");
        return {
          caches: await limits.getSanitizedCachedProviderLimitsMap(),
          intervalMinutes: limits.getProviderLimitsSyncIntervalMinutes(),
          lastAutoSyncAt: await limits.getLastProviderLimitsAutoSyncTime(),
        };
      }
      case "provider-limits.refresh-all": {
        const limits = await import("@shiguang-gateway/open-sse/services/providerLimits");
        try {
          const result = await limits.syncAllProviderLimits({ source: "manual" });
          return {
            ok: true,
            value: {
              ...result,
              caches: await limits.getSanitizedCachedProviderLimitsMap(),
              intervalMinutes: limits.getProviderLimitsSyncIntervalMinutes(),
              lastAutoSyncAt: await limits.getLastProviderLimitsAutoSyncTime(),
            },
          };
        } catch {
          return { ok: false, status: 500, message: "Failed to refresh provider limits" };
        }
      }
      case "provider-limits.refresh-connection": {
        const limits = await import("@shiguang-gateway/open-sse/services/providerLimits");
        try {
          const { usage } = await limits.fetchAndPersistProviderLimits(
            command.connectionId,
            "manual",
            { allowRotatingRefresh: true },
          );
          return { ok: true, value: usage };
        } catch (error) {
          const status =
            typeof (error as { status?: unknown })?.status === "number"
              ? (error as { status: number }).status
              : 500;
          return {
            ok: false,
            status,
            message: (error as Error)?.message || "Failed to fetch usage",
          };
        }
      }
      case "codex-reset-credits.list": {
        const resetCredits = await import(
          "@shiguang-gateway/open-sse/services/codexResetCredits"
        );
        try {
          return {
            ok: true,
            value: await resetCredits.listCodexResetCredits(command.connectionId),
          };
        } catch (error) {
          const typed = error instanceof resetCredits.CodexResetCreditError;
          return {
            ok: false,
            status: typed ? error.status : 500,
            code: typed ? error.code : "codex_reset_credit_failed",
            message:
              typed && error.message
                ? error.message
                : "Codex reset-credit request failed.",
          };
        }
      }
      case "codex-reset-credits.consume": {
        const resetCredits = await import(
          "@shiguang-gateway/open-sse/services/codexResetCredits"
        );
        try {
          return {
            ok: true,
            value: await resetCredits.consumeCodexResetCredit(
              command.connectionId,
              command.idempotencyKey,
              command.creditId,
            ),
          };
        } catch (error) {
          const typed = error instanceof resetCredits.CodexResetCreditError;
          return {
            ok: false,
            status: typed ? error.status : 500,
            code: typed ? error.code : "codex_reset_credit_failed",
            message:
              typed && error.message
                ? error.message
                : "Codex reset-credit request failed.",
          };
        }
      }
      case "key-devices.snapshot": {
        const devices = await import("@shiguang-gateway/open-sse/services/deviceTracker");
        return {
          count: devices.getDeviceCount(command.apiKeyId),
          devices: devices.getDeviceDetails(command.apiKeyId),
        };
      }
      case "combo-metrics.snapshot": {
        const metrics = await import("@shiguang-gateway/open-sse/services/comboMetrics");
        return {
          metrics: command.combo
            ? metrics.getComboMetrics(command.combo)
            : metrics.getAllComboMetrics(),
        };
      }
      case "combo-metrics.reset": {
        const metrics = await import("@shiguang-gateway/open-sse/services/comboMetrics");
        if (command.combo) metrics.resetComboMetrics(command.combo);
        else metrics.resetAllComboMetrics();
        return { success: true };
      }
      case "provider-diversity.snapshot": {
        const { getDiversityReport } = await import(
          "@shiguang-gateway/open-sse/services/autoCombo/providerDiversity"
        );
        return getDiversityReport();
      }
      case "auto-combos.snapshot": {
        const { projectAutoComboTemplates } = await import("./auto-combo-projection.js");
        return projectAutoComboTemplates();
      }
      case "auto-combos.materialize": {
        const { materializeAutoComboTemplate } = await import("./auto-combo-projection.js");
        return materializeAutoComboTemplate(command.name);
      }
      case "combo-trace.get": {
        const { getComboTrace } = await import(
          "@shiguang-gateway/open-sse/services/combo/decisionTrace"
        );
        return { trace: getComboTrace(command.invocationId) };
      }
      case "tool-latency.snapshot": {
        const { getToolLatencyByProvider } = await import(
          "@shiguang-gateway/open-sse/services/toolLatencyTracker"
        );
        return { providers: getToolLatencyByProvider() };
      }
      case "search-cache.snapshot": {
        const { getCacheStats } = await import(
          "@shiguang-gateway/open-sse/services/searchCache"
        );
        return getCacheStats();
      }
      case "semantic-cache.snapshot": {
        const cache = await import("@shiguang-gateway/core-domain/cache/services");
        return {
          cacheStats: cache.getCacheStats(),
          memoryStats: cache.getMemoryCacheStats(),
        };
      }
      case "semantic-cache.invalidate": {
        const cache = await import("@shiguang-gateway/core-domain/cache/services");
        switch (command.operation.scope) {
          case "model": {
            const removed = cache.invalidateByModel(command.operation.model);
            return {
              ok: true,
              invalidated: removed,
              scope: "model",
              model: command.operation.model,
            };
          }
          case "signature": {
            const removed = cache.invalidateBySignature(command.operation.signature);
            return { ok: true, invalidated: removed ? 1 : 0, scope: "signature" };
          }
          case "stale": {
            const removed = cache.invalidateStale(command.operation.maxAgeMs);
            return {
              ok: true,
              invalidated: removed,
              scope: "stale",
              maxAgeMs: command.operation.maxAgeMs,
            };
          }
          case "memory":
            cache.clearMemoryCache();
            return { success: true, message: "Cache cleared" };
          case "all": {
            const cleared = cache.clearCache();
            return { ok: true, cleared, scope: "all" };
          }
        }
      }
      case "proxy-logs.list": {
        const { getProxyLogs } = await import(
          "@shiguang-gateway/core-domain/logging/proxy-logs"
        );
        return { logs: getProxyLogs(command.filters) };
      }
      case "proxy-logs.record": {
        const { logProxyEvent } = await import(
          "@shiguang-gateway/core-domain/logging/proxy-logs"
        );
        return { log: logProxyEvent(command.entry) };
      }
      case "proxy-logs.clear": {
        const { clearProxyLogs } = await import(
          "@shiguang-gateway/core-domain/logging/proxy-logs"
        );
        clearProxyLogs();
        return { cleared: true };
      }
      case "memory.list": {
        const memory = await import("@shiguang-gateway/open-sse/services/memoryRuntime");
        const filters = command.filters as Parameters<typeof memory.memoryManager.list>[0];
        const result = await memory.memoryManager.list(filters);
        const tokensUsed = memory.getMemoryTokensUsed(command.filters.apiKeyId);
        const cacheStats = memory.memoryCache.stats();
        const totalCacheRequests = cacheStats.hits + cacheStats.misses;
        return {
          result,
          stats: {
            total: result.total,
            byType: result.byType ?? {},
            tokensUsed,
            hitRate: totalCacheRequests > 0 ? cacheStats.hits / totalCacheRequests : 0,
            cacheStats: { hits: cacheStats.hits, misses: cacheStats.misses },
          },
        };
      }
      case "memory.create": {
        const memory = await import("@shiguang-gateway/open-sse/services/memoryRuntime");
        const input = {
          ...command.input,
          expiresAt: command.input.expiresAt ? new Date(command.input.expiresAt) : null,
        } as Parameters<typeof memory.memoryManager.create>[0];
        return { memory: await memory.memoryManager.create(input) };
      }
      case "memory.search": {
        const memory = await import("@shiguang-gateway/open-sse/services/memoryRuntime");
        const settings = await memory.getMemorySettings().catch(() => memory.DEFAULT_MEMORY_SETTINGS);
        const config = {
          ...memory.toMemoryRetrievalConfig(settings, { query: command.query }),
          enabled: true,
          maxTokens: command.maxTokens ?? (
            settings.enabled ? settings.maxTokens : memory.DEFAULT_MEMORY_SETTINGS.maxTokens
          ),
        };
        const retrieved = await memory.retrieveMemories(command.apiKeyId, config);
        const filtered = command.type
          ? retrieved.filter((item) => item.type === command.type)
          : retrieved;
        const items = command.limit ? filtered.slice(0, command.limit) : filtered;
        return {
          memories: items,
          count: items.length,
          totalTokens: items.reduce((sum, item) => sum + Math.ceil(item.content.length / 4), 0),
        };
      }
      case "memory.clear": {
        const memory = await import("@shiguang-gateway/open-sse/services/memoryRuntime");
        const typeByCommand = {
          factual: memory.MemoryType.FACTUAL,
          episodic: memory.MemoryType.EPISODIC,
          procedural: memory.MemoryType.PROCEDURAL,
          semantic: memory.MemoryType.SEMANTIC,
        } as const;
        const listed = await memory.listMemories({
          apiKeyId: command.apiKeyId,
          type: command.type ? typeByCommand[command.type] : undefined,
        });
        const existing = Array.isArray(listed)
          ? listed
          : Array.isArray(listed?.data)
            ? listed.data
            : [];
        const cutoff = command.olderThan ? new Date(command.olderThan) : null;
        const targets = cutoff
          ? existing.filter((item) => new Date(item.createdAt) < cutoff)
          : existing;
        let deletedCount = 0;
        for (const item of targets) {
          if (await memory.deleteMemory(item.id)) deletedCount++;
        }
        return { deletedCount };
      }
      case "memory.get": {
        const { memoryManager } = await import(
          "@shiguang-gateway/open-sse/services/memoryRuntime"
        );
        return { memory: await memoryManager.get(command.id) };
      }
      case "memory.update": {
        const { memoryManager } = await import(
          "@shiguang-gateway/open-sse/services/memoryRuntime"
        );
        const input = command.input as Parameters<typeof memoryManager.update>[1];
        return { updated: await memoryManager.update(command.id, input) };
      }
      case "memory.delete": {
        const { memoryManager } = await import(
          "@shiguang-gateway/open-sse/services/memoryRuntime"
        );
        return { deleted: await memoryManager.delete(command.id) };
      }
      case "memory.embedding-providers": {
        const { listEmbeddingProviders } = await import(
          "@shiguang-gateway/open-sse/services/memoryRuntime"
        );
        return { providers: await listEmbeddingProviders() };
      }
      case "memory.engine-status": {
        const { engineStatus } = await import(
          "@shiguang-gateway/open-sse/services/memoryRuntime"
        );
        return engineStatus();
      }
      case "memory.health": {
        const { verifyExtractionPipeline } = await import(
          "@shiguang-gateway/open-sse/services/memoryRuntime"
        );
        return verifyExtractionPipeline("health-check");
      }
      case "memory.retrieve-preview": {
        const { retrievePreview } = await import(
          "@shiguang-gateway/open-sse/services/memoryRuntime"
        );
        return retrievePreview(command.apiKeyId, command.query, {
          strategy: command.strategy,
          maxTokens: command.maxTokens,
          limit: command.limit,
        });
      }
      case "memory.summarize": {
        const { summarizeMemoriesOlderThan } = await import(
          "@shiguang-gateway/open-sse/services/memoryRuntime"
        );
        return summarizeMemoriesOlderThan(
          command.apiKeyId,
          command.olderThanDays,
          command.dryRun
        );
      }
      case "memory.reindex": {
        const memory = await import("@shiguang-gateway/open-sse/services/memoryRuntime");
        if (command.force) memory.markAllMemoriesNeedReindex();
        const pending = memory.getReindexPending();
        setImmediate(() => {
          memory.runReindexBatch(100).catch((error: unknown) => {
            console.error("memory.reindex.background.fail", error);
          });
        });
        return { started: true, pending };
      }
      case "memory.decay": {
        const { sweepDecayedMemories } = await import(
          "@shiguang-gateway/core-domain/edge/memory-decay"
        );
        return sweepDecayedMemories();
      }
      case "memory.retention-cleanup": {
        const { cleanupMemoryEntriesByRetention } = await import(
          "@shiguang-gateway/core-domain/edge/memory-decay"
        );
        return cleanupMemoryEntriesByRetention();
      }
      case "reasoning-cache.snapshot": {
        const cache = await import("@shiguang-gateway/open-sse/services/reasoningCache");
        return {
          stats: cache.getReasoningCacheServiceStats(),
          entries: cache.getReasoningCacheServiceEntries({
            limit: command.limit,
            offset: command.offset,
            provider: command.provider,
            model: command.model,
          }),
        };
      }
      case "reasoning-cache.delete": {
        const cache = await import("@shiguang-gateway/open-sse/services/reasoningCache");
        if (command.toolCallId) {
          return {
            ok: true,
            cleared: cache.deleteReasoningCacheEntry(command.toolCallId),
            scope: "toolCallId",
            toolCallId: command.toolCallId,
          };
        }
        return {
          ok: true,
          cleared: cache.clearReasoningCacheAll(command.provider),
          scope: command.provider ? "provider" : "all",
          ...(command.provider ? { provider: command.provider } : {}),
        };
      }
      case "connection-rate-limits.refresh": {
        const rateLimits = await import("@shiguang-gateway/open-sse/services/rateLimitManager");
        rateLimits.refreshConnectionRateLimits(command.connectionId, command.overrides);
        if (command.enabled) rateLimits.enableRateLimitProtection(command.connectionId);
        else rateLimits.disableRateLimitProtection(command.connectionId);
        return { success: true };
      }
      case "runtime-cache.invalidate": {
        if (command.target === "proxy-dispatcher") {
          const { clearDispatcherCache } = await import(
            "@shiguang-gateway/open-sse/utils/proxyDispatcher"
          );
          clearDispatcherCache();
        } else {
          const { clearCliproxyapiUrlCache } = await import(
            "@shiguang-gateway/open-sse/executors/cliproxyapi"
          );
          clearCliproxyapiUrlCache();
        }
        return { success: true };
      }
      case "model-aliases.snapshot": {
        const aliases = await import("@shiguang-gateway/open-sse/services/modelDeprecation");
        return {
          builtIn: aliases.getBuiltInAliases(),
          custom: aliases.getCustomAliases(),
          all: aliases.getAllAliases(),
        };
      }
      case "model-access.classify": {
        const { classifyPaidModelTarget } = await import(
          "@shiguang-gateway/provider-catalog/free-model-catalog"
        );
        return {
          paidTargets: command.targets.filter(
            (target) => classifyPaidModelTarget(target) === "paid",
          ),
        };
      }
      case "background-degradation.snapshot": {
        const runtime = await import("@shiguang-gateway/open-sse/services/backgroundTaskDetector");
        return runtime.getBackgroundDegradationConfig();
      }
      case "background-degradation.reset-stats": {
        const runtime = await import("@shiguang-gateway/open-sse/services/backgroundTaskDetector");
        runtime.resetStats();
        return { success: true, stats: runtime.getBackgroundDegradationConfig().stats };
      }
      case "payload-rules.snapshot": {
        const runtime = await import("@shiguang-gateway/open-sse/services/payloadRules");
        return runtime.getPayloadRulesConfig();
      }
      case "task-routing.snapshot": {
        const runtime = await import("@shiguang-gateway/open-sse/services/taskAwareRouter");
        return {
          ...runtime.getTaskRoutingConfig(),
          defaultTaskModelMap: runtime.getDefaultTaskModelMap(),
          defaultTaskPatterns: runtime.getDefaultTaskPatterns(),
        };
      }
      case "task-routing.reset-stats": {
        const runtime = await import("@shiguang-gateway/open-sse/services/taskAwareRouter");
        runtime.resetTaskRoutingStats();
        return { success: true, stats: runtime.getTaskRoutingConfig().stats };
      }
      case "task-routing.detect": {
        const runtime = await import("@shiguang-gateway/open-sse/services/taskAwareRouter");
        const taskType = runtime.detectTaskType(command.body);
        const config = runtime.getTaskRoutingConfig();
        return { taskType, preferredModel: config.taskModelMap[taskType] || "(no override)" };
      }
      case "ip-filter.snapshot": {
        const runtime = await import("@shiguang-gateway/open-sse/services/ipFilter");
        return runtime.getIPFilterConfig();
      }
      case "ip-filter.temp-ban": {
        const runtime = await import("@shiguang-gateway/open-sse/services/ipFilter");
        runtime.tempBanIP(command.ip, command.durationMs, command.reason);
        return runtime.getIPFilterConfig();
      }
      case "ip-filter.remove-temp-ban": {
        const runtime = await import("@shiguang-gateway/open-sse/services/ipFilter");
        runtime.removeTempBan(command.ip);
        return runtime.getIPFilterConfig();
      }
      case "tier-config.apply": {
        const [{ loadTierConfig }, runtime] = await Promise.all([
          import("@shiguang-gateway/core-domain/db/tier-config"),
          import("@shiguang-gateway/open-sse/services/tier-resolver"),
        ]);
        const config = loadTierConfig();
        runtime.setTierConfig(config);
        return config;
      }
      case "model-lockouts.clear": {
        const { clearModelLock, getAllModelLockouts } = await import(
          "@shiguang-gateway/open-sse/services/accountFallback"
        );
        const matches = getAllModelLockouts().filter((entry) =>
          command.all === true ||
          ((!command.provider || entry.provider === command.provider) &&
            (!command.connectionId || entry.connectionId === command.connectionId) &&
            (!command.model || entry.model === command.model))
        );
        let removed = 0;
        for (const entry of matches) {
          if (clearModelLock(entry.provider, entry.connectionId, entry.model)) removed += 1;
        }
        return { ok: true, removed, clearedAll: command.all === true };
      }
      case "runtime-settings.apply": {
        const result = await refreshResilienceRuntimeSettings({
          minimumRevision: command.minimumRevision,
          source: "control-api",
        });
        if (result.status === "stale") {
          throw new Error(
            `Persisted settings revision ${result.revision} is older than requested ${command.minimumRevision}`,
          );
        }
        await refreshRequestRuntimeSettings("control-api:settings-patch");
        return result;
      }
    }
  }
}
