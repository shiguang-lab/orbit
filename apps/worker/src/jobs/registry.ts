/** Worker-owned lazy task manifest with statically auditable imports. */
export interface WorkerJob {
  name: string;
  mode: "call";
  loadModule: () => Promise<unknown>;
  exportName: string;
  stopExportName?: string;
}

export const WORKER_JOBS: readonly WorkerJob[] = [
  { name: "cloud-sync-and-job-registry", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/worker/cloud-sync"), exportName: "ensureCloudSyncInitialized" },
  { name: "model-sync", mode: "call", loadModule: () => import("./model-sync-scheduler.js"), exportName: "startModelSyncScheduler", stopExportName: "stopModelSyncScheduler" },
  { name: "quota-cache-refresh", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/quota/cache-lifecycle"), exportName: "startBackgroundRefresh", stopExportName: "stopBackgroundRefresh" },
  { name: "spend-batch-writer", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/worker/spend-batch-writer"), exportName: "startSpendBatchWriter", stopExportName: "stopSpendBatchWriter" },
  { name: "quota-auto-ping", mode: "call", loadModule: () => import("./quota-auto-ping.js"), exportName: "startQuotaAutoPing", stopExportName: "stopQuotaAutoPing" },
  { name: "connection-recovery", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/worker/connection-recovery-lifecycle"), exportName: "initConnectionRecoveryScheduler", stopExportName: "stopConnectionRecoveryScheduler" },
  { name: "radar-sync", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/worker/radar-scheduler"), exportName: "initRadarSyncScheduler", stopExportName: "stopRadarSyncScheduler" },
  { name: "models-dev-sync", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/worker/model-sync"), exportName: "startPeriodicSync", stopExportName: "stopPeriodicSync" },
  { name: "pricing-sync", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/worker/pricing-sync"), exportName: "startPeriodicSync", stopExportName: "stopPeriodicSync" },
  { name: "cleanup", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/worker/database-cleanup"), exportName: "startCleanupScheduler", stopExportName: "stopCleanupScheduler" },
  { name: "warmup", mode: "call", loadModule: () => import("./warmup.js"), exportName: "startWarmupScheduler", stopExportName: "stopWarmupScheduler" },
  { name: "provider-limits", mode: "call", loadModule: () => import("./provider-limits-sync.js"), exportName: "startProviderLimitsSyncScheduler", stopExportName: "stopProviderLimitsSyncScheduler" },
  { name: "subscription", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/worker/proxy-subscription"), exportName: "startSubscriptionScheduler", stopExportName: "stopSubscriptionScheduler" },
  { name: "session-affinity-cleanup", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/session-affinity/cleanup-lifecycle"), exportName: "startSessionAccountAffinityCleanup", stopExportName: "stopSessionAccountAffinityCleanupForTests" },
  { name: "credential-health", mode: "call", loadModule: () => import("./credential-health.js"), exportName: "initCredentialHealthCheck", stopExportName: "stopCredentialHealthCheck" },
  { name: "vacuum-scheduler", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/worker/database-vacuum"), exportName: "initVacuumScheduler", stopExportName: "stop" },
  { name: "audit-log", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/compliance/lifecycle"), exportName: "initAuditLog" },
  { name: "audit-log-retention", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/compliance/lifecycle"), exportName: "cleanupExpiredLogs" },
  { name: "memory-backends", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/worker/memory"), exportName: "initMemoryBackends" },
  { name: "conductor-bridge", mode: "call", loadModule: () => import("./conductor-bridge.js"), exportName: "initConductorBridge", stopExportName: "stopConductorBridge" },
  { name: "arena-elo-sync", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/worker/arena-elo-sync"), exportName: "initArenaEloSync", stopExportName: "stopArenaEloSync" },
  { name: "openrouter-provider-stats", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/worker/openrouter-provider-stats"), exportName: "initOpenRouterProviderStatsSync", stopExportName: "stopOpenRouterProviderStatsSync" },
  { name: "context-window-reconcile", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/worker/context-window"), exportName: "startContextWindowReconcile", stopExportName: "stopContextWindowReconcile" },
  { name: "memory-decay", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/worker/typed-memory-decay"), exportName: "startMemoryDecaySweep", stopExportName: "stopMemoryDecaySweep" },
  { name: "runtime-config-hot-reload", mode: "call", loadModule: () => import("@shiguang-gateway/core-domain/worker/config-hot-reload"), exportName: "startRuntimeConfigHotReload", stopExportName: "stopRuntimeConfigHotReloadForTests" },
  { name: "reasoning-cache-cleanup", mode: "call", loadModule: () => import("./reasoning-cache-cleanup.js"), exportName: "startReasoningCacheCleanupJob", stopExportName: "stopReasoningCacheCleanupJob" },
  { name: "backup-schedule", mode: "call", loadModule: () => import("./backup-schedule.js"), exportName: "startBackupScheduleJob", stopExportName: "stopBackupScheduleJob" },
  { name: "proxy-health", mode: "call", loadModule: () => import("./proxy-health.js"), exportName: "startProxyHealthCheck", stopExportName: "stopProxyHealthCheck" },
  { name: "free-proxy-auto-sync", mode: "call", loadModule: () => import("./free-proxy-scheduler.js"), exportName: "startFreeProxyAutoSync", stopExportName: "stopFreeProxyAutoSync" },
  { name: "batch-processor", mode: "call", loadModule: () => import("./batch-processor.js"), exportName: "initBatchProcessor", stopExportName: "stopBatchProcessor" },
  { name: "auto-refresh-daemon", mode: "call", loadModule: () => import("./auto-refresh-daemon.js"), exportName: "startAutoRefreshDaemon", stopExportName: "stopAutoRefreshDaemon" },
];
