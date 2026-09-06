import { column, type EntityDefinition } from "./definition.js";

export const SettingsEntity: EntityDefinition = {
  entityName: "Settings",
  tableName: "key_value",
  owner: "control-api",
  columns: [
    column("namespace", "TEXT", { nullable: false, primaryKey: true }),
    column("key", "TEXT", { nullable: false, primaryKey: true }),
    column("value", "TEXT", { nullable: false }),
  ],
};

export const ProviderConnectionEntity: EntityDefinition = {
  entityName: "ProviderConnection",
  tableName: "provider_connections",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("provider", "TEXT", { nullable: false }),
    column("auth_type", "TEXT"), column("name", "TEXT"), column("email", "TEXT"),
    column("priority", "INTEGER", { default: "0" }), column("is_active", "INTEGER", { default: "1" }),
    column("access_token", "TEXT"), column("refresh_token", "TEXT"), column("expires_at", "TEXT"),
    column("token_expires_at", "TEXT"), column("scope", "TEXT"), column("project_id", "TEXT"),
    column("test_status", "TEXT"), column("error_code", "TEXT"), column("last_error", "TEXT"),
    column("last_error_at", "TEXT"), column("last_error_type", "TEXT"), column("last_error_source", "TEXT"),
    column("backoff_level", "INTEGER", { default: "0" }), column("rate_limited_until", "TEXT"),
    column("health_check_interval", "INTEGER"), column("last_health_check_at", "TEXT"), column("last_tested", "TEXT"),
    column("api_key", "TEXT"), column("id_token", "TEXT"), column("provider_specific_data", "TEXT"),
    column("expires_in", "INTEGER"), column("display_name", "TEXT"), column("global_priority", "INTEGER"),
    column("default_model", "TEXT"), column("token_type", "TEXT"), column("consecutive_use_count", "INTEGER", { default: "0" }),
    column("rate_limit_protection", "INTEGER", { default: "0" }), column("created_at", "TEXT", { nullable: false }),
    column("updated_at", "TEXT", { nullable: false }), column("max_concurrent", "INTEGER"),
    column("group", "TEXT"), column("quota_window_thresholds_json", "TEXT"), column("rate_limit_overrides_json", "TEXT"),
    column("proxy_enabled", "INTEGER", { nullable: false, default: "1" }),
    column("per_key_proxy_enabled", "INTEGER", { nullable: false, default: "0" }), column("last_ping_at", "TEXT"),
    column("last_pinged_reset_key", "TEXT"), column("quota_visible", "INTEGER", { nullable: false, default: "1" }),
  ],
};

export const ProviderNodeEntity: EntityDefinition = {
  entityName: "ProviderNode",
  tableName: "provider_nodes",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }), column("type", "TEXT", { nullable: false }),
    column("name", "TEXT", { nullable: false }), column("prefix", "TEXT"), column("api_type", "TEXT"),
    column("base_url", "TEXT"), column("created_at", "TEXT", { nullable: false }),
    column("updated_at", "TEXT", { nullable: false }), column("chat_path", "TEXT"),
    column("models_path", "TEXT"), column("custom_headers_json", "TEXT"), column("icon_url", "TEXT"),
  ],
};

export const ApiKeyEntity: EntityDefinition = {
  entityName: "ApiKey",
  tableName: "api_keys",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }), column("name", "TEXT", { nullable: false }),
    column("key", "TEXT", { nullable: false }), column("machine_id", "TEXT"),
    column("created_at", "TEXT", { nullable: false }), column("revoked_at", "TEXT"), column("expires_at", "TEXT"),
    column("last_used_at", "TEXT"), column("key_prefix", "TEXT"), column("ip_allowlist", "TEXT"),
    column("scopes", "TEXT"), column("allowed_combos", "TEXT"), column("throttle_delay_ms", "INTEGER"),
    column("stream_default_mode", "TEXT", { nullable: false, default: "'legacy'" }),
    column("allowed_quotas", "TEXT", { nullable: false, default: "'[]'" }),
    column("disable_non_public_models", "INTEGER", { nullable: false, default: "0" }),
    column("usage_limit_enabled", "INTEGER", { nullable: false, default: "0" }), column("daily_usage_limit_usd", "REAL"),
    column("weekly_usage_limit_usd", "REAL"), column("cache_default_mode", "TEXT", { nullable: false, default: "'legacy'" }),
    column("model_access_mode", "TEXT", { nullable: false, default: "'all'" }),
    column("compression_enabled", "INTEGER", { nullable: false, default: "1" }),
  ],
};

