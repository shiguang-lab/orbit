import { ensureSecrets } from "@shiguang-gateway/server-runtime/startup";

await ensureSecrets();
process.env.SHIGUANG_GATEWAY_MANAGED_LIVE_WS = "1";
// Worker jobs that call the local control plane must never fall back to the
// retired official/NAS endpoint. Compose sets this explicitly; the local
// default keeps a standalone `pnpm start:worker` self-contained as well.
process.env.SHIGUANG_GATEWAY_BASE_URL ??= process.env.INTERNAL_BASE_URL ??
  `http://${process.env.EDGE_GATEWAY_HOST === "0.0.0.0" ? "127.0.0.1" : (process.env.EDGE_GATEWAY_HOST ?? "127.0.0.1")}:${process.env.EDGE_GATEWAY_PORT ?? "8787"}`;
const log = (...args: unknown[]) => console.log("[worker]", ...args);
const started: string[] = [];
const optional = async (name: string, modulePath: string, exportName: string) => {
  try {
    const mod = await import(modulePath) as Record<string, unknown>;
    const fn = mod[exportName];
    if (typeof fn !== "function") throw new Error(`missing export ${exportName}`);
    await (fn as () => unknown)();
    started.push(name);
  } catch (error) {
    log(`failed to start ${name}:`, error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
};

// A number of background services are intentionally self-gated and
// auto-start when their module is imported (proxy health, free-proxy sync and
// credential health).  Keep those imports in the dedicated worker so the
// control/gateway HTTP processes remain stateless and every scheduled service
// has one well-defined owner in an independent deployment.
const importOnly = async (name: string, modulePath: string) => {
  try {
    await import(modulePath);
    started.push(name);
  } catch (error) {
    log(`failed to load ${name}:`, error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
};

await optional("cloud-sync-and-job-registry", "../../../packages/gateway-runtime/src/lib/initCloudSync.ts", "ensureCloudSyncInitialized");
await optional("quota-cache-refresh", "../../../packages/gateway-runtime/src/domain/quotaCache.ts", "startBackgroundRefresh");
await optional("spend-batch-writer", "../../../packages/gateway-runtime/src/lib/spend/batchWriter.ts", "startSpendBatchWriter");
await optional("quota-auto-ping", "../../../packages/gateway-runtime/src/lib/services/quotaAutoPing.ts", "startQuotaAutoPing");
await optional("connection-recovery", "../../../packages/gateway-runtime/src/lib/quota/connectionRecovery.ts", "initConnectionRecoveryScheduler");
await optional("radar-sync", "../../../packages/gateway-runtime/src/lib/radar/scheduler.ts", "initRadarSyncScheduler");
await optional("embedded-services", "../../../packages/gateway-runtime/src/lib/services/bootstrap.ts", "bootstrapEmbeddedServices");
await optional("models-dev-sync", "../../../packages/gateway-runtime/src/lib/modelsDevSync.ts", "startPeriodicSync");
await optional("pricing-sync", "../../../packages/gateway-runtime/src/lib/pricingSync.ts", "startPeriodicSync");
await optional("cleanup", "../../../packages/gateway-runtime/src/lib/db/cleanup.ts", "startCleanupScheduler");
await optional("warmup", "../../../packages/gateway-runtime/src/lib/warmupScheduler.ts", "startWarmupScheduler");
await optional("provider-limits", "../../../packages/gateway-runtime/src/shared/services/providerLimitsSyncScheduler.ts", "startProviderLimitsSyncScheduler");
await optional("subscription", "../../../packages/gateway-runtime/src/lib/proxySubscription/subscriptionService.ts", "startSubscriptionScheduler");
await optional("session-affinity-cleanup", "../../../packages/gateway-runtime/src/lib/db/sessionAccountAffinity.ts", "startSessionAccountAffinityCleanup");
await optional("credential-health", "../../../packages/gateway-runtime/src/lib/credentialHealth/scheduler.ts", "initCredentialHealthCheck");
await optional("vacuum-scheduler", "../../../packages/gateway-runtime/src/lib/db/vacuumScheduler.ts", "initVacuumScheduler");
await optional("audit-log", "../../../packages/gateway-runtime/src/lib/compliance/index.ts", "initAuditLog");
await optional("audit-log-retention", "../../../packages/gateway-runtime/src/lib/compliance/index.ts", "cleanupExpiredLogs");
await optional("memory-backends", "../../../packages/gateway-runtime/src/lib/memory/index.ts", "initMemoryBackends");
await optional("embed-ws-proxy", "../../../packages/gateway-runtime/src/lib/services/embedWsProxy.ts", "initEmbedWsProxy");
await optional("conductor-bridge", "../../../packages/gateway-runtime/src/lib/conductor/boot.ts", "initConductorBridge");
await optional("arena-elo-sync", "../../../packages/gateway-runtime/src/lib/arenaEloSync.ts", "initArenaEloSync");
await optional("openrouter-provider-stats", "../../../packages/gateway-runtime/src/lib/catalog/openrouterProviderStats.ts", "initOpenRouterProviderStatsSync");
await optional("context-window-reconcile", "../../../packages/gateway-runtime/src/lib/contextWindowResolver.ts", "startContextWindowReconcile");
await optional("memory-decay", "../../../packages/gateway-runtime/src/lib/memory/typedDecay.ts", "startMemoryDecaySweep");
await optional("runtime-config-hot-reload", "../../../packages/gateway-runtime/src/lib/config/hotReload.ts", "startRuntimeConfigHotReload");
await optional("reasoning-cache-cleanup", "../../../packages/gateway-runtime/src/lib/jobs/reasoningCacheCleanupJob.ts", "startReasoningCacheCleanupJob");
await optional("backup-schedule", "../../../packages/gateway-runtime/src/lib/jobs/backupScheduleJob.ts", "startBackupScheduleJob");
await importOnly("proxy-health", "../../../packages/gateway-runtime/src/lib/proxyHealth/scheduler.ts");
await importOnly("free-proxy-auto-sync", "../../../packages/gateway-runtime/src/lib/freeProxyProviders/scheduler.ts");
await importOnly("batch-processor", "../../../packages/gateway-runtime/open-sse/services/batchProcessor.ts");
await importOnly("auto-refresh-daemon", "../../../packages/gateway-runtime/open-sse/services/autoRefreshDaemon.ts");
log(`started: ${started.join(", ") || "none"}`);
await new Promise<void>((resolve) => {
  // Keep the worker alive even when every optional scheduler is disabled or
  // exits early. This also gives SIGTERM a deterministic shutdown path.
  const keepAlive = setInterval(() => undefined, 60_000);
  const stop = () => {
    clearInterval(keepAlive);
    resolve();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
});
