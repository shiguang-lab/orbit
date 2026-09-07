import { column, type EntityDefinition } from "./definition.js";

export const UsageHistoryEntity: EntityDefinition = {
  entityName: "UsageHistory", tableName: "usage_history", owner: "worker", columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }), column("provider", "TEXT"), column("model", "TEXT"),
    column("connection_id", "TEXT"), column("api_key_id", "TEXT"), column("api_key_name", "TEXT"),
    column("tokens_input", "INTEGER", { default: "0" }), column("tokens_output", "INTEGER", { default: "0" }),
    column("tokens_cache_read", "INTEGER", { default: "0" }), column("tokens_cache_creation", "INTEGER", { default: "0" }),
    column("tokens_reasoning", "INTEGER", { default: "0" }), column("service_tier", "TEXT", { default: "'standard'" }),
    column("account_key", "TEXT"), column("account_label", "TEXT"), column("account_label_priority", "INTEGER", { default: "0" }),
    column("status", "TEXT"), column("success", "INTEGER", { default: "1" }), column("latency_ms", "INTEGER", { default: "0" }),
    column("ttft_ms", "INTEGER", { default: "0" }), column("error_code", "TEXT"), column("timestamp", "TEXT", { nullable: false }),
    column("combo_strategy", "TEXT", { default: "'direct'" }), column("endpoint", "TEXT"),
  ],
};

/** Hourly usage rollups maintained by the worker retention/aggregation jobs. */
export const HourlyUsageSummaryEntity: EntityDefinition = {
  entityName: "HourlyUsageSummary",
  tableName: "hourly_usage_summary",
  owner: "worker",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("provider", "TEXT", { nullable: false }),
    column("model", "TEXT", { nullable: false }),
    column("date_hour", "TEXT", { nullable: false }),
    column("total_requests", "INTEGER", { nullable: false, default: "0" }),
    column("total_input_tokens", "INTEGER", { nullable: false, default: "0" }),
    column("total_output_tokens", "INTEGER", { nullable: false, default: "0" }),
    column("total_cost", "REAL", { nullable: false, default: "0.0" }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/** Daily usage rollups maintained by the worker retention/aggregation jobs. */
export const DailyUsageSummaryEntity: EntityDefinition = {
  entityName: "DailyUsageSummary",
  tableName: "daily_usage_summary",
  owner: "worker",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("provider", "TEXT", { nullable: false }),
    column("model", "TEXT", { nullable: false }),
    column("date", "TEXT", { nullable: false }),
    column("total_requests", "INTEGER", { nullable: false, default: "0" }),
    column("total_input_tokens", "INTEGER", { nullable: false, default: "0" }),
    column("total_output_tokens", "INTEGER", { nullable: false, default: "0" }),
    column("total_cost", "REAL", { nullable: false, default: "0.0" }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

export const CallLogEntity: EntityDefinition = {
  entityName: "CallLog", tableName: "call_logs", owner: "worker", columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }), column("timestamp", "TEXT", { nullable: false }), column("method", "TEXT"), column("path", "TEXT"),
    column("status", "INTEGER"), column("model", "TEXT"), column("requested_model", "TEXT"), column("provider", "TEXT"), column("account", "TEXT"), column("connection_id", "TEXT"),
    column("duration", "INTEGER", { default: "0" }), column("tokens_in", "INTEGER", { default: "0" }), column("tokens_out", "INTEGER", { default: "0" }),
    column("tokens_cache_read", "INTEGER", { default: "NULL" }), column("tokens_cache_creation", "INTEGER", { default: "NULL" }), column("tokens_reasoning", "INTEGER", { default: "NULL" }),
    column("cache_source", "TEXT", { default: "'upstream'" }), column("request_type", "TEXT"), column("source_format", "TEXT"), column("target_format", "TEXT"),
    column("api_key_id", "TEXT"), column("api_key_name", "TEXT"), column("combo_name", "TEXT"), column("combo_step_id", "TEXT"), column("combo_execution_key", "TEXT"),
    column("error_summary", "TEXT"), column("detail_state", "TEXT", { default: "'none'" }), column("artifact_relpath", "TEXT"), column("artifact_size_bytes", "INTEGER", { default: "NULL" }), column("artifact_sha256", "TEXT", { default: "NULL" }),
    column("has_request_body", "INTEGER", { default: "0" }), column("has_response_body", "INTEGER", { default: "0" }), column("has_pipeline_details", "INTEGER", { default: "0" }), column("request_summary", "TEXT"),
    column("model_pinned", "INTEGER", { default: "0" }),
    column("tokens_compressed", "INTEGER", { default: "NULL" }), column("correlation_id", "TEXT"), column("reasoning_source", "TEXT", { default: "NULL" }), column("reasoning_chars", "INTEGER", { default: "NULL" }), column("session_tag", "TEXT", { default: "NULL" }), column("response_id", "TEXT", { default: "NULL" }), column("error_type", "TEXT", { default: "NULL" }),
  ],
};

export const ProxyLogEntity: EntityDefinition = {
  entityName: "ProxyLog", tableName: "proxy_logs", owner: "worker", columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }), column("timestamp", "TEXT", { nullable: false }), column("status", "TEXT"), column("proxy_type", "TEXT"), column("proxy_host", "TEXT"), column("proxy_port", "INTEGER"), column("level", "TEXT"), column("level_id", "TEXT"), column("provider", "TEXT"), column("target_url", "TEXT"), column("public_ip", "TEXT"), column("latency_ms", "INTEGER", { default: "0" }), column("error", "TEXT"), column("connection_id", "TEXT"), column("combo_id", "TEXT"), column("account", "TEXT"), column("tls_fingerprint", "INTEGER", { default: "0" }), column("egress_ip", "TEXT"),
  ],
};

