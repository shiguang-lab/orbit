import { getDbInstance } from "@shiguang-gateway/core-domain/db/ping";

type Statement = {
  get: (...params: unknown[]) => unknown;
  all: (...params: unknown[]) => unknown[];
  run: (...params: unknown[]) => unknown;
};

type Db = { prepare: (sql: string) => Statement };

function database(): Db | null {
  try {
    return getDbInstance() as Db;
  } catch {
    return null;
  }
}

export function saveCliToolLastConfigured(toolId: string, timestamp = new Date().toISOString()): void {
  const db = database();
  if (!db) return;
  db.prepare("INSERT OR REPLACE INTO key_value (namespace, key, value) VALUES (?, ?, ?)").run(
    "cliToolLastConfig",
    toolId,
    JSON.stringify(timestamp),
  );
}

export function deleteCliToolLastConfigured(toolId: string): void {
  const db = database();
  if (!db) return;
  db.prepare("DELETE FROM key_value WHERE namespace = ? AND key = ?").run("cliToolLastConfig", toolId);
}

export function getAllCliToolLastConfigured(): Record<string, string> {
  const db = database();
  if (!db) return {};
  const rows = db.prepare("SELECT key, value FROM key_value WHERE namespace = ?").all("cliToolLastConfig") as Array<{ key: string; value: string }>;
  const result: Record<string, string> = {};
  for (const row of rows) {
    try {
      const value = JSON.parse(row.value) as unknown;
      if (typeof value === "string") result[row.key] = value;
    } catch {
      // Ignore malformed legacy values.
    }
  }
  return result;
}
