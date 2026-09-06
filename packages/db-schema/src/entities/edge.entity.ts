import { column, type EntityDefinition } from "./definition.js";

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
