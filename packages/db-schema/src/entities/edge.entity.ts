import { column, type EntityDefinition } from "./definition.js";

/**
 * Persistent semantic responses written by the edge request pipeline and
 * inspected/invalidated by control-api cache operations.
 *
 * `semantic_cache` is created by the core SQLite bootstrap and is intentionally
 * represented here as a shared contract; query and cache policy code remains
 * in the consuming apps/packages.
 */
export const SemanticCacheEntity: EntityDefinition = {
  entityName: "SemanticCache",
  tableName: "semantic_cache",
  owner: "edge-gateway",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("signature", "TEXT", { nullable: false }),
    column("model", "TEXT", { nullable: false }),
    column("prompt_hash", "TEXT", { nullable: false }),
    column("response", "TEXT", { nullable: false }),
    column("tokens_saved", "INTEGER", { default: "0" }),
    column("hit_count", "INTEGER", { default: "0" }),
    column("created_at", "TEXT", { nullable: false }),
    column("expires_at", "TEXT", { nullable: false }),
  ],
};

/** Rolling semantic-cache hit/miss counters shared by edge and control views. */
export const CacheMetricEntity: EntityDefinition = {
  entityName: "CacheMetric",
  tableName: "cache_metrics",
  owner: "edge-gateway",
  columns: [
    column("key", "TEXT", { nullable: false, primaryKey: true }),
    column("value", "INTEGER", { nullable: false, default: "0" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

export const FileEntity: EntityDefinition = {
  entityName: "File",
  tableName: "files",
  owner: "edge-gateway",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }), column("bytes", "INTEGER", { nullable: false }),
    column("created_at", "INTEGER", { nullable: false }), column("filename", "TEXT", { nullable: false }),
    column("purpose", "TEXT", { nullable: false }), column("content", "BLOB"), column("mime_type", "TEXT"),
    column("api_key_id", "TEXT"), column("deleted_at", "INTEGER"), column("expires_at", "INTEGER"),
  ],
};

export const BatchEntity: EntityDefinition = {
  entityName: "Batch",
  tableName: "batches",
  owner: "edge-gateway",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }), column("endpoint", "TEXT", { nullable: false }),
    column("completion_window", "TEXT", { nullable: false }), column("status", "TEXT", { nullable: false }),
    column("input_file_id", "TEXT", { nullable: false }), column("output_file_id", "TEXT"), column("error_file_id", "TEXT"),
    column("created_at", "INTEGER", { nullable: false }), column("in_progress_at", "INTEGER"), column("expires_at", "INTEGER"),
    column("finalizing_at", "INTEGER"), column("completed_at", "INTEGER"), column("failed_at", "INTEGER"),
    column("expired_at", "INTEGER"), column("cancelling_at", "INTEGER"), column("cancelled_at", "INTEGER"),
    column("request_counts_total", "INTEGER", { default: "0" }), column("request_counts_completed", "INTEGER", { default: "0" }),
    column("request_counts_failed", "INTEGER", { default: "0" }), column("metadata", "TEXT"), column("api_key_id", "TEXT"),
    column("errors", "TEXT"), column("model", "TEXT"), column("usage", "TEXT"),
    column("output_expires_after_seconds", "INTEGER"), column("output_expires_after_anchor", "TEXT"),
  ],
};

/** Conversation roots are created on public requests and read by control dashboards. */
export const AgenticConversationEntity: EntityDefinition = {
  entityName: "AgenticConversation",
  tableName: "agentic_conversations",
  owner: "edge-gateway",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("api_key_id", "TEXT"),
    column("fingerprint_hash", "TEXT", { nullable: false }),
    column("last_message_count", "INTEGER", { nullable: false }),
    column("last_messages_hash", "TEXT", { nullable: false }),
    column("turn_count", "INTEGER", { nullable: false, default: "1" }),
    column("first_seen_at", "TEXT", { nullable: false }),
    column("last_seen_at", "TEXT", { nullable: false }),
  ],
};

/** Identity-only turn nodes written by edge requests and traversed by control views. */
export const ConversationTurnNodeEntity: EntityDefinition = {
  entityName: "ConversationTurnNode",
  tableName: "conversation_turn_nodes",
  owner: "edge-gateway",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("conversation_id", "TEXT", { nullable: false }),
    column("parent_id", "TEXT"),
    column("role", "TEXT", { nullable: false }),
    column("content_hash", "TEXT", { nullable: false, default: "''" }),
    column("last_correlation_id", "TEXT"),
    column("first_seen_at", "TEXT", { nullable: false }),
    column("last_seen_at", "TEXT", { nullable: false }),
  ],
};

