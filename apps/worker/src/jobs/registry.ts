/**
 * Worker-owned task boundary.
 *
 * The domain package exports implementations, while this registry defines
 * which implementations belong to this deployment and how they are started.
 * Keeping the manifest in the app prevents control/edge processes from
 * accidentally inheriting background schedulers.
 */
export interface WorkerJob {
  name: string;
  mode: "call";
  modulePath: string;
  exportName: string;
  stopExportName?: string;
}

const domainModule = (path: string) =>
  `@shiguang-gateway/core-domain/worker/${path}.ts`;
export const WORKER_JOBS: readonly WorkerJob[] = [
  { name: "cloud-sync-and-job-registry", mode: "call", modulePath: domainModule("lib/initCloudSync"), exportName: "ensureCloudSyncInitialized" },
  { name: "quota-cache-refresh", mode: "call", modulePath: domainModule("domain/quotaCache"), exportName: "startBackgroundRefresh", stopExportName: "stopBackgroundRefresh" },
  { name: "spend-batch-writer", mode: "call", modulePath: domainModule("lib/spend/batchWriter"), exportName: "startSpendBatchWriter", stopExportName: "stopSpendBatchWriter" },
  { name: "quota-auto-ping", mode: "call", modulePath: "./quota-auto-ping.js", exportName: "startQuotaAutoPing", stopExportName: "stopQuotaAutoPing" },
  { name: "connection-recovery", mode: "call", modulePath: domainModule("lib/quota/connectionRecovery"), exportName: "initConnectionRecoveryScheduler", stopExportName: "stopConnectionRecoveryScheduler" },
  { name: "radar-sync", mode: "call", modulePath: domainModule("lib/radar/scheduler"), exportName: "initRadarSyncScheduler", stopExportName: "stopRadarSyncScheduler" },
  { name: "models-dev-sync", mode: "call", modulePath: domainModule("lib/modelsDevSync"), exportName: "startPeriodicSync", stopExportName: "stopPeriodicSync" },
  { name: "pricing-sync", mode: "call", modulePath: domainModule("lib/pricingSync"), exportName: "startPeriodicSync", stopExportName: "stopPeriodicSync" },
  { name: "cleanup", mode: "call", modulePath: domainModule("lib/db/cleanup"), exportName: "startCleanupScheduler", stopExportName: "stopCleanupScheduler" },
  { name: "warmup", mode: "call", modulePath: "./warmup.js", exportName: "startWarmupScheduler", stopExportName: "stopWarmupScheduler" },
  { name: "provider-limits", mode: "call", modulePath: "./provider-limits-sync.js", exportName: "startProviderLimitsSyncScheduler", stopExportName: "stopProviderLimitsSyncScheduler" },
  { name: "subscription", mode: "call", modulePath: domainModule("lib/proxySubscription/subscriptionService"), exportName: "startSubscriptionScheduler", stopExportName: "stopSubscriptionScheduler" },
  { name: "session-affinity-cleanup", mode: "call", modulePath: domainModule("lib/db/sessionAccountAffinity"), exportName: "startSessionAccountAffinityCleanup", stopExportName: "stopSessionAccountAffinityCleanupForTests" },
  { name: "credential-health", mode: "call", modulePath: "./credential-health.js", exportName: "initCredentialHealthCheck", stopExportName: "stopCredentialHealthCheck" },
  { name: "vacuum-scheduler", mode: "call", modulePath: domainModule("lib/db/vacuumScheduler"), exportName: "initVacuumScheduler", stopExportName: "stop" },
  { name: "audit-log", mode: "call", modulePath: domainModule("lib/compliance/index"), exportName: "initAuditLog" },
  { name: "audit-log-retention", mode: "call", modulePath: domainModule("lib/compliance/index"), exportName: "cleanupExpiredLogs" },
  { name: "memory-backends", mode: "call", modulePath: domainModule("lib/memory/index"), exportName: "initMemoryBackends" },
  { name: "conductor-bridge", mode: "call", modulePath: "./conductor-bridge.js", exportName: "initConductorBridge", stopExportName: "stopConductorBridge" },
  { name: "arena-elo-sync", mode: "call", modulePath: domainModule("lib/arenaEloSync"), exportName: "initArenaEloSync", stopExportName: "stopArenaEloSync" },
  { name: "openrouter-provider-stats", mode: "call", modulePath: domainModule("lib/catalog/openrouterProviderStats"), exportName: "initOpenRouterProviderStatsSync", stopExportName: "stopOpenRouterProviderStatsSync" },
  { name: "context-window-reconcile", mode: "call", modulePath: domainModule("lib/contextWindowResolver"), exportName: "startContextWindowReconcile", stopExportName: "stopContextWindowReconcile" },
  { name: "memory-decay", mode: "call", modulePath: domainModule("lib/memory/typedDecay"), exportName: "startMemoryDecaySweep", stopExportName: "stopMemoryDecaySweep" },
  { name: "runtime-config-hot-reload", mode: "call", modulePath: domainModule("lib/config/hotReload"), exportName: "startRuntimeConfigHotReload", stopExportName: "stopRuntimeConfigHotReloadForTests" },
  { name: "reasoning-cache-cleanup", mode: "call", modulePath: "./reasoning-cache-cleanup.js", exportName: "startReasoningCacheCleanupJob", stopExportName: "stopReasoningCacheCleanupJob" },
  { name: "backup-schedule", mode: "call", modulePath: "./backup-schedule.js", exportName: "startBackupScheduleJob", stopExportName: "stopBackupScheduleJob" },
  { name: "proxy-health", mode: "call", modulePath: "./proxy-health.js", exportName: "startProxyHealthCheck", stopExportName: "stopProxyHealthCheck" },
  { name: "free-proxy-auto-sync", mode: "call", modulePath: "./free-proxy-scheduler.js", exportName: "startFreeProxyAutoSync", stopExportName: "stopFreeProxyAutoSync" },
  { name: "batch-processor", mode: "call", modulePath: "./batch-processor.js", exportName: "initBatchProcessor", stopExportName: "stopBatchProcessor" },
  { name: "auto-refresh-daemon", mode: "call", modulePath: "./auto-refresh-daemon.js", exportName: "startAutoRefreshDaemon", stopExportName: "stopAutoRefreshDaemon" },
];
