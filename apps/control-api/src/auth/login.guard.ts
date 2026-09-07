import { getDbInstance } from "@shiguang-gateway/core-domain/db/connection";

const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const FAILURE_THRESHOLD = 5;
const PRUNE_THRESHOLD = 256;

interface AttemptState {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

interface LoginGuardDatabase {
  exec(sql: string): void;
  prepare(sql: string): {
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): { changes: number };
  };
}

export interface GuardDecision {
  allowed: boolean;
  retryAfterSeconds?: number;
}

const LOGIN_GUARD_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS auth_login_attempts (
  client_key TEXT PRIMARY KEY,
  failure_count INTEGER NOT NULL,
  first_attempt_at INTEGER NOT NULL,
  locked_until INTEGER
);
CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_expiry
  ON auth_login_attempts(first_attempt_at, locked_until);
`;

function clientKey(rawIp: string | null | undefined): string {
  const ip = (rawIp || "").trim();
  return ip || "__unknown__";
}

function toAttemptState(row: unknown): AttemptState | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  return {
    count: Number(value.failure_count),
    firstAttemptAt: Number(value.first_attempt_at),
    lockedUntil: value.locked_until == null ? null : Number(value.locked_until),
  };
}

/** Create the control-owned shared store during control-api startup. */
export function ensureLoginGuardSchema(database: LoginGuardDatabase = getDbInstance()): void {
  database.exec(LOGIN_GUARD_SCHEMA_SQL);
}

/**
 * Database-backed guard. Separate control-api replicas construct separate
 * instances, but coordinate through the same SQLite row and atomic UPSERT.
 */
export class LoginGuard {
  constructor(private readonly database: LoginGuardDatabase = getDbInstance()) {}

  check(rawIp: string | null | undefined, options: { enabled: boolean }): GuardDecision {
    if (!options.enabled) return { allowed: true };
    const state = toAttemptState(
      this.database
        .prepare(
          "SELECT failure_count, first_attempt_at, locked_until FROM auth_login_attempts WHERE client_key = ?",
        )
        .get(clientKey(rawIp)),
    );
    if (!state) return { allowed: true };
    const now = Date.now();
    if (state.lockedUntil && state.lockedUntil > now) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((state.lockedUntil - now) / 1000),
      };
    }
    return { allowed: true };
  }

  recordFailure(rawIp: string | null | undefined, options: { enabled: boolean }): GuardDecision {
    if (!options.enabled) return { allowed: true };
    const key = clientKey(rawIp);
    const now = Date.now();

    const sizeRow = this.database
      .prepare("SELECT COUNT(*) AS count FROM auth_login_attempts")
      .get() as { count?: unknown } | undefined;
    if (Number(sizeRow?.count ?? 0) > PRUNE_THRESHOLD) this.pruneExpired(now);

    this.database
      .prepare(`
        INSERT INTO auth_login_attempts (client_key, failure_count, first_attempt_at, locked_until)
        VALUES (?, 1, ?, NULL)
        ON CONFLICT(client_key) DO UPDATE SET
          failure_count = CASE
            WHEN ? - auth_login_attempts.first_attempt_at > ? THEN 1
            WHEN auth_login_attempts.locked_until IS NOT NULL
              AND auth_login_attempts.locked_until > ? THEN auth_login_attempts.failure_count
            ELSE auth_login_attempts.failure_count + 1
          END,
          first_attempt_at = CASE
            WHEN ? - auth_login_attempts.first_attempt_at > ? THEN ?
            ELSE auth_login_attempts.first_attempt_at
          END,
          locked_until = CASE
            WHEN ? - auth_login_attempts.first_attempt_at > ? THEN NULL
            WHEN auth_login_attempts.locked_until IS NOT NULL
              AND auth_login_attempts.locked_until > ? THEN auth_login_attempts.locked_until
            WHEN auth_login_attempts.failure_count + 1 >= ? THEN ?
            ELSE NULL
          END
      `)
      .run(
        key,
        now,
        now,
        WINDOW_MS,
        now,
        now,
        WINDOW_MS,
        now,
        now,
        WINDOW_MS,
        now,
        FAILURE_THRESHOLD,
        now + LOCKOUT_MS,
      );

    const state = toAttemptState(
      this.database
        .prepare(
          "SELECT failure_count, first_attempt_at, locked_until FROM auth_login_attempts WHERE client_key = ?",
        )
        .get(key),
    );
    if (state?.lockedUntil && state.lockedUntil > now) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((state.lockedUntil - now) / 1000),
      };
    }
    return { allowed: true };
  }

  clear(rawIp: string | null | undefined): void {
    this.database.prepare("DELETE FROM auth_login_attempts WHERE client_key = ?").run(clientKey(rawIp));
  }

  reset(): void {
    this.database.prepare("DELETE FROM auth_login_attempts").run();
  }

  size(): number {
    const row = this.database.prepare("SELECT COUNT(*) AS count FROM auth_login_attempts").get() as
      | { count?: unknown }
      | undefined;
    return Number(row?.count ?? 0);
  }

  private pruneExpired(now: number): void {
    this.database
      .prepare(`
        DELETE FROM auth_login_attempts
        WHERE ? - first_attempt_at > ?
          AND (locked_until IS NULL OR locked_until <= ?)
      `)
      .run(now, WINDOW_MS, now);
  }
}

let defaultGuard: LoginGuard | null = null;

function guard(): LoginGuard {
  return (defaultGuard ??= new LoginGuard());
}

export function checkLoginGuard(
  rawIp: string | null | undefined,
  options: { enabled: boolean },
): GuardDecision {
  return guard().check(rawIp, options);
}

export function recordLoginFailure(
  rawIp: string | null | undefined,
  options: { enabled: boolean },
): GuardDecision {
  return guard().recordFailure(rawIp, options);
}

export function clearLoginAttempts(rawIp: string | null | undefined): void {
  guard().clear(rawIp);
}

export function resetLoginGuardForTests(): void {
  guard().reset();
}

export function getLoginGuardSizeForTests(): number {
  return guard().size();
}

export const LOGIN_GUARD_TUNABLES = Object.freeze({
  WINDOW_MS,
  LOCKOUT_MS,
  FAILURE_THRESHOLD,
});