/** Hot-path rolling counters and reset audit rows are owned by edge execution. */
export const ApiKeyTokenCounterEntity: EntityDefinition = {
  entityName: "ApiKeyTokenCounter",
  tableName: "api_key_token_counters",
  owner: "edge-gateway",
  columns: [
    column("limit_id", "TEXT", { nullable: false, primaryKey: true }),
    column("window_start", "TEXT", { nullable: false, primaryKey: true }),
    column("tokens_used", "INTEGER", { nullable: false, default: "0" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

export const ApiKeyTokenLimitResetLogEntity: EntityDefinition = {
  entityName: "ApiKeyTokenLimitResetLog",
  tableName: "api_key_token_limit_reset_logs",
  owner: "edge-gateway",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("limit_id", "TEXT", { nullable: false }),
    column("reset_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("prev_tokens", "INTEGER", { nullable: false, default: "0" }),
    column("window_start", "TEXT", { nullable: false }),
  ],
};

/** Per-connection/model quota ledger updated during edge dispatch. */
export const ProviderQuotaStateEntity: EntityDefinition = {
  entityName: "ProviderQuotaState",
  tableName: "provider_quota_state",
  owner: "edge-gateway",
  columns: [
    column("connection_id", "TEXT", { nullable: false, primaryKey: true }),
    column("model", "TEXT", { nullable: false, primaryKey: true }),
    column("tokens_used", "INTEGER", { nullable: false, default: "0" }),
    column("token_limit", "INTEGER", { nullable: false, default: "0" }),
    column("window_start", "INTEGER", { nullable: false }),
    column("window_reset", "INTEGER", { nullable: false }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/** Sliding-window quota counters updated on the edge request hot path. */
export const QuotaConsumptionEntity: EntityDefinition = {
  entityName: "QuotaConsumption",
  tableName: "quota_consumption",
  owner: "edge-gateway",
  columns: [
    column("api_key_id", "TEXT", { nullable: false, primaryKey: true }),
    column("dimension_key", "TEXT", { nullable: false, primaryKey: true }),
    column("bucket_index", "INTEGER", { nullable: false, primaryKey: true }),
    column("consumed", "REAL", { nullable: false, default: "0" }),
    column("updated_at", "INTEGER", { nullable: false }),
  ],
};

/**
 * Compression receipts written by the edge streaming pipeline and consumed by
 * the control analytics API and realtime diagnostics.
 *
 * The migration history adds receipt/RTK/combo columns incrementally; keeping
 * the complete current shape here prevents app-specific readers from
 * inventing divergent table definitions.
 */
export const CompressionAnalyticsEntity: EntityDefinition = {
  entityName: "CompressionAnalytics",
  tableName: "compression_analytics",
  owner: "edge-gateway",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("timestamp", "TEXT", { nullable: false }),
    column("combo_id", "TEXT"),
    column("provider", "TEXT"),
    column("mode", "TEXT", { nullable: false }),
    column("original_tokens", "INTEGER", { nullable: false }),
    column("compressed_tokens", "INTEGER", { nullable: false }),
    column("tokens_saved", "INTEGER", { nullable: false }),
    column("duration_ms", "INTEGER"),
    column("request_id", "TEXT"),
    column("actual_prompt_tokens", "INTEGER"),
    column("actual_completion_tokens", "INTEGER"),
    column("actual_total_tokens", "INTEGER"),
    column("actual_cache_read_tokens", "INTEGER"),
    column("actual_cache_write_tokens", "INTEGER"),
    column("estimated_usd_saved", "REAL"),
    column("mcp_description_tokens_saved", "INTEGER", { default: "0" }),
    column("multimodal_skip_count", "INTEGER", { default: "0" }),
    column("receipt_source", "TEXT"),
    column("validation_fallback", "INTEGER", { default: "0" }),
    column("output_mode", "TEXT"),
    column("compression_combo_id", "TEXT"),
    column("engine", "TEXT"),
    column("rtk_raw_output_pointer", "TEXT"),
    column("rtk_raw_output_bytes", "INTEGER"),
    column("rtk_raw_output_pointers", "TEXT"),
    column("rtk_raw_output_total_bytes", "INTEGER"),
    column("skip_reason", "TEXT"),
  ],
};

/** Per-engine breakdown rows for stacked compression analytics. */
export const CompressionEngineBreakdownEntity: EntityDefinition = {
  entityName: "CompressionEngineBreakdown",
  tableName: "compression_engine_breakdown",
  owner: "edge-gateway",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("timestamp", "TEXT", { nullable: false }),
    column("request_id", "TEXT"),
    column("engine", "TEXT", { nullable: false }),
    column("original_tokens", "INTEGER", { nullable: false, default: "0" }),
    column("compressed_tokens", "INTEGER", { nullable: false, default: "0" }),
    column("tokens_saved", "INTEGER", { nullable: false, default: "0" }),
    column("duration_ms", "INTEGER"),
  ],
};
