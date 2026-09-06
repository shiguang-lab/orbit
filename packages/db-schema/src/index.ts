/** Database boundary shared by deployable apps. Queries and mutations remain app-owned. */
import {
  ApiKeyEntity,
  ComboEntity,
  KeyGroupEntity,
  ModelComboMappingEntity,
  ApiKeyTokenLimitEntity,
  ModelCapabilityOverrideEntity,
  ModelContextOverrideEntity,
  PluginEntity,
  ProviderConnectionEntity,
  ProviderNodeEntity,
  ProviderPlanEntity,
  SettingsEntity,
  WebhookEntity,
} from "./entities/control.entity.js";
import {
  AgenticConversationEntity,
  ApiKeyTokenCounterEntity,
  ApiKeyTokenLimitResetLogEntity,
  BatchEntity,
  ConversationTurnNodeEntity,
  FileEntity,
  ProviderQuotaStateEntity,
} from "./entities/edge.entity.js";
import {
  AuditLogEntity,
  CallLogEntity,
  JobEntity,
  MemoryEntity,
  ProxyLogEntity,
  QuotaSnapshotEntity,
  UsageHistoryEntity,
  ModelCapabilitiesEntity,
} from "./entities/worker.entity.js";
import type { EntityDefinition } from "./entities/definition.js";

export * from "./entities/index.js";

export const GATEWAY_TABLES = {
  settings: "key_value",
  providerConnections: "provider_connections",
  providerNodes: "provider_nodes",
  apiKeys: "api_keys",
  apiKeyGroups: "key_groups",
  combos: "combos",
  modelComboMappings: "model_combo_mappings",
  usageHistory: "usage_history",
  callLogs: "call_logs",
  proxyLogs: "proxy_logs",
  quotaSnapshots: "quota_snapshots",
  auditLogs: "audit_log",
  memories: "memories",
  batches: "batches",
  files: "files",
  webhooks: "webhooks",
  jobs: "jobs",
  agenticConversations: "agentic_conversations",
  conversationTurnNodes: "conversation_turn_nodes",
  apiKeyTokenLimits: "api_key_token_limits",
  apiKeyTokenCounters: "api_key_token_counters",
  apiKeyTokenLimitResetLogs: "api_key_token_limit_reset_logs",
  providerQuotaState: "provider_quota_state",
  providerPlans: "provider_plans",
  plugins: "plugins",
  modelCapabilities: "model_capabilities",
  modelContextOverrides: "model_context_overrides",
  modelCapabilityOverrides: "model_capability_overrides",
} as const;

export type GatewayTable = (typeof GATEWAY_TABLES)[keyof typeof GATEWAY_TABLES];

export interface TableRef {
  table: GatewayTable;
  owner: "control-api" | "edge-gateway" | "realtime" | "worker";
  access: "read" | "write" | "read-write";
}

/**
 * Explicit ownership map used by architecture checks and code review. A
 * table can be read by several apps, but writes have one operational owner.
 */
