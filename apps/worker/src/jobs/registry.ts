/**
 * Worker-owned task boundary.
 *
 * The domain package exports implementations, while this registry defines
 * which implementations belong to this deployment and how they are started.
 * Keeping the manifest in the app prevents control/edge processes from
 * accidentally inheriting background schedulers.
 */
export type WorkerJob =
  | { name: string; mode: "call"; modulePath: string; exportName: string }
  | { name: string; mode: "import"; modulePath: string };

const domainModule = (path: string) =>
  `@shiguang-gateway/core-domain/worker/${path}.ts`;
const sseModule = (path: string) =>
  `@shiguang-gateway/open-sse/${path}.ts`;

export const WORKER_JOBS: readonly WorkerJob[] = [
  { name: "cloud-sync-and-job-registry", mode: "call", modulePath: domainModule("lib/initCloudSync"), exportName: "ensureCloudSyncInitialized" },
  { name: "quota-cache-refresh", mode: "call", modulePath: domainModule("domain/quotaCache"), exportName: "startBackgroundRefresh" },
  { name: "spend-batch-writer", mode: "call", modulePath: domainModule("lib/spend/batchWriter"), exportName: "startSpendBatchWriter" },
  { name: "quota-auto-ping", mode: "call", modulePath: domainModule("lib/services/quotaAutoPing"), exportName: "startQuotaAutoPing" },
  { name: "connection-recovery", mode: "call", modulePath: domainModule("lib/quota/connectionRecovery"), exportName: "initConnectionRecoveryScheduler" },
  { name: "radar-sync", mode: "call", modulePath: domainModule("lib/radar/scheduler"), exportName: "initRadarSyncScheduler" },
  { name: "embedded-services", mode: "call", modulePath: domainModule("lib/services/bootstrap"), exportName: "bootstrapEmbeddedServices" },
  { name: "models-dev-sync", mode: "call", modulePath: domainModule("lib/modelsDevSync"), exportName: "startPeriodicSync" },
  { name: "pricing-sync", mode: "call", modulePath: domainModule("lib/pricingSync"), exportName: "startPeriodicSync" },
  { name: "cleanup", mode: "call", modulePath: domainModule("lib/db/cleanup"), exportName: "startCleanupScheduler" },
  { name: "warmup", mode: "call", modulePath: domainModule("lib/warmupScheduler"), exportName: "startWarmupScheduler" },
  { name: "provider-limits", mode: "call", modulePath: domainModule("shared/services/providerLimitsSyncScheduler"), exportName: "startProviderLimitsSyncScheduler" },
  { name: "subscription", mode: "call", modulePath: domainModule("lib/proxySubscription/subscriptionService"), exportName: "startSubscriptionScheduler" },
  { name: "session-affinity-cleanup", mode: "call", modulePath: domainModule("lib/db/sessionAccountAffinity"), exportName: "startSessionAccountAffinityCleanup" },
  { name: "credential-health", mode: "call", modulePath: domainModule("lib/credentialHealth/scheduler"), exportName: "initCredentialHealthCheck" },
  { name: "vacuum-scheduler", mode: "call", modulePath: domainModule("lib/db/vacuumScheduler"), exportName: "initVacuumScheduler" },
  { name: "audit-log", mode: "call", modulePath: domainModule("lib/compliance/index"), exportName: "initAuditLog" },
  { name: "audit-log-retention", mode: "call", modulePath: domainModule("lib/compliance/index"), exportName: "cleanupExpiredLogs" },
  { name: "memory-backends", mode: "call", modulePath: domainModule("lib/memory/index"), exportName: "initMemoryBackends" },
  { name: "embed-ws-proxy", mode: "call", modulePath: domainModule("lib/services/embedWsProxy"), exportName: "initEmbedWsProxy" },
  { name: "conductor-bridge", mode: "call", modulePath: domainModule("lib/conductor/boot"), exportName: "initConductorBridge" },
  { name: "arena-elo-sync", mode: "call", modulePath: domainModule("lib/arenaEloSync"), exportName: "initArenaEloSync" },
  { name: "openrouter-provider-stats", mode: "call", modulePath: domainModule("lib/catalog/openrouterProviderStats"), exportName: "initOpenRouterProviderStatsSync" },
  { name: "context-window-reconcile", mode: "call", modulePath: domainModule("lib/contextWindowResolver"), exportName: "startContextWindowReconcile" },
  { name: "memory-decay", mode: "call", modulePath: domainModule("lib/memory/typedDecay"), exportName: "startMemoryDecaySweep" },
  { name: "runtime-config-hot-reload", mode: "call", modulePath: domainModule("lib/config/hotReload"), exportName: "startRuntimeConfigHotReload" },
  { name: "reasoning-cache-cleanup", mode: "call", modulePath: domainModule("lib/jobs/reasoningCacheCleanupJob"), exportName: "startReasoningCacheCleanupJob" },
  { name: "backup-schedule", mode: "call", modulePath: domainModule("lib/jobs/backupScheduleJob"), exportName: "startBackupScheduleJob" },
  { name: "proxy-health", mode: "import", modulePath: domainModule("lib/proxyHealth/scheduler") },
  { name: "free-proxy-auto-sync", mode: "import", modulePath: domainModule("lib/freeProxyProviders/scheduler") },
  { name: "batch-processor", mode: "import", modulePath: "./batch-processor.js" },
  { name: "auto-refresh-daemon", mode: "import", modulePath: sseModule("services/autoRefreshDaemon") },
];
