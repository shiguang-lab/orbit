import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("control registers provider ports before loading routes and computes combo context", async () => {
  const bootstrap = await readFile(new URL("../src/bootstrap.ts", import.meta.url), "utf8");
  assert.match(bootstrap, /import\s*\{\s*installRuntimePorts\s*\}\s*from\s*"@shiguang-gateway\/open-sse\/services\/dbRuntimeHooks"/);
  const registration = bootstrap.indexOf("installRuntimePorts();");
  assert.ok(registration >= 0 && registration < bootstrap.indexOf('import("./app.module.js")'));

  const dataDir = await mkdtemp(join(tmpdir(), "combo-runtime-registration-"));
  const previous = { NODE_ENV: process.env.NODE_ENV, DATA_DIR: process.env.DATA_DIR, SQLITE_FILE: process.env.SQLITE_FILE };
  process.env.NODE_ENV = "test";
  process.env.DATA_DIR = dataDir;
  process.env.SQLITE_FILE = join(dataDir, "storage.sqlite");
  try {
    const { installRuntimePorts } = await import("@shiguang-gateway/open-sse/services/dbRuntimeHooks");
    const { computeComboContextLength } = await import("../src/combos/combo-admin.js");
    const combo = { name: "context-check", models: ["openai/gpt-4o-mini"] };
    assert.throws(() => computeComboContextLength(combo, [combo]), /before runtime registration/);
    installRuntimePorts();
    const context = computeComboContextLength(combo, [combo]);
    assert.equal(typeof context, "number");
    assert.ok(context! > 0);
  } finally {
    const { closeDbInstance } = await import("@shiguang-gateway/core-domain/db/runtime-lifecycle");
    closeDbInstance();
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    await rm(dataDir, { recursive: true, force: true });
  }
});
