import { column, type EntityDefinition } from "./definition.js";

/** Radar feed/cache tables are read by control-api and the worker scheduler. */
export const RadarFeedCacheEntity: EntityDefinition = { entityName: "RadarFeedCache", tableName: "radar_feed_cache", owner: "control-api", columns: [column("id", "INTEGER", { nullable: false, primaryKey: true }), column("version", "TEXT"), column("generated_at", "TEXT"), column("tier", "TEXT"), column("payload", "TEXT"), column("signature", "TEXT"), column("fetched_at", "TEXT")] };
export const RadarSettingsEntity: EntityDefinition = { entityName: "RadarSettings", tableName: "radar_settings", owner: "control-api", columns: [column("id", "INTEGER", { nullable: false, primaryKey: true }), column("opt_in", "INTEGER", { nullable: false, default: "0" }), column("supporter_key_encrypted", "TEXT"), column("updated_at", "TEXT")] };
export const RadarReferralsCacheEntity: EntityDefinition = { entityName: "RadarReferralsCache", tableName: "radar_referrals_cache", owner: "control-api", columns: [column("id", "INTEGER", { nullable: false, primaryKey: true }), column("generated_at", "TEXT"), column("tier", "TEXT"), column("payload", "TEXT"), column("signature", "TEXT"), column("fetched_at", "TEXT")] };
export const RadarOffersCacheEntity: EntityDefinition = { entityName: "RadarOffersCache", tableName: "radar_offers_cache", owner: "control-api", columns: [column("id", "INTEGER", { nullable: false, primaryKey: true }), column("version", "TEXT", { nullable: false }), column("tier", "TEXT", { nullable: false }), column("payload", "TEXT", { nullable: false }), column("signature", "TEXT", { nullable: false }), column("fetched_at", "TEXT", { nullable: false })] };
export const RadarIntelCacheEntity: EntityDefinition = { entityName: "RadarIntelCache", tableName: "radar_intel_cache", owner: "control-api", columns: [column("id", "INTEGER", { nullable: false, primaryKey: true }), column("version", "TEXT", { nullable: false }), column("tier", "TEXT", { nullable: false }), column("payload", "TEXT", { nullable: false }), column("signature", "TEXT", { nullable: false }), column("supporter_identity", "TEXT", { nullable: false }), column("fetched_at", "TEXT", { nullable: false, default: "datetime('now')" })] };
export const RadarLocalModelStateEntity: EntityDefinition = { entityName: "RadarLocalModelState", tableName: "radar_local_model_state", owner: "control-api", columns: [column("provider", "TEXT", { nullable: false, primaryKey: true }), column("model_id", "TEXT", { nullable: false, primaryKey: true }), column("display_name", "TEXT"), column("enabled", "INTEGER"), column("tombstoned", "INTEGER", { nullable: false, default: "0" }), column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" })] };

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

/** Configuration change history maintained by the control plane. */
export const ConfigAuditLogEntity: EntityDefinition = {
  entityName: "ConfigAuditLog",
  tableName: "config_audit_log",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("timestamp", "TEXT", { nullable: false }),
    column("action", "TEXT", { nullable: false }),
    column("target", "TEXT", { nullable: false }),
    column("target_id", "TEXT", { nullable: false }),
    column("target_name", "TEXT", { nullable: false }),
    column("before_json", "TEXT"),
    column("after_json", "TEXT"),
    column("diff_json", "TEXT", { nullable: false }),
    column("source", "TEXT", { nullable: false }),
    column("note", "TEXT"),
  ],
};

/** Playground request presets maintained by the control plane. */
export const PlaygroundPresetEntity: EntityDefinition = {
  entityName: "PlaygroundPreset",
  tableName: "playground_presets",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("name", "TEXT", { nullable: false }),
    column("endpoint", "TEXT", { nullable: false }),
    column("model", "TEXT", { nullable: false }),
    column("system", "TEXT"),
    column("params_json", "TEXT", { nullable: false, default: "'{}'" }),
    column("created_at", "TEXT", { nullable: false, default: "CURRENT_TIMESTAMP" }),
  ],
};

