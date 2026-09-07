import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { edgeRuntimeCommandSchema } from "@orbit/contracts/edge-runtime-command";

const repoRoot = resolve(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

test("edge runtime command contract accepts only versioned narrow commands", () => {
  for (const command of [
    { version: 1, command: "health.snapshot" },
    { version: 1, command: "resilience.reset" },
    { version: 1, command: "model-lockouts.list" },
    { version: 1, command: "sessions.snapshot", provider: "openai" },
    { version: 1, command: "concurrency.snapshot" },
    { version: 1, command: "concurrency.reset" },
    { version: 1, command: "rate-limits.snapshot", targets: [] },
    { version: 1, command: "rate-limits.toggle", connectionId: "connection-1", enabled: true },
    { version: 1, command: "provider-health.snapshot" },
    { version: 1, command: "provider-health.clear", provider: "openai" },
    { version: 1, command: "quota-windows.snapshot" },
    { version: 1, command: "provider-limits.snapshot" },
    { version: 1, command: "provider-limits.refresh-all" },
    { version: 1, command: "provider-limits.refresh-connection", connectionId: "connection-1" },
    { version: 1, command: "codex-reset-credits.list", connectionId: "connection-1" },
    {
      version: 1,
      command: "codex-reset-credits.consume",
      connectionId: "connection-1",
      idempotencyKey: "reset-1",
    },
    { version: 1, command: "provider-diversity.snapshot" },
    { version: 1, command: "auto-combos.snapshot" },
    { version: 1, command: "auto-combos.materialize", name: "auto/best-coding" },
    { version: 1, command: "combo-trace.get", invocationId: "combo-test" },
    { version: 1, command: "connection-rate-limits.refresh", connectionId: "connection-1", overrides: null, enabled: false },
    { version: 1, command: "runtime-cache.invalidate", target: "proxy-dispatcher" },
    { version: 1, command: "semantic-cache.snapshot" },
    { version: 1, command: "semantic-cache.invalidate", operation: { scope: "all" } },
    { version: 1, command: "semantic-cache.invalidate", operation: { scope: "memory" } },
    { version: 1, command: "semantic-cache.invalidate", operation: { scope: "model", model: "gpt" } },
    { version: 1, command: "semantic-cache.invalidate", operation: { scope: "signature", signature: "sig" } },
    { version: 1, command: "semantic-cache.invalidate", operation: { scope: "stale", maxAgeMs: 1 } },
    { version: 1, command: "model-aliases.snapshot" },
    { version: 1, command: "model-access.classify", targets: ["openai/gpt-5"] },
    { version: 1, command: "background-degradation.snapshot" },
    { version: 1, command: "background-degradation.reset-stats" },
    { version: 1, command: "payload-rules.snapshot" },
    { version: 1, command: "task-routing.snapshot" },
    { version: 1, command: "task-routing.reset-stats" },
    { version: 1, command: "task-routing.detect", body: {} },
    { version: 1, command: "ip-filter.snapshot" },
    { version: 1, command: "ip-filter.temp-ban", ip: "127.0.0.2", durationMs: 1000, reason: "test" },
    { version: 1, command: "ip-filter.remove-temp-ban", ip: "127.0.0.2" },
    { version: 1, command: "tier-config.apply" },
    { version: 1, command: "model-lockouts.clear", provider: "openai", model: "gpt" },
    { version: 1, command: "runtime-settings.apply", minimumRevision: 3 },
  ]) {
    assert.equal(edgeRuntimeCommandSchema.safeParse(command).success, true);
  }
  assert.equal(edgeRuntimeCommandSchema.safeParse({
    version: 1,
    command: "semantic-cache.invalidate",
    operation: { scope: "model" },
  }).success, false);
  assert.equal(edgeRuntimeCommandSchema.safeParse({
    version: 1,
    command: "semantic-cache.invalidate",
    operation: { scope: "stale", maxAgeMs: 0 },
  }).success, false);
  assert.equal(edgeRuntimeCommandSchema.safeParse({ version: 1, command: "process.shutdown" }).success, false);
});

test("edge owns runtime state and control uses the authenticated command client", () => {
  const controller = read("apps/edge-gateway/src/runtime-control/runtime-control.controller.ts");
  const service = read("apps/edge-gateway/src/runtime-control/runtime-control.service.ts");
  const routes = read("apps/edge-gateway/src/routes/owned-routes.manifest.ts");
  const client = read("apps/control-api/src/edge-runtime/client.ts");

  assert.match(controller, /isInternalServiceRequest/);
  assert.match(routes, /path: "\/api\/internal\/runtime\/command", methods: \["POST"\]/);
  assert.match(service, /refreshRequestRuntimeSettings/);
  assert.match(service, /refreshResilienceRuntimeSettings/);
  assert.match(client, /getInternalServiceAuthHeaders/);

  for (const path of [
    "apps/control-api/src/monitoring/monitoring-health.service.ts",
    "apps/control-api/src/resilience/handlers/reset.handler.ts",
    "apps/control-api/src/resilience/handlers/model-cooldowns.handler.ts",
    "apps/control-api/src/resilience/handlers/resilience.handler.ts",
    "apps/control-api/src/settings/handlers/root.handler.ts",
    "apps/control-api/src/sessions/sessions.service.ts",
    "apps/control-api/src/admin/admin-concurrency.service.ts",
    "apps/control-api/src/rate-limits/rate-limits.service.ts",
    "apps/control-api/src/resilience/handlers/connections.handler.ts",
    "apps/control-api/src/providers/provider-health-autopilot.ts",
    "apps/control-api/src/gateway/runtime/gateway-status.ts",
    "apps/control-api/src/gateway/gateway.service.ts",
    "apps/control-api/src/telemetry/telemetry.service.ts",
    "apps/control-api/src/usage/handlers/quota.handler.ts",
    "apps/control-api/src/providers/providers.service.ts",
    "apps/control-api/src/usage/reporting/resilienceExplain.ts",
    "apps/control-api/src/usage/reporting/comboScoringInspector.ts",
    "apps/control-api/src/providers/handlers/provider-detail.ts",
    "apps/control-api/src/settings/model-aliases/model-aliases.service.ts",
    "apps/control-api/src/settings/settings.service.ts",
    "apps/control-api/src/settings/task-routing/task-routing.service.ts",
    "apps/control-api/src/settings/security/security.service.ts",
    "apps/control-api/src/settings/tier-config/tier-config.service.ts",
    "apps/control-api/src/settings/config/settings-config.service.ts",
    "apps/control-api/src/db-backups/db-backups.service.ts",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /inference\/services\/(?:accountFallback|rateLimitManager|requestDedup|quotaMonitor|sessionManager|accountSemaphore|webSessionPoolHealth|signatureCache)/, path);
    assert.doesNotMatch(source, /core\/resilience\/circuit-breaker/, path);
    assert.doesNotMatch(source, /inference\/(?:services\/(?:modelDeprecation|systemPrompt|thinkingBudget|taskAwareRouter|backgroundTaskDetector|ipFilter|payloadRules|tier-resolver)|executors\/cliproxyapi)/, path);
  }
  assert.doesNotMatch(read("apps/control-api/src/proxies/proxies.service.ts"), /\bclearDispatcherCache\b/);
  const proxySettings = read("apps/control-api/src/settings/proxy/proxy-settings.service.ts");
  assert.doesNotMatch(proxySettings, /\bclearDispatcherCache\b/);
  assert.match(proxySettings, /command: ["']runtime-cache\.invalidate["']/);
  const cacheService = read("apps/control-api/src/cache/cache.service.ts");
  assert.doesNotMatch(cacheService, /\b(?:getCacheStats|clearCache|invalidateByModel|invalidateBySignature|invalidateStale|clearMemoryCache|getMemoryCacheStats)\b/);
  assert.match(cacheService, /command: ["']semantic-cache\.snapshot["']/);
  assert.match(cacheService, /command: ["']semantic-cache\.invalidate["']/);
  for (const path of [
    "apps/control-api/src/usage/handlers/connection-usage.handler.ts",
    "apps/control-api/src/usage/handlers/provider-limits.handler.ts",
    "apps/control-api/src/usage/handlers/codex-reset-credit.handler.ts",
    "apps/control-api/src/providers/handlers/provider-test/provider-test.handler.ts",
  ]) {
    assert.doesNotMatch(
      read(path),
      /inference\/services\/(?:providerLimits|codexResetCredits)/,
      path,
    );
  }
  assert.doesNotMatch(read("apps/control-api/src/settings/handlers/root.handler.ts"), /\bclearCliproxyapiUrlCache\b/);
  for (const path of [
    "apps/control-api/src/combos/handlers/auto.ts",
    "apps/control-api/src/combos/handlers/duplicate.ts",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /inference\/services\/autoCombo\//, path);
    assert.match(source, /command: ["']auto-combos\.(?:snapshot|materialize)["']/, path);
  }
  const autoProjection = read("apps/edge-gateway/src/runtime-control/auto-combo-projection.ts");
  assert.match(autoProjection, /inference\/services\/autoCombo\/virtualFactory/);
  assert.match(autoProjection, /prepareVirtualAutoComboInputs\(\{ includeResolvedCapabilities: true \}\)/);
  const providerHealthMatrix = read("packages/core/src/lib/monitoring/providerHealthMatrix.ts");
  assert.doesNotMatch(providerHealthMatrix, /from ["'][^"']*circuitBreaker/);
  assert.match(providerHealthMatrix, /runtime\.getAllCircuitBreakerStatuses\(\)/);
});

test("control persists request settings before asking the edge process to apply them", () => {
  const persistence = read("apps/control-api/src/settings/runtime-settings-persistence.ts");
  const settingsDb = read("packages/core/src/lib/db/settings.ts");
  const edgeRuntime = read("apps/edge-gateway/src/runtime-control/runtime-control.service.ts");

  assert.match(persistence, /updateSettings\(updates, \{ applyRuntime: false \}\)/);
  assert.match(persistence, /minimumRevision: revision/);
  assert.match(settingsDb, /options\?\.applyRuntime !== false/);
  for (const command of [
    "background-degradation.reset-stats",
    "task-routing.reset-stats",
    "ip-filter.temp-ban",
    "ip-filter.remove-temp-ban",
    "tier-config.apply",
  ]) {
    assert.match(edgeRuntime, new RegExp(`case ["']${command}["']`), command);
  }
});
