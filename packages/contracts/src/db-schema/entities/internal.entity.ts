import { column, type EntityDefinition } from "./definition.js";

/**
 * Internal persistence contracts retained by the legacy SQLite adapter.
 *
 * These tables are not a package-level data-access API: SQL bootstrap and
 * repositories remain in the owning app/domain.  Their physical shapes are
 * catalogued here so every deployable app has one source of truth while the
 * remaining legacy modules are migrated.
 */

/** SQLite migration bookkeeping used by the shared bootstrap runner. */
export const GatewayMigrationsEntity: EntityDefinition = {
  entityName: "GatewayMigrations",
  tableName: "_shiguanggateway_migrations",
  owner: "control",
  columns: [
    column("version", "TEXT", { nullable: false, primaryKey: true }),
    column("name", "TEXT", { nullable: false }),
    column("applied_at", "TEXT", { nullable: false }),
  ],
};

/** Agent Bridge control-plane state; DDL/CRUD remains in control. */
export const AgentBridgeStateEntity: EntityDefinition = {
  entityName: "AgentBridgeState",
  tableName: "agent_bridge_state",
  owner: "control",
  columns: [
    column("agent_id", "TEXT", { nullable: false, primaryKey: true }),
    column("dns_enabled", "INTEGER", { nullable: false, default: "0" }),
    column("cert_trusted", "INTEGER", { nullable: false, default: "0" }),
    column("setup_completed", "INTEGER", { nullable: false, default: "0" }),
    column("last_started_at", "TEXT"),
    column("last_error", "TEXT"),
  ],
};

export const AgentBridgeMappingEntity: EntityDefinition = {
  entityName: "AgentBridgeMapping",
  tableName: "agent_bridge_mappings",
  owner: "control",
  columns: [
    column("agent_id", "TEXT", { nullable: false, primaryKey: true }),
    column("source_model", "TEXT", { nullable: false, primaryKey: true }),
    column("target_model", "TEXT", { nullable: false }),
    column("updated_at", "TEXT", { nullable: false, default: "CURRENT_TIMESTAMP" }),
  ],
};

export const AgentBridgeBypassEntity: EntityDefinition = {
  entityName: "AgentBridgeBypass",
  tableName: "agent_bridge_bypass",
  owner: "control",
  columns: [
    column("pattern", "TEXT", { nullable: false, primaryKey: true }),
    column("source", "TEXT", { nullable: false }),
    column("created_at", "TEXT", { nullable: false, default: "CURRENT_TIMESTAMP" }),
  ],
};

/** Per-provider credentials used only by the edge cloud-agents module. */
export const CloudAgentCredentialsEntity: EntityDefinition = {
  entityName: "CloudAgentCredentials",
  tableName: "cloud_agent_credentials",
  owner: "gateway",
  columns: [
    column("provider_id", "TEXT", { nullable: false, primaryKey: true }),
    column("api_key_encrypted", "TEXT", { nullable: false }),
    column("base_url", "TEXT"),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

export const CloudAgentTaskEntity: EntityDefinition = {
  entityName: "CloudAgentTask",
  tableName: "cloud_agent_tasks",
  owner: "gateway",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("provider_id", "TEXT", { nullable: false }),
    column("external_id", "TEXT"),
    column("status", "TEXT", { nullable: false, default: "'queued'" }),
    column("prompt", "TEXT", { nullable: false }),
    column("source", "TEXT", { nullable: false }),
    column("options", "TEXT", { default: "'{}'" }),
    column("result", "TEXT"),
    column("activities", "TEXT", { default: "'[]'" }),
    column("error", "TEXT"),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("completed_at", "TEXT"),
  ],
};

export const ApiKeyContextSourceEntity: EntityDefinition = {
  entityName: "ApiKeyContextSource",
  tableName: "api_key_context_sources",
  owner: "control",
  columns: [
    column("api_key_id", "TEXT", { nullable: false, primaryKey: true }),
    column("source_type", "TEXT", { nullable: false, primaryKey: true }),
    column("token", "TEXT"),
    column("base_url", "TEXT"),
    column("vault_path", "TEXT"),
    column("enabled", "INTEGER", { nullable: false, default: "1" }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

export const AutoCandidateOverrideEntity: EntityDefinition = {
  entityName: "AutoCandidateOverride",
  tableName: "auto_candidate_overrides",
  owner: "control",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("api_key_id", "TEXT", { nullable: false }),
    column("auto_channel", "TEXT", { nullable: false }),
    column("connection_id", "TEXT", { nullable: false }),
    column("excluded", "INTEGER", { nullable: false, default: "1" }),
    column("created_at", "TEXT", { nullable: false }),
  ],
};

export const CliAccessTokenEntity: EntityDefinition = {
  entityName: "CliAccessToken",
  tableName: "cli_access_tokens",
  owner: "control",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("token_hash", "TEXT", { nullable: false }),
    column("token_prefix", "TEXT", { nullable: false }),
    column("name", "TEXT", { nullable: false }),
    column("scope", "TEXT", { nullable: false, default: "'read'" }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("last_used_at", "TEXT"),
    column("expires_at", "TEXT"),
    column("revoked_at", "TEXT"),
  ],
};

export const ComboAdaptationStateEntity: EntityDefinition = {
  entityName: "ComboAdaptationState",
  tableName: "combo_adaptation_state",
  owner: "gateway",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("combo_id", "TEXT", { nullable: false }),
    column("provider_id", "TEXT", { nullable: false }),
    column("learned_score", "REAL", { default: "0.5" }),
    column("request_count", "INTEGER", { default: "0" }),
    column("success_count", "INTEGER", { default: "0" }),
    column("avg_latency_ms", "REAL"),
    column("last_failure_at", "TEXT"),
    column("excluded_until", "TEXT"),
    column("updated_at", "TEXT", { default: "datetime('now')" }),
  ],
};

export const CommandCodeAuthSessionEntity: EntityDefinition = {
  entityName: "CommandCodeAuthSession",
  tableName: "command_code_auth_sessions",
  owner: "control",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("state_hash", "TEXT", { nullable: false }),
    column("status", "TEXT", { nullable: false, default: "'pending'" }),
    column("encrypted_api_key", "TEXT"),
    column("metadata_json", "TEXT"),
    column("created_at", "TEXT", { nullable: false }),
    column("expires_at", "TEXT", { nullable: false }),
    column("received_at", "TEXT"),
    column("applied_at", "TEXT"),
    column("updated_at", "TEXT", { nullable: false }),
  ],
};

export const CompressionRunTelemetryEntity: EntityDefinition = {
  entityName: "CompressionRunTelemetry",
  tableName: "compression_run_telemetry",
  owner: "gateway",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("timestamp", "INTEGER", { nullable: false }),
    column("request_id", "TEXT"),
    column("model", "TEXT"),
    column("provider", "TEXT"),
    column("source", "TEXT"),
    column("tokens_before", "INTEGER", { nullable: false }),
    column("tokens_after", "INTEGER", { nullable: false }),
    column("ratio", "REAL"),
    column("cost_delta", "REAL"),
    column("output_styles", "TEXT"),
    column("output_style_bypass", "TEXT"),
    column("output_tokens", "INTEGER"),
  ],
};