/** Aggregate plugin execution metrics maintained by the control plane. */
export const PluginMetricEntity: EntityDefinition = {
  entityName: "PluginMetric",
  tableName: "plugin_metrics",
  owner: "control-api",
  columns: [
    column("plugin_name", "TEXT", { nullable: false, primaryKey: true }),
    column("event", "TEXT", { nullable: false, primaryKey: true }),
    column("calls", "INTEGER", { nullable: false, default: "0" }),
    column("errors", "INTEGER", { nullable: false, default: "0" }),
    column("total_duration_ms", "REAL", { nullable: false, default: "0" }),
    column("last_called_at", "TEXT"),
  ],
};

/** Skill definitions are managed by control-api and injected/executed by edge. */
export const SkillEntity: EntityDefinition = {
  entityName: "Skill",
  tableName: "skills",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("api_key_id", "TEXT", { nullable: false }),
    column("name", "TEXT", { nullable: false }),
    column("version", "TEXT", { nullable: false, default: "'1.0.0'" }),
    column("description", "TEXT"),
    column("schema", "TEXT", { nullable: false }),
    column("handler", "TEXT", { nullable: false }),
    column("enabled", "INTEGER", { nullable: false, default: "1" }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("mode", "TEXT", { nullable: false, default: "'auto'" }),
    column("source_provider", "TEXT"),
    column("tags", "TEXT"),
    column("install_count", "INTEGER", { nullable: false, default: "0" }),
  ],
};

