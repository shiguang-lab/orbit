import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { getEnvSyncPlan, parseEnvFile, syncEnv } from "../src/system/runtime/env-sync.js";
import { buildSourceUpdateScript } from "../src/system/auto-update.js";

function withTempRoot(run: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "orbiot-env-sync-"));
  try { run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test("env sync reports an unavailable template without writing files", () => {
  withTempRoot((root) => {
    assert.deepEqual(getEnvSyncPlan({ rootDir: root }), {
      available: false,
      created: false,
      added: 0,
      missingEntries: [],
    });
    assert.deepEqual(syncEnv({ rootDir: root, quiet: true }), { created: false, added: 0 });
  });
});

test("oauth env sync respects section boundaries, quotes, existing values, and idempotency", () => {
  withTempRoot((root) => {
    writeFileSync(join(root, ".env.example"), [
      "BEFORE=ignored",
      "# OAUTH PROVIDER CREDENTIALS",
      'OAUTH_CLIENT_ID="default-id"',
      "OAUTH_CLIENT_SECRET='default-secret'",
      "# Provider User-Agent Overrides",
      "AFTER=ignored",
      "",
    ].join("\n"));
    writeFileSync(join(root, ".env"), "OAUTH_CLIENT_ID=custom-id\n");

    assert.deepEqual(syncEnv({ rootDir: root, scope: "oauth", quiet: true }), {
      created: false,
      added: 1,
    });
    assert.deepEqual(parseEnvFile(join(root, ".env")), new Map([
      ["OAUTH_CLIENT_ID", "custom-id"],
      ["OAUTH_CLIENT_SECRET", "default-secret"],
    ]));
    assert.deepEqual(syncEnv({ rootDir: root, scope: "oauth", quiet: true }), {
      created: false,
      added: 0,
    });
  });
});

test("full env sync creates the file and generates a machine salt", () => {
  withTempRoot((root) => {
    writeFileSync(join(root, ".env.example"), "PLAIN=value\nMACHINE_ID_SALT=\n");
    assert.deepEqual(syncEnv({ rootDir: root, quiet: true }), { created: true, added: 2 });
    const content = readFileSync(join(root, ".env"), "utf8");
    assert.match(content, /^PLAIN=value/m);
    assert.match(content, /^MACHINE_ID_SALT=orbit-[a-f0-9]{16}$/m);
  });
});

test("source updater invokes the control-owned env sync entrypoint", () => {
  const script = buildSourceUpdateScript("1.2.3");
  assert.match(script, /apps\/control.*env-sync\.ts/);
  assert.doesNotMatch(script, /packages\/core\/scripts\/dev\/sync-env/);
});