export const ConnectionRuntimeStateEntity: EntityDefinition = {
  entityName: "ConnectionRuntimeState",
  tableName: "connection_runtime_state",
  owner: "gateway",
  columns: [
    column("connection_id", "TEXT", { nullable: false, primaryKey: true }),
    column("refresh_circuit_streak", "INTEGER", { default: "0" }),
    column("refresh_circuit_until", "TEXT"),
    column("refresh_last_fail_at", "TEXT"),
    column("warmup_circuit_streak", "INTEGER", { default: "0" }),
    column("warmup_circuit_until", "TEXT"),
    column("warmup_last_fail_at", "TEXT"),
    column("last_warmup_at", "TEXT"),
    column("last_warmup_result", "TEXT"),
    column("warmup_tokens_used", "INTEGER", { default: "0" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/** Bootstrap metadata (not business data) maintained by the control schema runner. */
export const DbMetaEntity: EntityDefinition = {
  entityName: "DbMeta",
  tableName: "db_meta",
  owner: "control",
  columns: [column("key", "TEXT", { nullable: false, primaryKey: true }), column("value", "TEXT")],
};

export const DomainBudgetEntity: EntityDefinition = {
  entityName: "DomainBudget",
  tableName: "domain_budgets",
  owner: "control",
  columns: [
    column("api_key_id", "TEXT", { nullable: false, primaryKey: true }),
    column("daily_limit_usd", "REAL", { nullable: false }),
    column("weekly_limit_usd", "REAL", { default: "0" }),
    column("monthly_limit_usd", "REAL", { default: "0" }),
    column("warning_threshold", "REAL", { default: "0.8" }),
    column("reset_interval", "TEXT", { default: "'daily'" }),
    column("reset_time", "TEXT", { default: "'00:00'" }),
    column("budget_reset_at", "INTEGER"),
    column("last_budget_reset_at", "INTEGER"),
    column("warning_emitted_at", "INTEGER"),
    column("warning_period_start", "INTEGER"),
  ],
};

export const DomainBudgetResetLogEntity: EntityDefinition = {
  entityName: "DomainBudgetResetLog",
  tableName: "domain_budget_reset_logs",
  owner: "gateway",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("api_key_id", "TEXT", { nullable: false }),
    column("reset_interval", "TEXT", { nullable: false }),
    column("previous_spend", "REAL", { nullable: false, default: "0" }),
    column("reset_at", "INTEGER", { nullable: false }),
    column("next_reset_at", "INTEGER", { nullable: false }),
    column("period_start", "INTEGER", { nullable: false }),
    column("period_end", "INTEGER", { nullable: false }),
  ],
};

export const DomainCostHistoryEntity: EntityDefinition = {
  entityName: "DomainCostHistory",
  tableName: "domain_cost_history",
  owner: "gateway",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("api_key_id", "TEXT", { nullable: false }),
    column("cost", "REAL", { nullable: false }),
    column("timestamp", "INTEGER", { nullable: false }),
  ],
};

export const DomainFallbackChainEntity: EntityDefinition = {
  entityName: "DomainFallbackChain",
  tableName: "domain_fallback_chains",
  owner: "control",
  columns: [column("model", "TEXT", { nullable: false, primaryKey: true }), column("chain", "TEXT", { nullable: false })],
};

export const DomainLockoutStateEntity: EntityDefinition = {
  entityName: "DomainLockoutState",
  tableName: "domain_lockout_state",
  owner: "gateway",
  columns: [
    column("identifier", "TEXT", { nullable: false, primaryKey: true }),
    column("attempts", "TEXT", { nullable: false }),
    column("locked_until", "INTEGER"),
  ],
};

export const DomainCircuitBreakerEntity: EntityDefinition = {
  entityName: "DomainCircuitBreaker",
  tableName: "domain_circuit_breakers",
  owner: "gateway",
  columns: [
    column("name", "TEXT", { nullable: false, primaryKey: true }),
    column("state", "TEXT", { nullable: false, default: "'CLOSED'" }),
    column("failure_count", "INTEGER", { default: "0" }),
    column("last_failure_time", "INTEGER"),
    column("options", "TEXT"),
  ],
};

export const ExclusiveConnectionLeaseEntity: EntityDefinition = {
  entityName: "ExclusiveConnectionLease",
  tableName: "exclusive_connection_leases",
  owner: "gateway",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("lease_owner_hash", "TEXT", { nullable: false }),
    column("api_key_id", "TEXT", { nullable: false }),
    column("provider", "TEXT", { nullable: false }),
    column("connection_id", "TEXT", { nullable: false }),
    column("generation", "INTEGER", { nullable: false }),
    column("state", "TEXT", { nullable: false }),
    column("acquired_at", "TEXT", { nullable: false }),
    column("renewed_at", "TEXT", { nullable: false }),
    column("expires_at", "TEXT", { nullable: false }),
    column("ended_at", "TEXT"),
    column("end_reason", "TEXT"),
  ],
};

export const PromptTemplateEntity: EntityDefinition = {
  entityName: "PromptTemplate",
  tableName: "prompt_templates",
  owner: "control",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("slug", "TEXT", { nullable: false }),
    column("version", "INTEGER", { nullable: false, default: "1" }),
    column("content", "TEXT", { nullable: false }),
    column("content_hash", "TEXT", { nullable: false }),
    column("variables", "TEXT"),
    column("description", "TEXT"),
    column("is_active", "INTEGER", { nullable: false, default: "1" }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

export const RequestDetailLogEntity: EntityDefinition = {
  entityName: "RequestDetailLog",
  tableName: "request_detail_logs",
  owner: "gateway",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("call_log_id", "TEXT"),
    column("timestamp", "TEXT", { nullable: false }),
    column("client_request", "TEXT"),
    column("translated_request", "TEXT"),
    column("provider_response", "TEXT"),
    column("client_response", "TEXT"),
    column("provider", "TEXT"),
    column("model", "TEXT"),
    column("source_format", "TEXT"),
    column("target_format", "TEXT"),
    column("duration_ms", "INTEGER", { default: "0" }),
  ],
};

export const SessionAccountAffinityEntity: EntityDefinition = {
  entityName: "SessionAccountAffinity",
  tableName: "session_account_affinity",
  owner: "gateway",
  columns: [
    column("session_key", "TEXT", { nullable: false, primaryKey: true }),
    column("provider", "TEXT", { nullable: false, primaryKey: true }),
    column("connection_id", "TEXT", { nullable: false }),
    column("created_at", "INTEGER", { nullable: false }),
    column("last_seen_at", "INTEGER", { nullable: false }),
  ],
};

/** Embedded-service lifecycle state shared by the control service modules. */
export const VersionManagerEntity: EntityDefinition = {
  entityName: "VersionManager",
  tableName: "version_manager",
  owner: "control",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("tool", "TEXT", { nullable: false }),
    column("current_version", "TEXT"),
    column("installed_version", "TEXT"),
    column("pinned_version", "TEXT"),
    column("binary_path", "TEXT"),
    column("status", "TEXT", { nullable: false, default: "'not_installed'" }),
    column("pid", "INTEGER"),
    column("port", "INTEGER", { default: "8317" }),
    column("api_key", "TEXT"),
    column("management_key", "TEXT"),
    column("auto_update", "INTEGER", { nullable: false, default: "1" }),
    column("auto_start", "INTEGER", { nullable: false, default: "0" }),
    column("last_health_check", "TEXT"),
    column("last_update_check", "TEXT"),
    column("health_status", "TEXT", { default: "'unknown'" }),
    column("config_overrides", "TEXT"),
    column("error_message", "TEXT"),
    column("logs_buffer_path", "TEXT"),
    column("provider_expose", "INTEGER", { nullable: false, default: "0" }),
    column("last_sync_at", "TEXT"),
    column("auto_restart_adopted", "INTEGER", { nullable: false, default: "0" }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};
