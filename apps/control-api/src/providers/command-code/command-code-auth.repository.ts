import { createHash, randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { getDbInstance } from "@shiguang-gateway/core-domain/db/ping";
import { decrypt, encrypt } from "@shiguang-gateway/core-domain/db/encryption";

export type CommandCodeAuthStatus = "pending" | "received" | "applied" | "expired";

export interface CommandCodeAuthMetadata {
  userId?: string;
  userName?: string;
  keyName?: string;
  receivedAt?: string;
}

export interface CommandCodeAuthSafeStatus {
  id: string;
  stateHash: string;
  status: CommandCodeAuthStatus;
  metadata: CommandCodeAuthMetadata | null;
  createdAt: string;
  expiresAt: string;
  receivedAt: string | null;
  appliedAt: string | null;
  updatedAt: string;
}

export interface ConsumedCommandCodeAuthSecret extends CommandCodeAuthSafeStatus {
  apiKey: string;
}

type AuthSessionRow = {
  id: string;
  state_hash: string;
  status: CommandCodeAuthStatus;
  encrypted_api_key?: string | null;
  metadata_json?: string | null;
  created_at: string;
  expires_at: string;
  received_at?: string | null;
  applied_at?: string | null;
  updated_at: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function parseMetadata(value: unknown): CommandCodeAuthMetadata | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as CommandCodeAuthMetadata;
  }
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as CommandCodeAuthMetadata;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function toSafeStatus(row: AuthSessionRow): CommandCodeAuthSafeStatus {
  return {
    id: row.id,
    stateHash: row.state_hash,
    status: row.status,
    metadata: parseMetadata(row.metadata_json),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    receivedAt: row.received_at ?? null,
    appliedAt: row.applied_at ?? null,
    updatedAt: row.updated_at,
  };
}

/** Persistence boundary for browser-assisted Command Code authentication. */
@Injectable()
export class CommandCodeAuthRepository {
  hashState(state: string): string {
    return createHash("sha256").update(state, "utf8").digest("hex");
  }

  createPending(stateHash: string, expiresAt: string): CommandCodeAuthSafeStatus {
    const id = randomUUID();
    const now = nowIso();
    const db = getDbInstance();
    db.prepare(
      `INSERT INTO command_code_auth_sessions (
        id, state_hash, status, encrypted_api_key, metadata_json,
        created_at, expires_at, received_at, applied_at, updated_at
      ) VALUES (?, ?, 'pending', NULL, NULL, ?, ?, NULL, NULL, ?)`,
    ).run(id, stateHash, now, expiresAt, now);
    const row = db
      .prepare("SELECT * FROM command_code_auth_sessions WHERE id = ?")
      .get(id) as AuthSessionRow | undefined;
    if (!row) throw new Error("Failed to create Command Code auth session");
    return toSafeStatus(row);
  }

  markReceived(input: {
    stateHash: string;
    apiKey: string;
    metadata?: CommandCodeAuthMetadata;
  }): CommandCodeAuthSafeStatus | null {
    const now = nowIso();
    const db = getDbInstance();
    this.expire(input.stateHash, now);
    const metadata = { ...(input.metadata ?? {}), receivedAt: now };
    db.prepare(
      `UPDATE command_code_auth_sessions
       SET status = 'received', encrypted_api_key = ?, metadata_json = ?, received_at = ?, updated_at = ?
       WHERE state_hash = ? AND status IN ('pending', 'received') AND expires_at > ?`,
    ).run(encrypt(input.apiKey), JSON.stringify(metadata), now, now, input.stateHash, now);
    return this.getSafeStatus(input.stateHash);
  }

  getSafeStatus(stateHash: string): CommandCodeAuthSafeStatus | null {
    this.expire(stateHash);
    const row = getDbInstance()
      .prepare("SELECT * FROM command_code_auth_sessions WHERE state_hash = ?")
      .get(stateHash) as AuthSessionRow | undefined;
    return row ? toSafeStatus(row) : null;
  }

  consume(stateHash: string): ConsumedCommandCodeAuthSecret | null {
    const db = getDbInstance();
    return db.transaction(() => {
      const now = nowIso();
      this.expire(stateHash, now);
      const row = db
        .prepare(
          `SELECT * FROM command_code_auth_sessions
           WHERE state_hash = ? AND status = 'received' AND expires_at > ? AND encrypted_api_key IS NOT NULL`,
        )
        .get(stateHash, now) as AuthSessionRow | undefined;
      if (!row?.encrypted_api_key) return null;
      const apiKey = decrypt(row.encrypted_api_key);
      if (!apiKey) return null;
      const result = db
        .prepare(
          `UPDATE command_code_auth_sessions
           SET status = 'applied', encrypted_api_key = NULL, applied_at = ?, updated_at = ?
           WHERE id = ? AND status = 'received'`,
        )
        .run(now, now, row.id) as { changes?: number };
      if (!result.changes) return null;
      return {
        ...toSafeStatus({ ...row, status: "applied", encrypted_api_key: null, applied_at: now, updated_at: now }),
        apiKey,
      };
    })() as ConsumedCommandCodeAuthSecret | null;
  }

  private expire(stateHash: string, now = nowIso()): void {
    getDbInstance()
      .prepare(
        `UPDATE command_code_auth_sessions
         SET status = 'expired', updated_at = ?
         WHERE state_hash = ? AND status IN ('pending', 'received') AND expires_at <= ?`,
      )
      .run(now, stateHash, now);
  }
}
