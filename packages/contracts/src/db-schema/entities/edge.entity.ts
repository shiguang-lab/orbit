import { column, type EntityDefinition } from "./definition.js";

/** Conversational memory records written only by the edge request runtime. */
export const MemoryEntity: EntityDefinition = {
  entityName: "Memory", tableName: "memories", owner: "gateway", columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }), column("api_key_id", "TEXT", { nullable: false }), column("session_id", "TEXT"), column("type", "TEXT", { nullable: false }), column("key", "TEXT"), column("content", "TEXT", { nullable: false }), column("metadata", "TEXT"), column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }), column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }), column("expires_at", "TEXT"), column("memory_id", "INTEGER"), column("needs_reindex", "INTEGER", { nullable: false, default: "0" }), column("access_count", "INTEGER", { nullable: false, default: "0" }), column("last_accessed_at", "TEXT"),
  ],
};

/** Append-only middleware execution records emitted by edge/open-sse runtime. */
export const MiddlewareLogEntity: EntityDefinition = {
  entityName: "MiddlewareLog",
  tableName: "middleware_logs",
  owner: "gateway",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("hook_name", "TEXT", { nullable: false }),
    column("request_id", "TEXT", { nullable: false }),
    column("duration_ms", "INTEGER", { nullable: false, default: "0" }),
    column("mutated", "INTEGER", { nullable: false, default: "0" }),
    column("skipped", "INTEGER", { nullable: false, default: "0" }),
    column("error", "TEXT"),
    column("timestamp", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/**
 * Persistent reasoning replay entries written by the streaming request path
 * and periodically purged by the worker cleanup job.
 */
export const ReasoningCacheEntity: EntityDefinition = {
  entityName: "ReasoningCache",
  tableName: "reasoning_cache",
  owner: "gateway",
  columns: [
    column("tool_call_id", "TEXT", { nullable: false, primaryKey: true }),
    column("provider", "TEXT", { nullable: false }),
    column("model", "TEXT", { nullable: false }),
    column("reasoning", "TEXT", { nullable: false }),
    column("char_count", "INTEGER", { nullable: false, default: "0" }),
    column("created_at", "TEXT", { nullable: false, default: "datetime('now')" }),
    column("expires_at", "INTEGER", { nullable: false }),
  ],
};

/**
 * Model pins observed for a session/combo by the context-relay pipeline.
 * Edge/open-sse writes and reads these rows; worker/control maintenance only
 * treats the table as a shared persistence contract.
 */
export const SessionModelHistoryEntity: EntityDefinition = {
  entityName: "SessionModelHistory",
  tableName: "session_model_history",
  owner: "gateway",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("session_id", "TEXT", { nullable: false }),
    column("combo_name", "TEXT", { nullable: false }),
    column("model_str", "TEXT", { nullable: false }),
    column("provider", "TEXT", { nullable: false }),
    column("connection_id", "TEXT"),
    column("used_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

/**
 * Context-relay summaries shared across account switches. The edge request
 * pipeline and core SSE handlers read/write these rows; cleanup and
 * combo invalidation remain in their owning runtime modules.
 */
export const ContextHandoffEntity: EntityDefinition = {
  entityName: "ContextHandoff",
  tableName: "context_handoffs",
  owner: "gateway",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true, default: "lower(hex(randomblob(8)))" }),
    column("session_id", "TEXT", { nullable: false }),
    column("combo_name", "TEXT", { nullable: false }),
    column("from_account", "TEXT", { nullable: false }),
    column("summary", "TEXT", { nullable: false }),
    column("key_decisions", "TEXT", { nullable: false, default: "'[]'" }),
    column("task_progress", "TEXT", { nullable: false, default: "''" }),
    column("active_entities", "TEXT", { nullable: false, default: "'[]'" }),
    column("message_count", "INTEGER", { nullable: false, default: "0" }),
    column("model", "TEXT", { nullable: false, default: "''" }),
    column("last_model", "TEXT"),
    column("warning_threshold_pct", "REAL", { nullable: false, default: "0.85" }),
    column("generated_at", "TEXT", { nullable: false }),
    column("expires_at", "TEXT", { nullable: false }),
    column("created_at", "TEXT", { nullable: false, default: "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')" }),
  ],
};

/**
 * Persistent semantic responses written by the edge request pipeline and
 * inspected/invalidated by control cache operations.
 *
 * `semantic_cache` is created by the core SQLite bootstrap and is intentionally
 * represented here as a shared contract; query and cache policy code remains
 * in the consuming apps/packages.
 */
export const SemanticCacheEntity: EntityDefinition = {
  entityName: "SemanticCache",
  tableName: "semantic_cache",
  owner: "gateway",
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
  owner: "gateway",
  columns: [
    column("key", "TEXT", { nullable: false, primaryKey: true }),
    column("value", "INTEGER", { nullable: false, default: "0" }),
    column("updated_at", "TEXT", { nullable: false, default: "datetime('now')" }),
  ],
};

export const FileEntity: EntityDefinition = {
  entityName: "File",
  tableName: "files",
  owner: "gateway",
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
  owner: "gateway",
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

/** Durable per-item checkpoints written by edge batch processing. */
export const BatchItemCheckpointEntity: EntityDefinition = {
  entityName: "BatchItemCheckpoint",
  tableName: "batch_item_checkpoints",
  owner: "gateway",
  columns: [
    column("batch_id", "TEXT", { nullable: false, primaryKey: true }),
    column("line_number", "INTEGER", { nullable: false, primaryKey: true }),
    column("custom_id", "TEXT"),
    column("status", "TEXT", { nullable: false }),
    column("result_json", "TEXT"),
    column("error_json", "TEXT"),
    column("created_at", "INTEGER", { nullable: false }),
    column("updated_at", "INTEGER", { nullable: false }),
  ],
};

/** Conversation roots are created on public requests and read by control dashboards. */
export const AgenticConversationEntity: EntityDefinition = {
  entityName: "AgenticConversation",
  tableName: "agentic_conversations",
  owner: "gateway",
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
  owner: "gateway",
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
  owner: "gateway",
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
  owner: "gateway",
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
  owner: "gateway",
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
  owner: "gateway",
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
  owner: "gateway",
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
  owner: "gateway",
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

/** Relay credentials issued for the public relay endpoint. */
export const RelayTokenEntity: EntityDefinition = {
  entityName: "RelayToken",
  tableName: "relay_tokens",
  owner: "gateway",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("name", "TEXT", { nullable: false }),
    column("token_hash", "TEXT", { nullable: false }),
    column("token_prefix", "TEXT", { nullable: false }),
    column("description", "TEXT", { default: "''" }),
    column("combo_id", "TEXT"),
    column("allowed_models", "TEXT", { default: "'[]'" }),
    column("max_tokens_per_request", "INTEGER", { default: "128000" }),
    column("max_requests_per_minute", "INTEGER", { default: "60" }),
    column("max_requests_per_day", "INTEGER", { default: "10000" }),
    column("max_cost_per_day", "REAL", { default: "0" }),
    column("enabled", "INTEGER", { default: "1" }),
    column("created_at", "INTEGER", { nullable: false }),
    column("updated_at", "INTEGER", { nullable: false }),
    column("expires_at", "INTEGER"),
    column("last_used_at", "INTEGER"),
    column("metadata", "TEXT", { default: "'{}'" }),
  ],
};

/** Fixed-window counters used by the relay endpoint's rate limiter. */
export const RelayRateLimitEntity: EntityDefinition = {
  entityName: "RelayRateLimit",
  tableName: "relay_rate_limits",
  owner: "gateway",
  columns: [
    column("token_id", "TEXT", { nullable: false, primaryKey: true }),
    column("window_start", "INTEGER", { nullable: false, primaryKey: true }),
    column("request_count", "INTEGER", { default: "0" }),
    column("cost", "REAL", { default: "0" }),
  ],
};

/** Per-request relay usage records retained for control-plane diagnostics. */
export const RelayLogEntity: EntityDefinition = {
  entityName: "RelayLog",
  tableName: "relay_logs",
  owner: "gateway",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("token_id", "TEXT", { nullable: false }),
    column("request_id", "TEXT"),
    column("model", "TEXT"),
    column("prompt_tokens", "INTEGER", { default: "0" }),
    column("completion_tokens", "INTEGER", { default: "0" }),
    column("cost", "REAL", { default: "0" }),
    column("status", "TEXT", { default: "'success'" }),
    column("status_code", "INTEGER", { default: "200" }),
    column("latency_ms", "INTEGER", { default: "0" }),
    column("client_ip", "TEXT"),
    column("user_agent", "TEXT"),
    column("created_at", "INTEGER", { nullable: false }),
  ],
};

/**
 * Append-only audit records emitted by the MCP server runtime and queried by
 * the control-plane MCP management surface. The runtime lives in the edge
 * deployment dependency graph, while control only reads these rows.
 */
export const McpToolAuditEntity: EntityDefinition = {
  entityName: "McpToolAudit",
  tableName: "mcp_tool_audit",
  owner: "gateway",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("tool_name", "TEXT", { nullable: false }),
    column("input_hash", "TEXT"),
    column("output_summary", "TEXT"),
    column("duration_ms", "INTEGER"),
    column("api_key_id", "TEXT"),
    column("success", "INTEGER", { default: "1" }),
    column("error_code", "TEXT"),
    column("created_at", "TEXT", { default: "datetime('now')" }),
  ],
};

