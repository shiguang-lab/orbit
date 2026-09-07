import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { edgeRuntimeCommandSchema } from "@orbit/contracts/edge-runtime-command";
import { LocalProviderHealthService } from "../src/runtime-control/local-provider-health.service.js";
import { RuntimeControlService } from "../src/runtime-control/runtime-control.service.js";

const repoRoot = resolve(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

const commands = [
  { version: 1, command: "key-devices.snapshot", apiKeyId: "key-1" },
  { version: 1, command: "combo-metrics.snapshot" },
  { version: 1, command: "combo-metrics.snapshot", combo: "primary" },
  { version: 1, command: "combo-metrics.reset", combo: "primary" },
  { version: 1, command: "provider-diversity.snapshot" },
  { version: 1, command: "combo-trace.get", invocationId: "combo-test" },
  { version: 1, command: "tool-latency.snapshot" },
  { version: 1, command: "search-cache.snapshot" },
  { version: 1, command: "proxy-logs.list", filters: { limit: 20 } },
  { version: 1, command: "proxy-logs.record", entry: { status: "success" } },
  { version: 1, command: "proxy-logs.clear" },
  { version: 1, command: "memory.list", filters: { limit: 20, page: 1 } },
  {
    version: 1,
    command: "memory.create",
    input: { apiKeyId: "", sessionId: "", type: "factual", key: "test", content: "test" },
  },
  { version: 1, command: "memory.search", apiKeyId: "key-1", query: "test" },
  { version: 1, command: "memory.clear", apiKeyId: "key-1" },
  { version: 1, command: "memory.get", id: "memory-1" },
  { version: 1, command: "memory.update", id: "memory-1", input: { content: "updated" } },
  { version: 1, command: "memory.delete", id: "memory-1" },
  { version: 1, command: "memory.embedding-providers" },
  { version: 1, command: "memory.engine-status" },
  { version: 1, command: "memory.health" },
  {
    version: 1,
    command: "memory.retrieve-preview",
    apiKeyId: null,
    query: "test",
    strategy: "exact",
    maxTokens: 100,
    limit: 10,
  },
  { version: 1, command: "memory.summarize", olderThanDays: 30, dryRun: true },
  { version: 1, command: "memory.reindex", force: false },
  { version: 1, command: "memory.decay" },
  { version: 1, command: "memory.retention-cleanup" },
  { version: 1, command: "semantic-cache.snapshot" },
  {
    version: 1,
    command: "semantic-cache.invalidate",
    operation: { scope: "signature", signature: "semantic-test" },
  },
  {
    version: 1,
    command: "reasoning-cache.snapshot",
    provider: "deepseek",
    limit: 50,
    offset: 0,
  },
  { version: 1, command: "reasoning-cache.delete", toolCallId: "call-1" },
  { version: 1, command: "reasoning-cache.delete", provider: "deepseek" },
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
] as const;

test("live registry commands are narrow and versioned", () => {
  for (const command of commands) {
    assert.equal(edgeRuntimeCommandSchema.safeParse(command).success, true, command.command);
  }
  assert.equal(edgeRuntimeCommandSchema.safeParse({
    version: 1,
    command: "reasoning-cache.snapshot",
    limit: 0,
    offset: 0,
  }).success, false);
  assert.equal(edgeRuntimeCommandSchema.safeParse({
    version: 1,
    command: "combo-trace.get",
    invocationId: "not-a-combo-trace",
  }).success, false);
});

test("edge command service owns live registry reads and mutations", () => {
  const service = read("apps/gateway/src/runtime-control/runtime-control.service.ts");
  for (const command of new Set(commands.map((entry) => entry.command))) {
    assert.match(service, new RegExp(`case ["']${command.replace(".", "\\.")}["']`), command);
  }
  for (const runtime of [
    "deviceTracker",
    "comboMetrics",
    "autoCombo/providerDiversity",
    "combo/decisionTrace",
    "toolLatencyTracker",
    "searchCache",
    "reasoningCache",
    "quotaPreflight",
  ]) {
    assert.match(service, new RegExp(`open-sse/services/${runtime}`), runtime);
  }
  assert.match(service, /inference\/services\/providerLimits/);
  assert.match(service, /inference\/services\/codexResetCredits/);
});

test("control consumers proxy instead of importing edge singleton registries", () => {
  const forbidden = /inference\/services\/(?:deviceTracker|comboMetrics|autoCombo\/providerDiversity|combo\/decisionTrace|toolLatencyTracker|searchCache|reasoningCache|quotaPreflight)/;
  for (const path of [
    "apps/control/src/keys/handlers/key-devices.ts",
    "apps/control/src/providers/providers.service.ts",
    "apps/control/src/cache/cache.service.ts",
    "apps/control/src/combos/handlers/metrics.ts",
    "apps/control/src/analytics/analytics.service.ts",
    "apps/control/src/usage/handlers/combo-trace.handler.ts",
    "apps/control/src/usage/reporting/comboHealth.ts",
    "apps/control/src/search/stats/search-stats.service.ts",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, forbidden, path);
    assert.match(source, /executeEdgeRuntimeCommand/, path);
  }
  const proxyLogs = read("apps/control/src/logs/handlers/proxy-logs.handler.ts");
  assert.doesNotMatch(proxyLogs, /core\/logging\/proxy-logs/);
  assert.match(proxyLogs, /executeEdgeRuntimeCommand/);
  const providerTest = read(
    "apps/control/src/providers/handlers/provider-test/provider-test.handler.ts",
  );
  assert.doesNotMatch(providerTest, /core\/logging\/proxy-logs/);
  assert.match(providerTest, /command: "proxy-logs\.record"/);

  const memory = read("apps/control/src/memory/memory.service.ts");
  assert.doesNotMatch(memory, /inference\/services\/memoryRuntime/);
  assert.match(memory, /executeEdgeRuntimeCommand/);

  for (const path of [
    "apps/control/src/usage/handlers/connection-usage.handler.ts",
    "apps/control/src/usage/handlers/provider-limits.handler.ts",
    "apps/control/src/usage/handlers/codex-reset-credit.handler.ts",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /inference\/services\/(?:providerLimits|codexResetCredits)/, path);
    assert.match(source, /executeEdgeRuntimeCommand/, path);
  }
});

test("edge commands operate on the live registry instances", async () => {
  const runtime = new RuntimeControlService(new LocalProviderHealthService());
  const [devices, combos, diversity, traces, latency, reasoning, quota, semantic] = await Promise.all([
    import("@orbit/inference/services/deviceTracker"),
    import("@orbit/inference/services/comboMetrics"),
    import("@orbit/inference/services/autoCombo/providerDiversity"),
    import("@orbit/inference/services/combo/decisionTrace"),
    import("@orbit/inference/services/toolLatencyTracker"),
    import("@orbit/inference/services/reasoningCache"),
    import("@orbit/inference/services/quotaPreflight"),
    import("@orbit/core/cache/semantic"),
  ]);

  devices.clearDeviceTracker();
  devices.trackDevice("key-1", "192.0.2.4", "test-agent");
  const deviceSnapshot = await runtime.execute({
    version: 1,
    command: "key-devices.snapshot",
    apiKeyId: "key-1",
  }) as { count: number; devices: unknown[] };
  assert.equal(deviceSnapshot.count, 1);
  assert.equal(deviceSnapshot.devices.length, 1);

  combos.resetAllComboMetrics();
  combos.recordComboRequest("primary", "openai/gpt", {
    success: true,
    latencyMs: 25,
  });
  const comboSnapshot = await runtime.execute({
    version: 1,
    command: "combo-metrics.snapshot",
    combo: "primary",
  }) as { metrics: { totalRequests: number } | null };
  assert.equal(comboSnapshot.metrics?.totalRequests, 1);
  await runtime.execute({ version: 1, command: "combo-metrics.reset", combo: "primary" });
  assert.equal(combos.getComboMetrics("primary"), null);

  diversity.resetDiversity();
  diversity.recordProviderUsage("openai");
  const diversitySnapshot = await runtime.execute({
    version: 1,
    command: "provider-diversity.snapshot",
  }) as { totalRequests: number; providers: Record<string, { count: number }> };
  assert.equal(diversitySnapshot.totalRequests, 1);
  assert.equal(diversitySnapshot.providers.openai?.count, 1);

  traces.resetComboTraceStore();
  traces.startComboTrace("combo-test", { strategy: "priority", comboName: "primary" });
  traces.recordComboDecision("combo-test", {
    step: "step-1",
    target: "openai/gpt",
    decision: "dispatched",
  });
  const traceSnapshot = await runtime.execute({
    version: 1,
    command: "combo-trace.get",
    invocationId: "combo-test",
  }) as { trace: { invocationId: string; decisions: unknown[] } | null };
  assert.equal(traceSnapshot.trace?.invocationId, "combo-test");
  assert.equal(traceSnapshot.trace?.decisions.length, 1);

  latency.resetToolLatency();
  latency.recordToolLatency("openai", 10, 20);
  const latencySnapshot = await runtime.execute({
    version: 1,
    command: "tool-latency.snapshot",
  }) as { providers: Record<string, { measurementCount: number }> };
  assert.equal(latencySnapshot.providers.openai?.measurementCount, 1);

  reasoning.clearReasoningCacheAll();
  reasoning.cacheReasoning("call-1", "deepseek", "deepseek-chat", "reasoning");
  const reasoningSnapshot = await runtime.execute({
    version: 1,
    command: "reasoning-cache.snapshot",
    limit: 50,
    offset: 0,
  }) as { stats: { memoryEntries: number } };
  assert.equal(reasoningSnapshot.stats.memoryEntries, 1);
  await runtime.execute({ version: 1, command: "reasoning-cache.delete", toolCallId: "call-1" });
  assert.equal(reasoning.lookupReasoning("call-1"), null);

  quota.registerQuotaWindows("test-provider", ["daily"]);
  const quotaSnapshot = await runtime.execute({
    version: 1,
    command: "quota-windows.snapshot",
  }) as { windows: Record<string, readonly string[]> };
  assert.deepEqual(quotaSnapshot.windows["test-provider"], ["daily"]);

  const searchSnapshot = await runtime.execute({
    version: 1,
    command: "search-cache.snapshot",
  }) as { size: number; hits: number; misses: number };
  assert.equal(typeof searchSnapshot.size, "number");
  assert.equal(typeof searchSnapshot.hits, "number");
  assert.equal(typeof searchSnapshot.misses, "number");

  semantic.setCachedResponse("semantic-test", "openai/gpt", { ok: true }, 1);
  const semanticSnapshot = await runtime.execute({
    version: 1,
    command: "semantic-cache.snapshot",
  }) as { memoryStats: { size: number } };
  assert.equal(semanticSnapshot.memoryStats.size >= 1, true);
  const semanticDelete = await runtime.execute({
    version: 1,
    command: "semantic-cache.invalidate",
    operation: { scope: "signature", signature: "semantic-test" },
  }) as { invalidated: number; scope: string };
  assert.deepEqual(semanticDelete, { ok: true, invalidated: 1, scope: "signature" });
  assert.equal(semantic.getCachedResponse("semantic-test"), null);

  const providerLimitsSnapshot = await runtime.execute({
    version: 1,
    command: "provider-limits.snapshot",
  }) as { caches: Record<string, unknown>; intervalMinutes: number; lastAutoSyncAt: string | null };
  assert.equal(typeof providerLimitsSnapshot.caches, "object");
  assert.equal(typeof providerLimitsSnapshot.intervalMinutes, "number");
  assert.equal(
    providerLimitsSnapshot.lastAutoSyncAt === null ||
      typeof providerLimitsSnapshot.lastAutoSyncAt === "string",
    true,
  );
});

test("edge owns proxy-log clearing and memory CRUD state", async () => {
  const runtime = new RuntimeControlService(new LocalProviderHealthService());
  const { getDbInstance } = await import("@orbit/core/db/connection");

  await runtime.execute({
    version: 1,
    command: "proxy-logs.record",
    entry: { status: "success", provider: "owner-test" },
  });
  const beforeClear = await runtime.execute({
    version: 1,
    command: "proxy-logs.list",
    filters: { provider: "owner-test" },
  }) as { logs: Array<{ provider: string | null }> };
  assert.equal(beforeClear.logs.length, 1);
  await runtime.execute({ version: 1, command: "proxy-logs.clear" });
  await new Promise((resolve) => setTimeout(resolve, 1_100));
  const afterClear = await runtime.execute({
    version: 1,
    command: "proxy-logs.list",
    filters: { provider: "owner-test" },
  }) as { logs: unknown[] };
  assert.equal(afterClear.logs.length, 0);
  const persisted = getDbInstance()
    .prepare("SELECT COUNT(*) AS count FROM proxy_logs WHERE provider = ?")
    .get("owner-test") as { count: number };
  assert.equal(persisted.count, 0, "cleared pending rows must not be flushed back to SQLite");

  const memoryRuntime = await import("@orbit/core/edge/memory-runtime");
  await memoryRuntime.initMemoryBackends();
  const created = await runtime.execute({
    version: 1,
    command: "memory.create",
    input: {
      apiKeyId: "edge-owner-test",
      sessionId: "",
      type: "factual",
      key: "runtime-owner",
      content: "created in the edge owner",
    },
  }) as { memory: { id: string; content: string } };
  assert.equal(created.memory.content, "created in the edge owner");

  const fetched = await runtime.execute({
    version: 1,
    command: "memory.get",
    id: created.memory.id,
  }) as { memory: { id: string } | null };
  assert.equal(fetched.memory?.id, created.memory.id);

  const updated = await runtime.execute({
    version: 1,
    command: "memory.update",
    id: created.memory.id,
    input: { content: "updated in the edge owner" },
  }) as { updated: boolean };
  assert.equal(updated.updated, true);

  const listed = await runtime.execute({
    version: 1,
    command: "memory.list",
    filters: { apiKeyId: "edge-owner-test", limit: 20, page: 1 },
  }) as { result: { data: Array<{ id: string }> } };
  assert.equal(listed.result.data.some((entry) => entry.id === created.memory.id), true);

  const removed = await runtime.execute({
    version: 1,
    command: "memory.delete",
    id: created.memory.id,
  }) as { deleted: boolean };
  assert.equal(removed.deleted, true);
  const missing = await runtime.execute({
    version: 1,
    command: "memory.get",
    id: created.memory.id,
  }) as { memory: unknown | null };
  assert.equal(missing.memory, null);
});
