import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  getBootstrapSettings,
  updateBootstrapSettings,
  upsertBootstrapProvider,
} from "../src/cli/bootstrap-store.mjs";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

test("setup bootstrap initializes only the control-owned records it needs", () => {
  const raw = new DatabaseSync(":memory:");
  const db = {
    prepare: (sql) => raw.prepare(sql),
    transaction: (operation) => () => {
      raw.exec("BEGIN");
      try {
        operation();
        raw.exec("COMMIT");
      } catch (error) {
        raw.exec("ROLLBACK");
        throw error;
      }
    },
  };
  try {
    updateBootstrapSettings(db, { requireLogin: false, setupComplete: true });
    const connection = upsertBootstrapProvider(db, {
      provider: "openai",
      name: "OpenAI",
      apiKey: "test-key",
    });
    assert.deepEqual(getBootstrapSettings(db), { requireLogin: false, setupComplete: true });
    assert.equal(connection.provider, "openai");
    assert.equal(
      raw.prepare("SELECT api_key FROM provider_connections WHERE id = ?").get(connection.id).api_key,
      "test-key",
    );
    const columns = new Set(raw.prepare("PRAGMA table_info(provider_connections)").all().map((row) => row.name));
    for (const required of ["access_token", "refresh_token", "proxy_enabled", "quota_visible"]) {
      assert.equal(columns.has(required), true, required);
    }
  } finally {
    raw.close();
  }
});

test("runtime CLI commands do not mutate control-owned settings or provider connections", () => {
  for (const relativePath of [
    "apps/cli/src/cli/provider-store.mjs",
    "apps/cli/src/cli/sqlite.mjs",
    "apps/cli/src/cli/commands/keys.mjs",
    "apps/cli/src/cli/commands/providers.mjs",
  ]) {
    const source = readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.doesNotMatch(
      source,
      /\b(?:INSERT(?:\s+OR\s+REPLACE)?\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\s+(?:key_value|provider_connections)\b/i,
      relativePath,
    );
  }
});

test("combo mutations cannot fall back to the control-owned database", () => {
  const runtimeSource = readFileSync(path.join(repoRoot, "apps/cli/src/cli/runtime.mjs"), "utf8");
  const comboSource = readFileSync(
    path.join(repoRoot, "apps/cli/src/cli/commands/combo.mjs"),
    "utf8",
  );
  assert.doesNotMatch(runtimeSource, /runtime\/recovery-db/);
  assert.doesNotMatch(
    runtimeSource,
    /\b(?:createCombo|deleteComboByName|setActiveCombo|updateCombo)\b/,
  );
  assert.doesNotMatch(
    comboSource,
    /\bdb\.combos\.(?:createCombo|deleteComboByName|setActiveCombo|updateCombo)\s*\(/,
  );
  assert.equal((comboSource.match(/return await withHttp\(/g) ?? []).length, 3);
});

test("entity audit validates each exceptional writer and its command entrypoint", () => {
  const result = spawnSync(process.execPath, ["scripts/audit-db-entities.mjs", "--strict", "--self-test"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /external write authority self-test: PASS \(forged entrypoint, undeclared file, out-of-app source\)/);
  assert.match(result.stdout, /settings -> owner=control, ownerConsistency=PASS-direct\+authorized-external/);
  assert.match(result.stdout, /providerConnections -> owner=control, ownerConsistency=PASS-indirect\+authorized-external/);
});