export const QuotaSnapshotEntity: EntityDefinition = {
  entityName: "QuotaSnapshot", tableName: "quota_snapshots", owner: "worker", columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }), column("provider", "TEXT", { nullable: false }), column("connection_id", "TEXT", { nullable: false }), column("window_key", "TEXT", { nullable: false }), column("remaining_percentage", "REAL"), column("is_exhausted", "INTEGER", { default: "0" }), column("next_reset_at", "TEXT"), column("window_duration_ms", "INTEGER"), column("raw_data", "TEXT"), column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/** Provider reset transitions observed by worker quota refresh and read by control usage APIs. */
export const ProviderQuotaResetEventEntity: EntityDefinition = {
  entityName: "ProviderQuotaResetEvent",
  tableName: "provider_quota_reset_events",
  owner: "worker",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("provider", "TEXT", { nullable: false }),
    column("connection_id", "TEXT", { nullable: false }),
    column("window_key", "TEXT", { nullable: false }),
    column("window_started_at", "TEXT", { nullable: false }),
    column("window_resets_at", "TEXT", { nullable: false }),
    column("observed_at", "TEXT", { nullable: false }),
    column("previous_remaining_percentage", "REAL"),
    column("new_remaining_percentage", "REAL"),
    column("previous_used_percentage", "REAL"),
    column("new_used_percentage", "REAL"),
    column("raw_data", "TEXT"),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

export const AuditLogEntity: EntityDefinition = {
  entityName: "AuditLog", tableName: "audit_log", owner: "worker", columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }), column("timestamp", "TEXT", { nullable: false, default: "datetime('now')" }), column("action", "TEXT", { nullable: false }), column("actor", "TEXT", { nullable: false, default: "'system'" }), column("target", "TEXT"), column("details", "TEXT"), column("ip_address", "TEXT"), column("resource_type", "TEXT"), column("status", "TEXT"), column("request_id", "TEXT"), column("metadata", "TEXT"),
  ],
};

export const JobEntity: EntityDefinition = {
  entityName: "Job", tableName: "jobs", owner: "worker", columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }), column("type", "TEXT", { nullable: false, default: "'interval'" }), column("cron", "TEXT"), column("interval_ms", "INTEGER"), column("enabled", "INTEGER", { nullable: false, default: "1" }), column("env_flag", "TEXT"), column("config", "TEXT", { nullable: false, default: "'{}'" }), column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }), column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/** Execution history for worker job registry entries. */
export const JobRunEntity: EntityDefinition = {
  entityName: "JobRun",
  tableName: "job_runs",
  owner: "worker",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("job_id", "TEXT", { nullable: false }),
    column("started_at", "TEXT", { nullable: false }),
    column("finished_at", "TEXT"),
    column("status", "TEXT", { nullable: false, default: "'running'" }),
    column("error_message", "TEXT"),
    column("records_affected", "INTEGER", { default: "0" }),
    column("duration_ms", "INTEGER"),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/** Models.dev capability snapshots synced by worker and consumed by edge routing. */
export const ModelCapabilitiesEntity: EntityDefinition = {
  entityName: "ModelCapabilities",
  tableName: "model_capabilities",
  owner: "worker",
  columns: [
    column("provider", "TEXT", { nullable: false, primaryKey: true }),
    column("model_id", "TEXT", { nullable: false, primaryKey: true }),
    column("tool_call", "INTEGER"),
    column("reasoning", "INTEGER"),
    column("attachment", "INTEGER"),
    column("structured_output", "INTEGER"),
    column("temperature", "INTEGER"),
    column("modalities_input", "TEXT"),
    column("modalities_output", "TEXT"),
    column("knowledge_cutoff", "TEXT"),
    column("release_date", "TEXT"),
    column("last_updated", "TEXT"),
    column("status", "TEXT"),
    column("family", "TEXT"),
    column("open_weights", "INTEGER"),
    column("limit_context", "INTEGER"),
    column("limit_input", "INTEGER"),
    column("limit_output", "INTEGER"),
    column("interleaved_field", "TEXT"),
    column("last_synced", "TEXT"),
  ],
};

/**
 * Arena/model task-fitness snapshots synced by the worker and consumed by
 * edge auto-combo routing plus control-plane free-provider rankings.
 */
export const ModelIntelligenceEntity: EntityDefinition = {
  entityName: "ModelIntelligence",
  tableName: "model_intelligence",
  owner: "worker",
  columns: [
    column("model", "TEXT", { nullable: false, primaryKey: true }),
    column("source", "TEXT", { nullable: false, primaryKey: true }),
    column("category", "TEXT", { nullable: false, primaryKey: true }),
    column("score", "REAL", { nullable: false }),
    column("elo_raw", "INTEGER"),
    column("confidence", "TEXT"),
    column("synced_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("expires_at", "TEXT"),
  ],
};