/**
 * A2A task lifecycle rows are owned by the edge protocol surface.  The
 * control/admin readers and the MCP observability tooling consume the same
 * physical records, so these entities stay in the shared catalog even though
 * task orchestration remains in the edge app.
 */
export const A2aTaskEntity: EntityDefinition = {
  entityName: "A2aTask",
  tableName: "a2a_tasks",
  owner: "gateway",
  columns: [
    column("id", "TEXT", { nullable: false, primaryKey: true }),
    column("state", "TEXT", { nullable: false, default: "'submitted'" }),
    column("skill_id", "TEXT"),
    column("input_json", "TEXT"),
    column("output_json", "TEXT"),
    column("cost_estimated", "REAL"),
    column("cost_actual", "REAL"),
    column("routing_explanation", "TEXT"),
    column("resilience_trace", "TEXT"),
    column("policy_verdict", "TEXT"),
    column("api_key_id", "TEXT"),
    column("created_at", "TEXT", { default: "datetime('now')" }),
    column("updated_at", "TEXT", { default: "datetime('now')" }),
    column("completed_at", "TEXT"),
    column("expires_at", "TEXT"),
  ],
};

/** Append-only A2A state transitions consumed by edge and management views. */
export const A2aTaskEventEntity: EntityDefinition = {
  entityName: "A2aTaskEvent",
  tableName: "a2a_task_events",
  owner: "gateway",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("task_id", "TEXT", { nullable: false }),
    column("event_type", "TEXT", { nullable: false }),
    column("data_json", "TEXT"),
    column("created_at", "TEXT", { default: "datetime('now')" }),
  ],
};