export const ComboEntity: EntityDefinition = {
  entityName: "Combo",
  tableName: "combos",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }), column("name", "TEXT", { nullable: false }),
    column("data", "TEXT", { nullable: false }), column("created_at", "TEXT", { nullable: false }),
    column("updated_at", "TEXT", { nullable: false }), column("system_message", "TEXT", { default: "NULL" }),
    column("tool_filter_regex", "TEXT", { default: "NULL" }), column("context_cache_protection", "INTEGER", { default: "0" }),
    column("sort_order", "INTEGER", { nullable: false, default: "0" }),
  ],
};

export const ModelComboMappingEntity: EntityDefinition = {
  entityName: "ModelComboMapping",
  tableName: "model_combo_mappings",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }), column("pattern", "TEXT", { nullable: false }),
    column("combo_id", "TEXT", { nullable: false }), column("priority", "INTEGER", { default: "0" }),
    column("enabled", "INTEGER", { default: "1" }), column("description", "TEXT", { default: "''" }),
    column("created_at", "TEXT", { nullable: false }), column("updated_at", "TEXT", { nullable: false }),
  ],
};

export const WebhookEntity: EntityDefinition = {
  entityName: "Webhook",
  tableName: "webhooks",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }), column("url", "TEXT", { nullable: false }),
    column("events", "TEXT", { nullable: false, default: "'[\"*\"]'" }), column("secret", "TEXT"),
    column("enabled", "INTEGER", { default: "1" }), column("description", "TEXT", { default: "''" }),
    column("created_at", "TEXT", { default: "datetime('now')" }), column("last_triggered_at", "TEXT"),
    column("last_status", "INTEGER"), column("failure_count", "INTEGER", { default: "0" }),
    column("kind", "TEXT", { nullable: false, default: "'custom'" }), column("metadata_encrypted", "BLOB"),
  ],
};

export const KeyGroupEntity: EntityDefinition = {
  entityName: "KeyGroup",
  tableName: "key_groups",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }), column("name", "TEXT", { nullable: false }),
    column("description", "TEXT", { nullable: false, default: "''" }), column("is_active", "INTEGER", { nullable: false, default: "1" }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }), column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/** Operator-managed token budgets consumed by the edge request pipeline. */