/** Skill execution audit records are written by the shared runtime. */
export const SkillExecutionEntity: EntityDefinition = {
  entityName: "SkillExecution",
  tableName: "skill_executions",
  owner: "edge-gateway",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("skill_id", "TEXT", { nullable: false }),
    column("api_key_id", "TEXT", { nullable: false }),
    column("session_id", "TEXT"),
    column("input", "TEXT", { nullable: false }),
    column("output", "TEXT"),
    column("status", "TEXT", { nullable: false }),
    column("error_message", "TEXT"),
    column("duration_ms", "INTEGER"),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
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

/** API keys provisioned for a provider/account by the control plane. */
export const RegisteredKeyEntity: EntityDefinition = {
  entityName: "RegisteredKey",
  tableName: "registered_keys",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("key", "TEXT", { nullable: false }),
    column("key_prefix", "TEXT", { nullable: false }),
    column("name", "TEXT", { nullable: false }),
    column("provider", "TEXT", { nullable: false, default: "''" }),
    column("account_id", "TEXT", { nullable: false, default: "''" }),
    column("is_active", "INTEGER", { nullable: false, default: "1" }),
    column("revoked_at", "TEXT"),
    column("expires_at", "TEXT"),
    column("idempotency_key", "TEXT"),
    column("daily_budget", "INTEGER"),
    column("hourly_budget", "INTEGER"),
    column("daily_used", "INTEGER", { nullable: false, default: "0" }),
    column("hourly_used", "INTEGER", { nullable: false, default: "0" }),
    column("last_reset_day", "TEXT", { nullable: false, default: "''" }),
    column("last_reset_hour", "TEXT", { nullable: false, default: "''" }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/** Per-provider issuance limits for registered keys. */
export const ProviderKeyLimitEntity: EntityDefinition = {
  entityName: "ProviderKeyLimit",
  tableName: "provider_key_limits",
  owner: "control-api",
  columns: [
    column("provider", "TEXT", { nullable: false, primaryKey: true }),
    column("max_active_keys", "INTEGER"),
    column("daily_issue_limit", "INTEGER"),
    column("hourly_issue_limit", "INTEGER"),
    column("daily_issued", "INTEGER", { nullable: false, default: "0" }),
    column("hourly_issued", "INTEGER", { nullable: false, default: "0" }),
    column("last_reset_day", "TEXT", { nullable: false, default: "''" }),
    column("last_reset_hour", "TEXT", { nullable: false, default: "''" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/** Per-account issuance limits for registered keys. */
export const AccountKeyLimitEntity: EntityDefinition = {
  entityName: "AccountKeyLimit",
  tableName: "account_key_limits",
  owner: "control-api",
  columns: [
    column("account_id", "TEXT", { nullable: false, primaryKey: true }),
    column("max_active_keys", "INTEGER"),
    column("daily_issue_limit", "INTEGER"),
    column("hourly_issue_limit", "INTEGER"),
    column("daily_issued", "INTEGER", { nullable: false, default: "0" }),
    column("hourly_issued", "INTEGER", { nullable: false, default: "0" }),
    column("last_reset_day", "TEXT", { nullable: false, default: "''" }),
    column("last_reset_hour", "TEXT", { nullable: false, default: "''" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
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

/** Named compression pipelines managed by control-api and consumed by edge runtime. */
export const CompressionComboEntity: EntityDefinition = {
  entityName: "CompressionCombo",
  tableName: "compression_combos",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("name", "TEXT", { nullable: false }),
    column("description", "TEXT", { default: "''" }),
    column("pipeline", "TEXT", { nullable: false, default: "'[]'" }),
    column("language_packs", "TEXT", { default: "'[\"en\"]'" }),
    column("output_mode", "INTEGER", { default: "0" }),
    column("output_mode_intensity", "TEXT", { default: "'full'" }),
    column("is_default", "INTEGER", { default: "0" }),
    column("created_at", "TEXT", { default: "datetime('now')" }),
    column("updated_at", "TEXT", { default: "datetime('now')" }),
  ],
};

/** Routing-combo assignments for named compression pipelines. */
export const CompressionComboAssignmentEntity: EntityDefinition = {
  entityName: "CompressionComboAssignment",
  tableName: "compression_combo_assignments",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("compression_combo_id", "TEXT", { nullable: false }),
    column("routing_combo_id", "TEXT", { nullable: false }),
    column("created_at", "TEXT", { default: "datetime('now')" }),
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

/** Proxy registry and scope-pool tables are shared by control-plane writes and edge resolution. */
export const ProxyRegistryEntity: EntityDefinition = {
  entityName: "ProxyRegistry",
  tableName: "proxy_registry",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("name", "TEXT", { nullable: false }),
    column("type", "TEXT", { nullable: false }),
    column("host", "TEXT", { nullable: false }),
    column("port", "INTEGER", { nullable: false }),
    column("username", "TEXT"),
    column("password", "TEXT"),
    column("region", "TEXT"),
    column("notes", "TEXT"),
    column("status", "TEXT", { nullable: false, default: "'active'" }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("source", "TEXT", { nullable: false, default: "'manual'" }),
    column("quality_score", "INTEGER"),
    column("latency_ms", "INTEGER"),
    column("anonymity", "TEXT"),
    column("google_access", "INTEGER", { default: "0" }),
    column("last_validated", "TEXT"),
    column("country_code", "TEXT"),
    column("family", "TEXT", { nullable: false, default: "'auto'" }),
    column("subscription_id", "TEXT"),
  ],
};

export const ProxyAssignmentEntity: EntityDefinition = {
  entityName: "ProxyAssignment",
  tableName: "proxy_assignments",
  owner: "control-api",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("proxy_id", "TEXT", { nullable: false }),
    column("scope", "TEXT", { nullable: false }),
    column("scope_id", "TEXT"),
    column("position", "INTEGER", { nullable: false, default: "0" }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

export const ProxyScopeRotationEntity: EntityDefinition = {
  entityName: "ProxyScopeRotation",
  tableName: "proxy_scope_rotation",
  owner: "control-api",
  columns: [
    column("scope", "TEXT", { nullable: false, primaryKey: true }),
    column("scope_id", "TEXT", { nullable: false, primaryKey: true }),
    column("strategy", "TEXT", { nullable: false, default: "'round-robin'" }),
    column("cursor", "INTEGER", { nullable: false, default: "0" }),
    column("sticky_window_minutes", "INTEGER", { nullable: false, default: "30" }),
    column("rotated_at", "TEXT"),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

export const ProxySubscriptionEntity: EntityDefinition = {
  entityName: "ProxySubscription",
  tableName: "proxy_subscriptions",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("name", "TEXT", { nullable: false }),
    column("url", "TEXT", { nullable: false }),
    column("enabled", "INTEGER", { nullable: false, default: "0" }),
    column("mode", "TEXT", { nullable: false, default: "'global'" }),
    column("rule_providers", "TEXT"),
    column("local_core_endpoint", "TEXT"),
    column("update_interval_minutes", "INTEGER", { nullable: false, default: "60" }),
    column("last_fetched_at", "TEXT"),
    column("status", "TEXT", { nullable: false, default: "'empty'" }),
    column("error", "TEXT"),
    column("last_nodes", "TEXT"),
    column("last_error_at", "TEXT"),
    column("consecutive_failures", "INTEGER", { nullable: false, default: "0" }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
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

/** Operator-managed reasoning policies evaluated by the edge request pipeline. */
export const ReasoningRoutingRuleEntity: EntityDefinition = {
  entityName: "ReasoningRoutingRule",
  tableName: "reasoning_routing_rules",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("name", "TEXT", { nullable: false }),
    column("description", "TEXT", { nullable: false, default: "''" }),
    column("scope", "TEXT", { nullable: false }),
    column("api_key_id", "TEXT"),
    column("combo_id", "TEXT"),
    column("connection_id", "TEXT"),
    column("model_pattern", "TEXT"),
    column("source_effort", "TEXT", { nullable: false, default: "'any'" }),
    column("request_tags", "TEXT", { nullable: false, default: "'[]'" }),
    column("tag_match_mode", "TEXT", { nullable: false, default: "'any'" }),
    column("effort_mode", "TEXT", { nullable: false, default: "'inherit'" }),
    column("target_effort", "TEXT"),
    column("target_kind", "TEXT", { nullable: false, default: "'keep'" }),
    column("target_model", "TEXT"),
    column("target_combo_id", "TEXT"),
    column("budget_action", "TEXT", { nullable: false, default: "'preserve'" }),
    column("budget_tokens", "INTEGER"),
    column("priority", "INTEGER", { nullable: false, default: "0" }),
    column("enabled", "INTEGER", { nullable: false, default: "1" }),
    column("created_at", "TEXT", { nullable: false }),
    column("updated_at", "TEXT", { nullable: false }),
  ],
};

/** Quota-share groups configured by control and consumed by edge enforcement. */
export const QuotaGroupEntity: EntityDefinition = {
  entityName: "QuotaGroup",
  tableName: "quota_groups",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("name", "TEXT", { nullable: false }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/** Quota pools map provider connections into a shareable budget. */
export const QuotaPoolEntity: EntityDefinition = {
  entityName: "QuotaPool",
  tableName: "quota_pools",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("connection_id", "TEXT", { nullable: false }),
    column("name", "TEXT", { nullable: false }),
    column("created_at", "TEXT", { nullable: false, default: "CURRENT_TIMESTAMP" }),
    column("group_id", "TEXT"),
  ],
};

/** Per-key allocations and policy caps within a quota pool. */
export const QuotaAllocationEntity: EntityDefinition = {
  entityName: "QuotaAllocation",
  tableName: "quota_allocations",
  owner: "control-api",
  columns: [
    column("pool_id", "TEXT", { nullable: false, primaryKey: true }),
    column("api_key_id", "TEXT", { nullable: false, primaryKey: true }),
    column("weight", "REAL", { nullable: false }),
    column("cap_value", "REAL"),
    column("cap_unit", "TEXT"),
    column("policy", "TEXT", { nullable: false, default: "'hard'" }),
  ],
};

/** Authoritative multi-provider membership for a quota pool. */
export const QuotaPoolConnectionEntity: EntityDefinition = {
  entityName: "QuotaPoolConnection",
  tableName: "quota_pool_connections",
  owner: "control-api",
  columns: [
    column("pool_id", "TEXT", { nullable: false, primaryKey: true }),
    column("connection_id", "TEXT", { nullable: false, primaryKey: true }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/** Optional per-model budget caps within a key allocation. */
export const QuotaAllocationModelCapEntity: EntityDefinition = {
  entityName: "QuotaAllocationModelCap",
  tableName: "quota_allocation_model_caps",
  owner: "control-api",
  columns: [
    column("pool_id", "TEXT", { nullable: false, primaryKey: true }),
    column("api_key_id", "TEXT", { nullable: false, primaryKey: true }),
    column("model", "TEXT", { nullable: false, primaryKey: true }),
    column("cap_value", "REAL", { nullable: false }),
    column("cap_unit", "TEXT", { nullable: false }),
  ],
};

/** Gamification aggregates maintained by the control plane. */
export const GamificationLeaderboardEntity: EntityDefinition = {
  entityName: "GamificationLeaderboard",
  tableName: "leaderboard",
  owner: "control-api",
  columns: [
    column("api_key_id", "TEXT", { nullable: false, primaryKey: true }),
    column("scope", "TEXT", { nullable: false, primaryKey: true, default: "'global'" }),
    column("score", "INTEGER", { nullable: false, default: "0" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

export const GamificationUserLevelEntity: EntityDefinition = {
  entityName: "GamificationUserLevel",
  tableName: "user_levels",
  owner: "control-api",
  columns: [
    column("api_key_id", "TEXT", { nullable: false, primaryKey: true }),
    column("total_xp", "INTEGER", { nullable: false, default: "0" }),
    column("current_level", "INTEGER", { nullable: false, default: "1" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

export const GamificationBadgeDefinitionEntity: EntityDefinition = {
  entityName: "GamificationBadgeDefinition",
  tableName: "badge_definitions",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("name", "TEXT", { nullable: false }),
    column("description", "TEXT"),
    column("icon", "TEXT"),
    column("category", "TEXT"),
    column("rarity", "TEXT", { nullable: false, default: "'common'" }),
    column("criteria", "TEXT"),
    column("hidden", "INTEGER", { nullable: false, default: "0" }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

export const GamificationUserBadgeEntity: EntityDefinition = {
  entityName: "GamificationUserBadge",
  tableName: "user_badges",
  owner: "control-api",
  columns: [
    column("api_key_id", "TEXT", { nullable: false, primaryKey: true }),
    column("badge_id", "TEXT", { nullable: false, primaryKey: true }),
    column("unlocked_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

export const GamificationXpAuditLogEntity: EntityDefinition = {
  entityName: "GamificationXpAuditLog",
  tableName: "xp_audit_log",
  owner: "control-api",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("api_key_id", "TEXT", { nullable: false }),
    column("action", "TEXT", { nullable: false }),
    column("xp_earned", "INTEGER", { nullable: false }),
    column("metadata", "TEXT"),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

export const GamificationTokenLedgerEntity: EntityDefinition = {
  entityName: "GamificationTokenLedger",
  tableName: "token_ledger",
  owner: "control-api",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("from_api_key_id", "TEXT", { nullable: false }),
    column("to_api_key_id", "TEXT", { nullable: false }),
    column("amount", "INTEGER", { nullable: false }),
    column("reason", "TEXT"),
    column("idempotency_key", "TEXT"),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

export const GamificationInviteTokenEntity: EntityDefinition = {
  entityName: "GamificationInviteToken",
  tableName: "invite_tokens",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("code", "TEXT", { nullable: false }),
    column("token_hash", "TEXT", { nullable: false }),
    column("created_by", "TEXT", { nullable: false }),
    column("used_by", "TEXT"),
    column("server_url", "TEXT"),
    column("max_uses", "INTEGER", { nullable: false, default: "1" }),
    column("use_count", "INTEGER", { nullable: false, default: "0" }),
    column("expires_at", "TEXT"),
    column("revoked_at", "TEXT"),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

export const GamificationCommunityServerEntity: EntityDefinition = {
  entityName: "GamificationCommunityServer",
  tableName: "community_servers",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("name", "TEXT", { nullable: false }),
    column("url", "TEXT", { nullable: false }),
    column("api_key_hash", "TEXT", { nullable: false }),
    column("connected_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("last_sync_at", "TEXT"),
    column("status", "TEXT", { nullable: false, default: "'connected'" }),
    column("error_message", "TEXT"),
  ],
};

/** Evaluation suites and cases are authored by the control plane. */
export const EvalSuiteEntity: EntityDefinition = {
  entityName: "EvalSuite",
  tableName: "eval_suites",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("name", "TEXT", { nullable: false }),
    column("description", "TEXT"),
    column("created_at", "TEXT", { nullable: false }),
    column("updated_at", "TEXT", { nullable: false }),
  ],
};

export const EvalCaseEntity: EntityDefinition = {
  entityName: "EvalCase",
  tableName: "eval_cases",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("suite_id", "TEXT", { nullable: false }),
    column("sort_order", "INTEGER", { nullable: false, default: "0" }),
    column("name", "TEXT", { nullable: false }),
    column("model", "TEXT"),
    column("input_json", "TEXT", { nullable: false }),
    column("expected_strategy", "TEXT", { nullable: false }),
    column("expected_value", "TEXT"),
    column("tags_json", "TEXT"),
    column("created_at", "TEXT", { nullable: false }),
    column("updated_at", "TEXT", { nullable: false }),
  ],
};

/** Evaluation run history is written by control-api and read by routing. */
export const EvalRunEntity: EntityDefinition = {
  entityName: "EvalRun",
  tableName: "eval_runs",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("run_group_id", "TEXT"),
    column("suite_id", "TEXT", { nullable: false }),
    column("suite_name", "TEXT", { nullable: false }),
    column("target_type", "TEXT", { nullable: false }),
    column("target_id", "TEXT"),
    column("target_label", "TEXT", { nullable: false }),
    column("api_key_id", "TEXT"),
    column("pass_rate", "INTEGER", { nullable: false, default: "0" }),
    column("total", "INTEGER", { nullable: false, default: "0" }),
    column("passed", "INTEGER", { nullable: false, default: "0" }),
    column("failed", "INTEGER", { nullable: false, default: "0" }),
    column("avg_latency_ms", "INTEGER", { nullable: false, default: "0" }),
    column("summary_json", "TEXT", { nullable: false }),
    column("results_json", "TEXT", { nullable: false }),
    column("outputs_json", "TEXT"),
    column("created_at", "TEXT", { nullable: false }),
  ],
};

/** Model/provider probe results maintained by the control-plane assessment engine. */
export const ModelAssessmentEntity: EntityDefinition = {
  entityName: "ModelAssessment",
  tableName: "model_assessments",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("model_id", "TEXT", { nullable: false }),
    column("provider_id", "TEXT", { nullable: false }),
    column("status", "TEXT", { nullable: false, default: "'unknown'" }),
    column("latency_p50", "INTEGER"),
    column("latency_p95", "INTEGER"),
    column("success_rate", "REAL", { default: "0" }),
    column("supports_vision", "INTEGER", { default: "0" }),
    column("supports_tool_call", "INTEGER", { default: "0" }),
    column("supports_streaming", "INTEGER", { default: "0" }),
    column("supports_structured_output", "INTEGER", { default: "0" }),
    column("max_context_window", "INTEGER"),
    column("max_output_tokens", "INTEGER"),
    column("categories", "TEXT", { default: "'[]'" }),
    column("fitness_scores", "TEXT", { default: "'{}'" }),
    column("tier", "TEXT", { default: "'balanced'" }),
    column("last_tested", "TEXT"),
    column("last_error", "TEXT"),
    column("consecutive_fails", "INTEGER", { default: "0" }),
    column("probe_count", "INTEGER", { default: "0" }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/** Historical assessment executions written by control-api. */
export const AssessmentRunEntity: EntityDefinition = {
  entityName: "AssessmentRun",
  tableName: "assessment_runs",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("started_at", "TEXT", { nullable: false }),
    column("completed_at", "TEXT"),
    column("models_tested", "INTEGER", { default: "0" }),
    column("models_passed", "INTEGER", { default: "0" }),
    column("models_failed", "INTEGER", { default: "0" }),
    column("models_rate_limited", "INTEGER", { default: "0" }),
    column("duration_ms", "INTEGER"),
    column("trigger", "TEXT", { default: "'on_demand'" }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/** Aggregate routing-combo health maintained by the assessment engine. */
export const ComboHealthEntity: EntityDefinition = {
  entityName: "ComboHealth",
  tableName: "combo_health",
  owner: "control-api",
  columns: [
    column("combo_id", "TEXT", { nullable: false, primaryKey: true }),
    column("healthy_model_count", "INTEGER", { default: "0" }),
    column("dead_model_count", "INTEGER", { default: "0" }),
    column("total_model_count", "INTEGER", { default: "0" }),
    column("health_score", "REAL", { default: "0" }),
    column("last_auto_fix", "TEXT"),
    column("auto_fix_count", "INTEGER", { default: "0" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/** Self-healing actions applied to routing combos by control-api. */
export const HealActionEntity: EntityDefinition = {
  entityName: "HealAction",
  tableName: "heal_actions",
  owner: "control-api",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("combo_id", "TEXT", { nullable: false }),
    column("action_type", "TEXT", { nullable: false }),
    column("model_id", "TEXT", { nullable: false }),
    column("provider_id", "TEXT", { nullable: false }),
    column("reason", "TEXT", { nullable: false }),
    column("previous_weight", "INTEGER"),
    column("new_weight", "INTEGER"),
    column("timestamp", "TEXT", { nullable: false }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};