export const TABLE_OWNERSHIP: readonly TableRef[] = [
  { table: GATEWAY_TABLES.settings, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.providerConnections, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.providerNodes, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.apiKeys, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.apiKeyGroups, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.combos, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.modelComboMappings, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.usageHistory, owner: "worker", access: "read-write" },
  { table: GATEWAY_TABLES.callLogs, owner: "worker", access: "read-write" },
  { table: GATEWAY_TABLES.proxyLogs, owner: "worker", access: "read-write" },
  { table: GATEWAY_TABLES.quotaSnapshots, owner: "worker", access: "read-write" },
  { table: GATEWAY_TABLES.auditLogs, owner: "worker", access: "read-write" },
  { table: GATEWAY_TABLES.memories, owner: "worker", access: "read-write" },
  { table: GATEWAY_TABLES.batches, owner: "edge-gateway", access: "read-write" },
  { table: GATEWAY_TABLES.files, owner: "edge-gateway", access: "read-write" },
  { table: GATEWAY_TABLES.webhooks, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.jobs, owner: "worker", access: "read-write" },
  { table: GATEWAY_TABLES.agenticConversations, owner: "edge-gateway", access: "read-write" },
  { table: GATEWAY_TABLES.conversationTurnNodes, owner: "edge-gateway", access: "read-write" },
  { table: GATEWAY_TABLES.apiKeyTokenLimits, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.apiKeyTokenCounters, owner: "edge-gateway", access: "read-write" },
  { table: GATEWAY_TABLES.apiKeyTokenLimitResetLogs, owner: "edge-gateway", access: "read-write" },
  { table: GATEWAY_TABLES.providerQuotaState, owner: "edge-gateway", access: "read-write" },
  { table: GATEWAY_TABLES.providerPlans, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.plugins, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.modelCapabilities, owner: "worker", access: "read-write" },
  { table: GATEWAY_TABLES.modelContextOverrides, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.modelCapabilityOverrides, owner: "control-api", access: "read-write" },
];

/**
 * Canonical physical entities for the tables shared by more than one app.
 * The mapped keys intentionally follow the public vocabulary above; each
 * entity keeps a Nest/ORM-style stable `entityName` and an exact SQLite
 * `tableName`.
 */
export const GATEWAY_ENTITIES = {
  settings: SettingsEntity,
  providerConnections: ProviderConnectionEntity,
  providerNodes: ProviderNodeEntity,
  apiKeys: ApiKeyEntity,
  apiKeyGroups: KeyGroupEntity,
  combos: ComboEntity,
  modelComboMappings: ModelComboMappingEntity,
  usageHistory: UsageHistoryEntity,
  callLogs: CallLogEntity,
  proxyLogs: ProxyLogEntity,
  quotaSnapshots: QuotaSnapshotEntity,
  auditLogs: AuditLogEntity,
  memories: MemoryEntity,
  batches: BatchEntity,
  files: FileEntity,
  webhooks: WebhookEntity,
  jobs: JobEntity,
  agenticConversations: AgenticConversationEntity,
  conversationTurnNodes: ConversationTurnNodeEntity,
  apiKeyTokenLimits: ApiKeyTokenLimitEntity,
  apiKeyTokenCounters: ApiKeyTokenCounterEntity,
  apiKeyTokenLimitResetLogs: ApiKeyTokenLimitResetLogEntity,
  providerQuotaState: ProviderQuotaStateEntity,
  providerPlans: ProviderPlanEntity,
  plugins: PluginEntity,
  modelCapabilities: ModelCapabilitiesEntity,
  modelContextOverrides: ModelContextOverrideEntity,
  modelCapabilityOverrides: ModelCapabilityOverrideEntity,
} satisfies Record<keyof typeof GATEWAY_TABLES, EntityDefinition>;

/** Runtime guard used by architecture checks and tests. */
export function assertGatewayEntities(): void {
  for (const [key, entity] of Object.entries(GATEWAY_ENTITIES) as Array<[
    keyof typeof GATEWAY_TABLES,
    EntityDefinition,
  ]>) {
    if (entity.tableName !== GATEWAY_TABLES[key]) {
      throw new Error(`Entity ${key} maps to ${entity.tableName}, expected ${GATEWAY_TABLES[key]}`);
    }
    const ownership = TABLE_OWNERSHIP.find((ref) => ref.table === entity.tableName);
    if (!ownership || ownership.owner !== entity.owner) {
      throw new Error(`Entity ${key} has no matching table ownership declaration`);
    }
    if (entity.columns.length === 0) throw new Error(`Entity ${key} has no columns`);
  }
}

export function tableOwner(table: GatewayTable): TableRef["owner"] {
  const ref = TABLE_OWNERSHIP.find((item) => item.table === table);
  if (!ref) throw new Error(`Unknown gateway table: ${table}`);
  return ref.owner;
}