export const ApiKeyTokenLimitEntity: EntityDefinition = {
  entityName: "ApiKeyTokenLimit",
  tableName: "api_key_token_limits",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("api_key_id", "TEXT", { nullable: false }),
    column("scope_type", "TEXT", { nullable: false }),
    column("scope_value", "TEXT", { nullable: false, default: "''" }),
    column("token_limit", "INTEGER", { nullable: false }),
    column("reset_interval", "TEXT", { nullable: false, default: "'monthly'" }),
    column("reset_time", "TEXT"),
    column("enabled", "INTEGER", { nullable: false, default: "1" }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/** Per-connection quota plans configured by the control plane and read by edge routing. */
export const ProviderPlanEntity: EntityDefinition = {
  entityName: "ProviderPlan",
  tableName: "provider_plans",
  owner: "control-api",
  columns: [
    column("connection_id", "TEXT", { nullable: false, primaryKey: true }),
    column("provider", "TEXT", { nullable: false }),
    column("dimensions_json", "TEXT", { nullable: false }),
    column("source", "TEXT", { nullable: false, default: "'manual'" }),
    column("updated_at", "TEXT", { nullable: false, default: "CURRENT_TIMESTAMP" }),
  ],
};

/** Installed plugin manifests/configuration managed by control and loaded by edge hooks. */
export const PluginEntity: EntityDefinition = {
  entityName: "Plugin",
  tableName: "plugins",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("name", "TEXT", { nullable: false }),
    column("version", "TEXT", { nullable: false, default: "'1.0.0'" }),
    column("description", "TEXT"),
    column("author", "TEXT"),
    column("license", "TEXT", { default: "'MIT'" }),
    column("main", "TEXT", { nullable: false, default: "'index.js'" }),
    column("source", "TEXT", { nullable: false, default: "'local'" }),
    column("tags", "TEXT", { default: "'[]'" }),
    column("status", "TEXT", { nullable: false, default: "'installed'" }),
    column("enabled", "INTEGER", { nullable: false, default: "0" }),
    column("manifest", "TEXT", { nullable: false }),
    column("config", "TEXT", { default: "'{}'" }),
    column("config_schema", "TEXT", { default: "'{}'" }),
    column("hooks", "TEXT", { default: "'[]'" }),
    column("permissions", "TEXT", { default: "'[]'" }),
    column("plugin_dir", "TEXT", { nullable: false }),
    column("error_message", "TEXT"),
    column("installed_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("activated_at", "TEXT"),
  ],
};

/** Operator overrides applied by edge model resolution and managed in control. */
export const ModelContextOverrideEntity: EntityDefinition = {
  entityName: "ModelContextOverride",
  tableName: "model_context_overrides",
  owner: "control-api",
  columns: [
    column("provider", "TEXT", { nullable: false, primaryKey: true }),
    column("model_id", "TEXT", { nullable: false, primaryKey: true }),
    column("real_context", "INTEGER", { nullable: false }),
    column("source", "TEXT", { nullable: false, default: "'manual'" }),
    column("refreshed_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

export const ModelCapabilityOverrideEntity: EntityDefinition = {
  entityName: "ModelCapabilityOverride",
  tableName: "model_capability_overrides",
  owner: "control-api",
  columns: [
    column("provider", "TEXT", { nullable: false, primaryKey: true }),
    column("model_id", "TEXT", { nullable: false, primaryKey: true }),
    column("override_key", "TEXT", { nullable: false, primaryKey: true }),
    column("override_value", "TEXT", { nullable: false }),
    column("refreshed_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/** Operator-managed provider/model routing-tier overrides. */
export const TierConfigEntity: EntityDefinition = {
  entityName: "TierConfig",
  tableName: "tier_config",
  owner: "control-api",
  columns: [
    column("key", "TEXT", { nullable: false, primaryKey: true }),
    column("value", "TEXT", { nullable: false }),
    column("updated_at", "TEXT", { default: "datetime('now')" }),
  ],
};

/** Materialized tier assignments retained for routing diagnostics. */
export const TierAssignmentEntity: EntityDefinition = {
  entityName: "TierAssignment",
  tableName: "tier_assignments",
  owner: "control-api",
  columns: [
    column("provider", "TEXT", { nullable: false, primaryKey: true }),
    column("model", "TEXT", { nullable: false, primaryKey: true }),
    column("tier", "TEXT", { nullable: false }),
    column("cost_per_1m_input", "REAL", { default: "0" }),
    column("cost_per_1m_output", "REAL", { default: "0" }),
    column("has_free_tier", "INTEGER", { default: "0" }),
    column("free_quota_limit", "INTEGER"),
    column("reason", "TEXT"),
    column("updated_at", "TEXT", { default: "datetime('now')" }),
  ],
};

/** Free-proxy catalog shared by control management and the worker sync job. */
export const FreeProxyEntity: EntityDefinition = {
  entityName: "FreeProxy",
  tableName: "free_proxies",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("source", "TEXT", { nullable: false }),
    column("host", "TEXT", { nullable: false }),
    column("port", "INTEGER", { nullable: false }),
    column("type", "TEXT", { nullable: false, default: "'http'" }),
    column("country_code", "TEXT"),
    column("quality_score", "INTEGER"),
    column("latency_ms", "INTEGER"),
    column("anonymity", "TEXT"),
    column("last_validated", "TEXT"),
    column("in_pool", "INTEGER", { default: "0" }),
    column("pool_proxy_id", "TEXT"),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/** Last per-source free-proxy sync failures surfaced by the control UI. */
export const FreeProxySyncErrorEntity: EntityDefinition = {
  entityName: "FreeProxySyncError",
  tableName: "free_proxy_sync_errors",
  owner: "control-api",
  columns: [
    column("source", "TEXT", { nullable: false, primaryKey: true }),
    column("errors", "TEXT", { nullable: false }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};
