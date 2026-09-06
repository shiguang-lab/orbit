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