/** Explainability records emitted by edge routing and inspected by control/MCP. */
export const RoutingDecisionEntity: EntityDefinition = {
  entityName: "RoutingDecision",
  tableName: "routing_decisions",
  owner: "gateway",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("request_id", "TEXT"),
    column("task_type", "TEXT"),
    column("combo_id", "TEXT"),
    column("provider_selected", "TEXT"),
    column("model_selected", "TEXT"),
    column("score", "REAL"),
    column("factors_json", "TEXT"),
    column("fallbacks_triggered", "INTEGER", { default: "0" }),
    column("success", "INTEGER", { default: "1" }),
    column("latency_ms", "INTEGER"),
    column("cost", "REAL"),
    column("source", "TEXT", { default: "'api'" }),
    column("created_at", "TEXT", { default: "datetime('now')" }),
  ],
};

/** Durable CCR blocks written by the edge compression pipeline and pruned by runtime cleanup. */
export const CcrBlockEntity: EntityDefinition = {
  entityName: "CcrBlock",
  tableName: "ccr_blocks",
  owner: "gateway",
  columns: [
    column("principal_id", "TEXT", { nullable: false, primaryKey: true }),
    column("hash", "TEXT", { nullable: false, primaryKey: true }),
    column("content", "TEXT", { nullable: false }),
    column("bytes", "INTEGER", { nullable: false }),
    column("chars", "INTEGER", { nullable: false }),
    column("lines", "INTEGER", { nullable: false }),
    column("content_type", "TEXT", { nullable: false, default: "'text/plain'" }),
    column("source", "TEXT", { nullable: false, default: "'compression'" }),
    column("created_at", "INTEGER", { nullable: false }),
    column("last_accessed_at", "INTEGER", { nullable: false }),
    column("expires_at", "INTEGER", { nullable: false }),
  ],
};

/** Compression/cache telemetry emitted by edge requests and consumed by maintenance/MCP views. */
export const CompressionCacheStatsEntity: EntityDefinition = {
  entityName: "CompressionCacheStats",
  tableName: "compression_cache_stats",
  owner: "gateway",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true, autoIncrement: true }),
    column("provider", "TEXT", { nullable: false }),
    column("model", "TEXT", { nullable: false, default: "''" }),
    column("compression_mode", "TEXT", { nullable: false }),
    column("cache_control_present", "INTEGER", { nullable: false, default: "0" }),
    column("estimated_cache_hit", "INTEGER", { nullable: false, default: "0" }),
    column("tokens_saved_compression", "INTEGER", { nullable: false, default: "0" }),
    column("tokens_saved_caching", "INTEGER", { nullable: false, default: "0" }),
    column("net_savings", "INTEGER", { nullable: false, default: "0" }),
    column("created_at", "TEXT", { default: "CURRENT_TIMESTAMP" }),
  ],
};

/** Singleton vector-index metadata shared by edge retrieval and control reindex administration. */
export const MemoryVecMetaEntity: EntityDefinition = {
  entityName: "MemoryVecMeta",
  tableName: "memory_vec_meta",
  owner: "gateway",
  columns: [
    column("id", "INTEGER", { nullable: false, primaryKey: true }),
    column("active_dim", "INTEGER"),
    column("embedding_signature", "TEXT"),
    column("last_reset_at", "TEXT"),
    column("vec_loaded", "INTEGER", { nullable: false, default: "0" }),
  ],
};
