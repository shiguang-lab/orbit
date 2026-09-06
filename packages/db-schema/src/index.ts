/** Database boundary shared by deployable apps. Queries and mutations remain app-owned. */
import {
  ApiKeyEntity,
  ConfigAuditLogEntity,
  ComboEntity,
  CompressionComboEntity,
  CompressionComboAssignmentEntity,
  KeyGroupEntity,
  ModelComboMappingEntity,
  ApiKeyTokenLimitEntity,
  ModelCapabilityOverrideEntity,
  ModelContextOverrideEntity,
  PluginEntity,
  PlaygroundPresetEntity,
  PluginMetricEntity,
  ProviderConnectionEntity,
  ProviderNodeEntity,
  ProviderPlanEntity,
  SettingsEntity,
  TierAssignmentEntity,
  TierConfigEntity,
  WebhookEntity,
  FreeProxyEntity,
  FreeProxySyncErrorEntity,
  ReasoningRoutingRuleEntity,
  QuotaGroupEntity,
  QuotaPoolEntity,
  QuotaAllocationEntity,
  QuotaPoolConnectionEntity,
  QuotaAllocationModelCapEntity,
  GamificationLeaderboardEntity,
  GamificationUserLevelEntity,
  GamificationBadgeDefinitionEntity,
  GamificationUserBadgeEntity,
  GamificationXpAuditLogEntity,
  GamificationTokenLedgerEntity,
  GamificationInviteTokenEntity,
  GamificationCommunityServerEntity,
  EvalSuiteEntity,
  EvalCaseEntity,
  EvalRunEntity,
} from "./entities/control.entity.js";
import {
  AgenticConversationEntity,
  ApiKeyTokenCounterEntity,
  ApiKeyTokenLimitResetLogEntity,
  BatchEntity,
  ConversationTurnNodeEntity,
  FileEntity,
  ProviderQuotaStateEntity,
  QuotaConsumptionEntity,
  CompressionAnalyticsEntity,
  CompressionEngineBreakdownEntity,
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
export * from "./gamification.js";

export const GATEWAY_TABLES = {
  settings: "key_value",
  configAuditLog: "config_audit_log",
  playgroundPresets: "playground_presets",
  pluginMetrics: "plugin_metrics",
  providerConnections: "provider_connections",
  providerNodes: "provider_nodes",
  apiKeys: "api_keys",
  apiKeyGroups: "key_groups",
  combos: "combos",
  compressionCombos: "compression_combos",
  compressionComboAssignments: "compression_combo_assignments",
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
  tierConfig: "tier_config",
  tierAssignments: "tier_assignments",
  freeProxies: "free_proxies",
  freeProxySyncErrors: "free_proxy_sync_errors",
  reasoningRoutingRules: "reasoning_routing_rules",
  quotaGroups: "quota_groups",
  quotaPools: "quota_pools",
  quotaAllocations: "quota_allocations",
  quotaPoolConnections: "quota_pool_connections",
  quotaAllocationModelCaps: "quota_allocation_model_caps",
  gamificationLeaderboard: "leaderboard",
  gamificationUserLevels: "user_levels",
  gamificationBadgeDefinitions: "badge_definitions",
  gamificationUserBadges: "user_badges",
  gamificationXpAuditLog: "xp_audit_log",
  gamificationTokenLedger: "token_ledger",
  gamificationInviteTokens: "invite_tokens",
  gamificationCommunityServers: "community_servers",
  evalSuites: "eval_suites",
  evalCases: "eval_cases",
  evalRuns: "eval_runs",
  quotaConsumption: "quota_consumption",
  compressionAnalytics: "compression_analytics",
  compressionEngineBreakdown: "compression_engine_breakdown",
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
  { table: GATEWAY_TABLES.configAuditLog, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.playgroundPresets, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.pluginMetrics, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.providerConnections, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.providerNodes, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.apiKeys, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.apiKeyGroups, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.combos, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.compressionCombos, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.compressionComboAssignments, owner: "control-api", access: "read-write" },
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
  { table: GATEWAY_TABLES.tierConfig, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.tierAssignments, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.freeProxies, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.freeProxySyncErrors, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.reasoningRoutingRules, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.quotaGroups, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.quotaPools, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.quotaAllocations, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.quotaPoolConnections, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.quotaAllocationModelCaps, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.gamificationLeaderboard, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.gamificationUserLevels, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.gamificationBadgeDefinitions, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.gamificationUserBadges, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.gamificationXpAuditLog, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.gamificationTokenLedger, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.gamificationInviteTokens, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.gamificationCommunityServers, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.evalSuites, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.evalCases, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.evalRuns, owner: "control-api", access: "read-write" },
  { table: GATEWAY_TABLES.quotaConsumption, owner: "edge-gateway", access: "read-write" },
  { table: GATEWAY_TABLES.compressionAnalytics, owner: "edge-gateway", access: "read-write" },
  { table: GATEWAY_TABLES.compressionEngineBreakdown, owner: "edge-gateway", access: "read-write" },
];

/**
 * Canonical physical entities for every table whose structure is governed by
 * the deployable apps.  The mapped keys intentionally follow the public
 * vocabulary above; each entity keeps a Nest/ORM-style stable `entityName`
 * and an exact SQLite `tableName`.
 */
export const GATEWAY_ENTITIES = {
  settings: SettingsEntity,
  configAuditLog: ConfigAuditLogEntity,
  playgroundPresets: PlaygroundPresetEntity,
  pluginMetrics: PluginMetricEntity,
  providerConnections: ProviderConnectionEntity,
  providerNodes: ProviderNodeEntity,
  apiKeys: ApiKeyEntity,
  apiKeyGroups: KeyGroupEntity,
  combos: ComboEntity,
  compressionCombos: CompressionComboEntity,
  compressionComboAssignments: CompressionComboAssignmentEntity,
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
  tierConfig: TierConfigEntity,
  tierAssignments: TierAssignmentEntity,
  freeProxies: FreeProxyEntity,
  freeProxySyncErrors: FreeProxySyncErrorEntity,
  reasoningRoutingRules: ReasoningRoutingRuleEntity,
  quotaGroups: QuotaGroupEntity,
  quotaPools: QuotaPoolEntity,
  quotaAllocations: QuotaAllocationEntity,
  quotaPoolConnections: QuotaPoolConnectionEntity,
  quotaAllocationModelCaps: QuotaAllocationModelCapEntity,
  gamificationLeaderboard: GamificationLeaderboardEntity,
  gamificationUserLevels: GamificationUserLevelEntity,
  gamificationBadgeDefinitions: GamificationBadgeDefinitionEntity,
  gamificationUserBadges: GamificationUserBadgeEntity,
  gamificationXpAuditLog: GamificationXpAuditLogEntity,
  gamificationTokenLedger: GamificationTokenLedgerEntity,
  gamificationInviteTokens: GamificationInviteTokenEntity,
  gamificationCommunityServers: GamificationCommunityServerEntity,
  evalSuites: EvalSuiteEntity,
  evalCases: EvalCaseEntity,
  evalRuns: EvalRunEntity,
  quotaConsumption: QuotaConsumptionEntity,
  compressionAnalytics: CompressionAnalyticsEntity,
  compressionEngineBreakdown: CompressionEngineBreakdownEntity,
} satisfies Record<keyof typeof GATEWAY_TABLES, EntityDefinition>;

/** Runtime guard used by architecture checks and tests. */
export function assertGatewayEntities(): void {
  const tableEntries = Object.entries(GATEWAY_TABLES) as Array<[
    keyof typeof GATEWAY_TABLES,
    GatewayTable,
  ]>;
  const tableKeys = new Set(tableEntries.map(([key]) => key));
  const physicalTables = new Set<GatewayTable>();
  for (const [key, table] of tableEntries) {
    if (physicalTables.has(table)) {
      throw new Error(`Duplicate physical table in GATEWAY_TABLES: ${table}`);
    }
    physicalTables.add(table);
    if (!GATEWAY_ENTITIES[key]) {
      throw new Error(`Missing entity catalog entry for table key: ${key}`);
    }
  }

  const ownershipByTable = new Map<GatewayTable, TableRef>();
  for (const ref of TABLE_OWNERSHIP) {
    if (!physicalTables.has(ref.table)) {
      throw new Error(`Ownership references unknown gateway table: ${ref.table}`);
    }
    if (ownershipByTable.has(ref.table)) {
      throw new Error(`Duplicate ownership declaration for table: ${ref.table}`);
    }
    ownershipByTable.set(ref.table, ref);
  }
  if (ownershipByTable.size !== physicalTables.size) {
    const missingOwnership = [...physicalTables].filter((table) => !ownershipByTable.has(table));
    throw new Error(`Missing ownership declaration for tables: ${missingOwnership.join(", ")}`);
  }

  const entityNames = new Set<string>();
  for (const [key, entity] of Object.entries(GATEWAY_ENTITIES) as Array<[
    keyof typeof GATEWAY_TABLES,
    EntityDefinition,
  ]>) {
    if (!tableKeys.has(key)) {
      throw new Error(`Entity catalog contains unknown table key: ${key}`);
    }
    if (entity.tableName !== GATEWAY_TABLES[key]) {
      throw new Error(`Entity ${key} maps to ${entity.tableName}, expected ${GATEWAY_TABLES[key]}`);
    }
    if (entityNames.has(entity.entityName)) {
      throw new Error(`Duplicate entityName in gateway catalog: ${entity.entityName}`);
    }
    entityNames.add(entity.entityName);
    const columnNames = new Set<string>();
    for (const item of entity.columns) {
      if (!item.name.trim()) throw new Error(`Entity ${key} contains an unnamed column`);
      if (columnNames.has(item.name)) throw new Error(`Entity ${key} contains duplicate column: ${item.name}`);
      columnNames.add(item.name);
    }
    const ownership = ownershipByTable.get(entity.tableName);
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
