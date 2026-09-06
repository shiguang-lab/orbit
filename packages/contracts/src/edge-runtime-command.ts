import { z } from "zod";

const version = { version: z.literal(1) } as const;
const memoryType = z.enum(["factual", "episodic", "procedural", "semantic"]);
const memoryCreateInput = z.object({
  apiKeyId: z.string(),
  sessionId: z.string(),
  type: memoryType,
  key: z.string().min(1),
  content: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});
const memoryUpdateInput = z.object({
  type: memoryType.optional(),
  key: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const edgeRuntimeCommandSchema = z.discriminatedUnion("command", [
  z.object({ ...version, command: z.literal("health.snapshot") }),
  z.object({ ...version, command: z.literal("resilience.reset") }),
  z.object({ ...version, command: z.literal("model-lockouts.list") }),
  z.object({ ...version, command: z.literal("sessions.snapshot"), provider: z.string().min(1).optional() }),
  z.object({ ...version, command: z.literal("concurrency.snapshot") }),
  z.object({ ...version, command: z.literal("concurrency.reset") }),
  z.object({
    ...version,
    command: z.literal("rate-limits.snapshot"),
    targets: z.array(z.object({ provider: z.string().min(1), connectionId: z.string().min(1) })),
  }),
  z.object({
    ...version,
    command: z.literal("rate-limits.toggle"),
    connectionId: z.string().min(1),
    enabled: z.boolean(),
  }),
  z.object({ ...version, command: z.literal("provider-health.snapshot") }),
  z.object({ ...version, command: z.literal("provider-health.clear"), provider: z.string().min(1) }),
  z.object({ ...version, command: z.literal("quota-windows.snapshot") }),
  z.object({ ...version, command: z.literal("provider-limits.snapshot") }),
  z.object({ ...version, command: z.literal("provider-limits.refresh-all") }),
  z.object({
    ...version,
    command: z.literal("provider-limits.refresh-connection"),
    connectionId: z.string().min(1).max(256),
  }),
  z.object({
    ...version,
    command: z.literal("codex-reset-credits.list"),
    connectionId: z.string().min(1).max(256),
  }),
  z.object({
    ...version,
    command: z.literal("codex-reset-credits.consume"),
    connectionId: z.string().min(1).max(256),
    idempotencyKey: z.string().min(1).max(256),
    creditId: z.string().min(1).max(512).optional(),
  }),
  z.object({ ...version, command: z.literal("key-devices.snapshot"), apiKeyId: z.string().min(1) }),
  z.object({ ...version, command: z.literal("combo-metrics.snapshot"), combo: z.string().min(1).optional() }),
  z.object({ ...version, command: z.literal("combo-metrics.reset"), combo: z.string().min(1).optional() }),
  z.object({ ...version, command: z.literal("provider-diversity.snapshot") }),
  z.object({ ...version, command: z.literal("auto-combos.snapshot") }),
  z.object({ ...version, command: z.literal("auto-combos.materialize"), name: z.string().min(1) }),
  z.object({
    ...version,
    command: z.literal("combo-trace.get"),
    invocationId: z.string().startsWith("combo-").min(7),
  }),
  z.object({ ...version, command: z.literal("tool-latency.snapshot") }),
  z.object({ ...version, command: z.literal("search-cache.snapshot") }),
  z.object({ ...version, command: z.literal("semantic-cache.snapshot") }),
  z.object({
    ...version,
    command: z.literal("semantic-cache.invalidate"),
    operation: z.discriminatedUnion("scope", [
      z.object({ scope: z.literal("all") }),
      z.object({ scope: z.literal("memory") }),
      z.object({ scope: z.literal("model"), model: z.string().min(1) }),
      z.object({ scope: z.literal("signature"), signature: z.string().min(1) }),
      z.object({ scope: z.literal("stale"), maxAgeMs: z.number().int().positive() }),
    ]),
  }),
  z.object({
    ...version,
    command: z.literal("proxy-logs.list"),
    filters: z.object({
      status: z.string().min(1).optional(),
      type: z.string().min(1).optional(),
      provider: z.string().min(1).optional(),
      level: z.string().min(1).optional(),
      search: z.string().optional(),
      limit: z.number().int().positive().optional(),
    }),
  }),
  z.object({
    ...version,
    command: z.literal("proxy-logs.record"),
    entry: z.object({
      status: z.string().optional(),
      proxy: z.object({
        type: z.string(),
        host: z.string(),
        port: z.union([z.number(), z.string()]),
      }).nullable().optional(),
      level: z.string().optional(),
      levelId: z.string().nullable().optional(),
      provider: z.string().nullable().optional(),
      targetUrl: z.string().nullable().optional(),
      clientIp: z.string().nullable().optional(),
      egressIp: z.string().nullable().optional(),
      latencyMs: z.number().optional(),
      error: z.string().nullable().optional(),
      connectionId: z.string().nullable().optional(),
      comboId: z.string().nullable().optional(),
      account: z.string().nullable().optional(),
      tlsFingerprint: z.boolean().optional(),
    }),
  }),
  z.object({ ...version, command: z.literal("proxy-logs.clear") }),
  z.object({
    ...version,
    command: z.literal("memory.list"),
    filters: z.object({
      apiKeyId: z.string().optional(),
      type: memoryType.optional(),
      sessionId: z.string().optional(),
      query: z.string().optional(),
      limit: z.number().int().nonnegative(),
      offset: z.number().int().nonnegative().optional(),
      page: z.number().int().nonnegative(),
    }),
  }),
  z.object({ ...version, command: z.literal("memory.create"), input: memoryCreateInput }),
  z.object({ ...version, command: z.literal("memory.get"), id: z.string().min(1) }),
  z.object({ ...version, command: z.literal("memory.update"), id: z.string().min(1), input: memoryUpdateInput }),
  z.object({ ...version, command: z.literal("memory.delete"), id: z.string().min(1) }),
  z.object({ ...version, command: z.literal("memory.embedding-providers") }),
  z.object({ ...version, command: z.literal("memory.engine-status") }),
  z.object({ ...version, command: z.literal("memory.health") }),
  z.object({
    ...version,
    command: z.literal("memory.retrieve-preview"),
    apiKeyId: z.string().nullable(),
    query: z.string().min(1),
    strategy: z.enum(["exact", "semantic", "hybrid"]),
    maxTokens: z.number().int().positive(),
    limit: z.number().int().positive(),
  }),
  z.object({
    ...version,
    command: z.literal("memory.summarize"),
    apiKeyId: z.string().optional(),
    olderThanDays: z.number().int().positive(),
    dryRun: z.boolean(),
  }),
  z.object({ ...version, command: z.literal("memory.reindex"), force: z.boolean() }),
  z.object({
    ...version,
    command: z.literal("reasoning-cache.snapshot"),
    provider: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    limit: z.number().int().min(1).max(200),
    offset: z.number().int().nonnegative(),
  }),
  z.object({
    ...version,
    command: z.literal("reasoning-cache.delete"),
    toolCallId: z.string().min(1).optional(),
    provider: z.string().min(1).optional(),
  }),
  z.object({
    ...version,
    command: z.literal("connection-rate-limits.refresh"),
    connectionId: z.string().min(1),
    overrides: z.record(z.string(), z.number()).nullable(),
    enabled: z.boolean(),
  }),
  z.object({
    ...version,
    command: z.literal("runtime-cache.invalidate"),
    target: z.enum(["proxy-dispatcher", "cliproxy-url"]),
  }),
  z.object({ ...version, command: z.literal("model-aliases.snapshot") }),
  z.object({
    ...version,
    command: z.literal("model-access.classify"),
    targets: z.array(z.string().min(1)).max(200),
  }),
  z.object({ ...version, command: z.literal("background-degradation.snapshot") }),
  z.object({ ...version, command: z.literal("background-degradation.reset-stats") }),
  z.object({ ...version, command: z.literal("payload-rules.snapshot") }),
  z.object({ ...version, command: z.literal("task-routing.snapshot") }),
  z.object({ ...version, command: z.literal("task-routing.reset-stats") }),
  z.object({
    ...version,
    command: z.literal("task-routing.detect"),
    body: z.record(z.string(), z.unknown()),
  }),
  z.object({ ...version, command: z.literal("ip-filter.snapshot") }),
  z.object({
    ...version,
    command: z.literal("ip-filter.temp-ban"),
    ip: z.string().min(1),
    durationMs: z.number().int().positive(),
    reason: z.string().min(1),
  }),
  z.object({ ...version, command: z.literal("ip-filter.remove-temp-ban"), ip: z.string().min(1) }),
  z.object({ ...version, command: z.literal("tier-config.apply") }),
  z.object({
    ...version,
    command: z.literal("model-lockouts.clear"),
    provider: z.string().min(1).optional(),
    connectionId: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    all: z.boolean().optional(),
  }),
  z.object({
    ...version,
    command: z.literal("runtime-settings.apply"),
    minimumRevision: z.number().int().nonnegative().optional(),
  }),
]);

export type EdgeRuntimeCommand = z.infer<typeof edgeRuntimeCommandSchema>;
export type EdgeRuntimeCommandPayload = EdgeRuntimeCommand extends infer Command
  ? Command extends { version: 1 }
    ? Omit<Command, "version">
    : never
  : never;

export interface EdgeRuntimeHealthSnapshot {
  circuitBreakers: unknown[];
  rateLimitStatus: Record<string, unknown>;
  learnedLimits: Record<string, unknown>;
  lockouts: unknown[];
  inflightRequests: number;
  quotaMonitorSummary: Record<string, unknown>;
  quotaMonitorMonitors: unknown[];
  activeSessions: unknown[];
  activeSessionsByKey: Record<string, unknown>;
  credentialHealth?: unknown;
  adaptiveAdmission: unknown;
  chatAdmission: unknown;
}
